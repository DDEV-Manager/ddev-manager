import { invoke } from "@tauri-apps/api/core";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface DdevSchema {
  php_versions: string[];
  project_types: string[];
  database_types: string[];
  webserver_types: string[];
  nodejs_versions: string[];
}

export const schemaQueryKeys = {
  schema: ["ddev-schema"] as const,
};

/**
 * Fetch the DDEV schema (from cache or network)
 */
export function useDdevSchema() {
  return useQuery({
    queryKey: schemaQueryKeys.schema,
    queryFn: () => invoke<DdevSchema>("get_ddev_schema"),
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

/**
 * Force refresh the DDEV schema from GitHub
 */
export function useRefreshDdevSchema() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => invoke<DdevSchema>("refresh_ddev_schema"),
    onSuccess: (data) => {
      queryClient.setQueryData(schemaQueryKeys.schema, data);
    },
  });
}
