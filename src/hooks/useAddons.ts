import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { InstalledAddon, AddonRegistry } from "@/types/ddev";
import { useTerminalStore } from "@/stores/terminalStore";

interface CommandStatus {
  command: string;
  project: string;
  status: "started" | "finished" | "error";
  message?: string;
}

// Query keys for addons
export const addonQueryKeys = {
  installed: (project: string) => ["addons", "installed", project] as const,
  registry: ["addons", "registry"] as const,
};

// Hook to listen for addon command completion and trigger refetch
export function useAddonCommandListener(refetch: () => Promise<unknown>) {
  useEffect(() => {
    let unlistenFn: (() => void) | null = null;

    listen<CommandStatus>("command-status", (event) => {
      const { command, status } = event.payload;

      // When addon-install or addon-remove finishes, refetch installed addons
      if (
        (command === "addon-install" || command === "addon-remove") &&
        (status === "finished" || status === "error")
      ) {
        // Small delay to ensure DDEV has finished writing
        setTimeout(() => {
          refetch();
        }, 500);
      }
    }).then((fn) => {
      unlistenFn = fn;
    });

    return () => {
      if (unlistenFn) {
        unlistenFn();
      }
    };
  }, [refetch]);
}

// Fetch installed addons for a project
export function useInstalledAddons(project: string | null) {
  return useQuery({
    queryKey: addonQueryKeys.installed(project ?? ""),
    queryFn: async () => {
      if (!project) return [];
      return invoke<InstalledAddon[]>("list_installed_addons", { project });
    },
    enabled: !!project,
    staleTime: 30000, // 30 seconds
  });
}

// Fetch addon registry
export function useAddonRegistry() {
  return useQuery({
    queryKey: addonQueryKeys.registry,
    queryFn: async () => {
      return invoke<AddonRegistry>("fetch_addon_registry");
    },
    staleTime: 300000, // 5 minutes - registry doesn't change often
  });
}

// Install addon mutation
export function useInstallAddon() {
  const { open, autoOpen } = useTerminalStore();

  return useMutation({
    mutationFn: async ({ project, addon }: { project: string; addon: string }) => {
      if (autoOpen) open();
      return invoke<void>("install_addon", { project, addon });
    },
    // Cache invalidation is handled by useAddonCommandListener when command finishes
  });
}

// Remove addon mutation
export function useRemoveAddon() {
  const { open, autoOpen } = useTerminalStore();

  return useMutation({
    mutationFn: async ({ project, addon }: { project: string; addon: string }) => {
      if (autoOpen) open();
      return invoke<void>("remove_addon", { project, addon });
    },
    // Cache invalidation is handled by useAddonCommandListener when command finishes
  });
}
