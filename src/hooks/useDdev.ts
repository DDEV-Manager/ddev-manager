import { invoke } from "@tauri-apps/api/core";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { DdevProjectBasic, DdevProjectDetails } from "@/types/ddev";
import { useTerminalStore } from "@/stores/terminalStore";
import { useAppStore } from "@/stores/appStore";

// Query keys
export const queryKeys = {
  projects: ["projects"] as const,
  project: (name: string) => ["project", name] as const,
  ddevInstalled: ["ddev-installed"] as const,
  ddevVersion: ["ddev-version"] as const,
  snapshots: (project: string) => ["snapshots", project] as const,
};

// Fetch all projects
export function useProjects() {
  return useQuery({
    queryKey: queryKeys.projects,
    queryFn: async () => {
      const projects = await invoke<DdevProjectBasic[]>("list_projects");
      return projects;
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });
}

// Fetch a single project's details
export function useProject(name: string | null) {
  return useQuery({
    queryKey: queryKeys.project(name ?? ""),
    queryFn: async () => {
      if (!name) return null;
      const project = await invoke<DdevProjectDetails>("describe_project", {
        name,
      });
      return project;
    },
    enabled: !!name,
    refetchInterval: 5000,
  });
}

// Check if DDEV is installed
export function useDdevInstalled() {
  return useQuery({
    queryKey: queryKeys.ddevInstalled,
    queryFn: async () => {
      const installed = await invoke<boolean>("check_ddev_installed");
      return installed;
    },
    staleTime: Infinity, // Only check once
  });
}

// Get DDEV version
export function useDdevVersion() {
  return useQuery({
    queryKey: queryKeys.ddevVersion,
    queryFn: async () => {
      const version = await invoke<string>("get_ddev_version");
      return version;
    },
    staleTime: Infinity,
  });
}

// Start project mutation (non-blocking, command runs in background)
export function useStartProject() {
  const queryClient = useQueryClient();
  const { open, autoOpen } = useTerminalStore();

  return useMutation({
    mutationFn: async (name: string) => {
      if (autoOpen) open();
      return invoke<void>("start_project", { name });
    },
    onSuccess: () => {
      // Invalidate after a short delay to allow the command to start
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.projects });
      }, 1000);
    },
  });
}

// Stop project mutation (non-blocking, command runs in background)
export function useStopProject() {
  const queryClient = useQueryClient();
  const { open, autoOpen } = useTerminalStore();

  return useMutation({
    mutationFn: async (name: string) => {
      if (autoOpen) open();
      return invoke<void>("stop_project", { name });
    },
    onSuccess: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.projects });
      }, 1000);
    },
  });
}

// Restart project mutation (non-blocking, command runs in background)
export function useRestartProject() {
  const queryClient = useQueryClient();
  const { open, autoOpen } = useTerminalStore();

  return useMutation({
    mutationFn: async (name: string) => {
      if (autoOpen) open();
      return invoke<void>("restart_project", { name });
    },
    onSuccess: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.projects });
      }, 1000);
    },
  });
}

// Power off all projects (non-blocking, command runs in background)
export function usePoweroff() {
  const queryClient = useQueryClient();
  const { open, autoOpen } = useTerminalStore();

  return useMutation({
    mutationFn: async () => {
      if (autoOpen) open();
      return invoke<void>("poweroff");
    },
    onSuccess: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.projects });
      }, 1000);
    },
  });
}

// Delete project (removes DDEV config and Docker resources, keeps files)
export function useDeleteProject() {
  const queryClient = useQueryClient();
  const { open, autoOpen } = useTerminalStore();
  const { setSelectedProject } = useAppStore();

  return useMutation({
    mutationFn: async (name: string) => {
      if (autoOpen) open();
      return invoke<void>("delete_project", { name });
    },
    onSuccess: () => {
      // Clear selection and refresh projects list
      setSelectedProject(null);
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.projects });
      }, 1000);
    },
  });
}

