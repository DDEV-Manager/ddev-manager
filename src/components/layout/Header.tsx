import { useState } from "react";
import { Power, Settings, RefreshCw } from "lucide-react";
import { usePoweroff, useProjects } from "@/hooks/useDdev";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/useDdev";
import { cn } from "@/lib/utils";
import { SettingsModal } from "@/components/settings/SettingsModal";

export function Header() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
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
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
            <span className="text-sm font-bold text-white">D</span>
          </div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">DDEV Manager</h1>
        </div>
        {runningCount > 0 && (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
            {runningCount} running
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleRefresh}
          className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          title="Refresh projects"
        >
          <RefreshCw className="h-4 w-4" />
        </button>

        <button
          onClick={handlePoweroff}
          disabled={runningCount === 0 || poweroff.isPending}
          className={cn(
            "rounded-lg p-2 transition-colors",
            runningCount > 0
              ? "text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30"
              : "cursor-not-allowed text-gray-300 dark:text-gray-700"
          )}
          title="Power off all projects"
        >
          <Power className="h-4 w-4" />
        </button>

        <button
          onClick={() => setIsSettingsOpen(true)}
          className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          title="Settings"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </header>
  );
}
