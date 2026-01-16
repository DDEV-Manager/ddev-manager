import { invoke } from "@tauri-apps/api/core";
import { useMutation } from "@tanstack/react-query";

export interface GetLogsParams {
  project: string;
  service: string;
  follow: boolean;
  tail?: number;
  timestamps: boolean;
}

/**
 * Hook to fetch logs from a DDEV project container
 * Returns a process_id that can be used to cancel the streaming
 */
export function useGetLogs() {
  return useMutation({
    mutationFn: async (params: GetLogsParams) => {
      return invoke<string>("get_logs", {
        project: params.project,
        service: params.service,
        follow: params.follow,
        tail: params.tail ?? 100,
        timestamps: params.timestamps,
      });
    },
  });
}

/**
 * Hook to stop streaming logs
 * Reuses the existing cancel_command functionality
 */
export function useStopLogs() {
  return useMutation({
    mutationFn: async (processId: string) => {
      return invoke<void>("cancel_command", { processId });
    },
  });
}
