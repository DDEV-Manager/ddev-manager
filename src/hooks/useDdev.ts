import { invoke } from "@tauri-apps/api/core";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { DdevProjectBasic, DdevProjectDetails } from "@/types/ddev";
import { useTerminalStore } from "@/stores/terminalStore";

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

// Create snapshot
export function useCreateSnapshot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ project, name }: { project: string; name?: string }) => {
      return invoke<string>("create_snapshot", { project, name });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.snapshots(variables.project),
      });
    },
  });
}

// Restore snapshot
export function useRestoreSnapshot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ project, snapshot }: { project: string; snapshot: string }) => {
      return invoke<string>("restore_snapshot", { project, snapshot });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.snapshots(variables.project),
      });
    },
  });
}
