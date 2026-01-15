import { invoke } from "@tauri-apps/api/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "./useDdev";
import { useTerminalStore } from "@/stores/terminalStore";

export interface CreateProjectConfig {
  path: string;
  name: string;
  projectType: string;
  phpVersion?: string;
  database?: string;
  webserver?: string;
  docroot?: string;
  autoStart: boolean;
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
