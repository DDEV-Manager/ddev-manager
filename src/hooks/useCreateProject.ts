import { invoke } from "@tauri-apps/api/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "./useDdev";
import { useTerminalStore } from "@/stores/terminalStore";

export interface CmsInstallConfig {
  type: "composer" | "wordpress";
  package?: string;
}

export interface CreateProjectConfig {
  path: string;
  name: string;
  projectType: string;
  phpVersion?: string;
  database?: string;
  webserver?: string;
  docroot?: string;
  autoStart: boolean;
  cmsInstall?: CmsInstallConfig;
}

/**
 * Hook to open native folder picker dialog
 */
export function useSelectFolder() {
  return useMutation({
    mutationFn: async () => {
      return invoke<string | null>("select_folder");
    },
  });
}

/**
 * Hook to check if a folder is empty (or only contains .ddev)
 */
export function useCheckFolderEmpty() {
  return useMutation({
    mutationFn: async (path: string) => {
      return invoke<boolean>("check_folder_empty", { path });
    },
  });
}

/**
 * Hook to check if composer is installed
 */
export function useCheckComposerInstalled() {
  return useQuery({
    queryKey: ["composer-installed"],
    queryFn: async () => {
      return invoke<boolean>("check_composer_installed");
    },
    staleTime: Infinity,
  });
}

/**
 * Hook to check if WP-CLI is installed
 */
export function useCheckWpCliInstalled() {
  return useQuery({
    queryKey: ["wpcli-installed"],
    queryFn: async () => {
      return invoke<boolean>("check_wpcli_installed");
    },
    staleTime: Infinity,
  });
}

/**
 * Hook to create a new DDEV project
 */
export function useCreateProject() {
  const queryClient = useQueryClient();
  const { open, autoOpen } = useTerminalStore();

  return useMutation({
    mutationFn: async (config: CreateProjectConfig) => {
      if (autoOpen) open();
      return invoke<void>("create_project", {
        path: config.path,
        name: config.name,
        projectType: config.projectType,
        phpVersion: config.phpVersion || null,
        database: config.database || null,
        webserver: config.webserver || null,
        docroot: config.docroot || null,
        autoStart: config.autoStart,
        cmsInstall: config.cmsInstall ? JSON.stringify(config.cmsInstall) : null,
      });
    },
    onSuccess: () => {
      // Refresh projects list after creation
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.projects });
      }, 1000);
    },
  });
}
