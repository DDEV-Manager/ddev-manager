import { invoke } from "@tauri-apps/api/core";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Query keys for screenshots
export const screenshotQueryKeys = {
  path: (project: string) => ["screenshot", project] as const,
};

/**
 * Get the path to a project's screenshot if it exists
 */
export function useScreenshotPath(projectName: string | null) {
  return useQuery({
    queryKey: screenshotQueryKeys.path(projectName ?? ""),
    queryFn: async () => {
      if (!projectName) return null;
      const path = await invoke<string | null>("get_screenshot_path", {
        projectName,
      });
      return path;
    },
    enabled: !!projectName,
    staleTime: 30000, // Consider stale after 30 seconds
  });
}

/**
 * Get screenshot data as base64 data URL for display
 */
export function useScreenshotData(projectName: string | null) {
  return useQuery({
    queryKey: ["screenshot-data", projectName ?? ""],
    queryFn: async () => {
      if (!projectName) return null;
      const data = await invoke<string | null>("get_screenshot_data", {
        projectName,
      });
      return data;
    },
    enabled: !!projectName,
    staleTime: 30000,
  });
}

/**
 * Capture a screenshot of a project's website
 * This triggers a background capture that emits screenshot-status events
 */
export function useCaptureScreenshot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectName, url }: { projectName: string; url: string }) => {
      return invoke<void>("capture_screenshot", { projectName, url });
    },
    onSuccess: (_, { projectName }) => {
      // Invalidate the screenshot path query after capture starts
      // The actual update will happen when the screenshot-status event fires
      setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: screenshotQueryKeys.path(projectName),
        });
      }, 3000); // Give it time to capture
    },
  });
}

/**
 * Delete a project's screenshot
 */
export function useDeleteScreenshot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectName: string) => {
      return invoke<void>("delete_screenshot", { projectName });
    },
    onSuccess: (_, projectName) => {
      queryClient.invalidateQueries({
        queryKey: screenshotQueryKeys.path(projectName),
      });
    },
  });
}