// Open project URL
export function useOpenUrl() {
  return useMutation({
    mutationFn: async (url: string) => {
      return invoke<void>("open_project_url", { url });
    },
  });
}

// Open project folder
export function useOpenFolder() {
  return useMutation({
    mutationFn: async (path: string) => {
      return invoke<void>("open_project_folder", { path });
    },
  });
}

// Snapshot types for parsing DDEV output
interface DdevSnapshotRaw {
  Name: string;
  Created: string;
}

interface DdevSnapshotResponse {
  level: string;
  msg: string;
  raw: Record<string, DdevSnapshotRaw[] | null>;
  time: string;
}

export interface Snapshot {
  name: string;
  created: string;
}

// List snapshots for a project
export function useListSnapshots(project: string | null) {
  return useQuery({
    queryKey: queryKeys.snapshots(project ?? ""),
    queryFn: async (): Promise<Snapshot[]> => {
      if (!project) return [];
      const output = await invoke<string>("list_snapshots", { project });
      try {
        const parsed: DdevSnapshotResponse = JSON.parse(output);
        const snapshots = parsed.raw[project];
        if (!snapshots) return [];
        return snapshots.map((s) => ({
          name: s.Name,
          created: s.Created,
        }));
      } catch {
        return [];
      }
    },
    enabled: !!project,
  });
}

// Create snapshot (non-blocking, command runs in background)
export function useCreateSnapshot() {
  const { open, autoOpen } = useTerminalStore();

  return useMutation({
    mutationFn: async ({ project, name }: { project: string; name?: string }) => {
      if (autoOpen) open();
      return invoke<string>("create_snapshot", { project, name });
    },
  });
}

// Restore snapshot (non-blocking, command runs in background)
export function useRestoreSnapshot() {
  const { open, autoOpen } = useTerminalStore();

  return useMutation({
    mutationFn: async ({
      project,
      snapshot,
      approot,
    }: {
      project: string;
      snapshot: string;
      approot: string;
    }) => {
      if (autoOpen) open();
      return invoke<string>("restore_snapshot", { project, snapshot, approot });
    },
  });
}

// Delete a single snapshot (non-blocking, command runs in background)
export function useDeleteSnapshot() {
  const { open, autoOpen } = useTerminalStore();

  return useMutation({
    mutationFn: async ({ project, snapshot }: { project: string; snapshot: string }) => {
      if (autoOpen) open();
      return invoke<string>("delete_snapshot", { project, snapshot });
    },
  });
}

// Delete all snapshots for a project (non-blocking, command runs in background)
export function useCleanupSnapshots() {
  const { open, autoOpen } = useTerminalStore();

  return useMutation({
    mutationFn: async (project: string) => {
      if (autoOpen) open();
      return invoke<string>("cleanup_snapshots", { project });
    },
  });
}

// Select database file for import via native dialog
export function useSelectDatabaseFile() {
  return useMutation({
    mutationFn: () => invoke<string | null>("select_database_file"),
  });
}

// Select destination for database export via native dialog
export function useSelectExportDestination() {
  return useMutation({
    mutationFn: (defaultName: string) =>
      invoke<string | null>("select_export_destination", { defaultName }),
  });
}

// Import database (non-blocking, command runs in background)
export function useImportDb() {
  const { open, autoOpen } = useTerminalStore();

  return useMutation({
    mutationFn: async ({ project, filePath }: { project: string; filePath: string }) => {
      if (autoOpen) open();
      return invoke<string>("import_db", { project, filePath });
    },
  });
}

// Export database (non-blocking, command runs in background)
export function useExportDb() {
  const { open, autoOpen } = useTerminalStore();

  return useMutation({
    mutationFn: async ({ project, filePath }: { project: string; filePath: string }) => {
      if (autoOpen) open();
      return invoke<string>("export_db", { project, filePath });
    },
  });
}
