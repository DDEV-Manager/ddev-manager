import { Power, Settings, RefreshCw } from "lucide-react";
import { usePoweroff, useProjects } from "@/hooks/useDdev";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/useDdev";
import { cn } from "@/lib/utils";

export function Header() {
  const queryClient = useQueryClient();
  const poweroff = usePoweroff();
  const { data: projects } = useProjects();

  const runningCount = projects?.filter((p) => p.status === "running").length ?? 0;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.projects });
  };

  const handlePoweroff = () => {
    if (runningCount > 0 && confirm(`Stop all ${runningCount} running projects?`)) {
      poweroff.mutate();
    }
  };

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">D</span>
          </div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            DDEV Manager
          </h1>
        </div>
        {runningCount > 0 && (
          <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 rounded-full">
            {runningCount} running
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleRefresh}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
          title="Refresh projects"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        <button
          onClick={handlePoweroff}
          disabled={runningCount === 0 || poweroff.isPending}
          className={cn(
            "p-2 rounded-lg transition-colors",
            runningCount > 0
              ? "hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
              : "text-gray-300 dark:text-gray-700 cursor-not-allowed"
          )}
          title="Power off all projects"
        >
          <Power className="w-4 h-4" />
        </button>

        <button
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
