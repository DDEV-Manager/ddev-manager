import { useState } from "react";
import { Power, Settings, RefreshCw, Plus } from "lucide-react";
import { usePoweroff, useProjects } from "@/hooks/useDdev";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/useDdev";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { CreateProjectWizard } from "@/components/projects/CreateProjectWizard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export function Header() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
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
    <header className="flex items-center justify-between border-b border-gray-200/50 bg-white/80 px-4 py-3 backdrop-blur-md dark:border-gray-800/50 dark:bg-gray-900/80">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="DDEV Manager" className="h-8 w-8" />
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">DDEV Manager</h1>
        </div>
        {runningCount > 0 && (
          <Badge variant="green" className="rounded-full">
            {runningCount} running
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          onClick={() => setIsCreateProjectOpen(true)}
          icon={<Plus className="h-4 w-4" />}
          title="Create new project"
        >
          New Project
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          icon={<RefreshCw className="h-4 w-4" />}
          title="Refresh projects"
        />

        <Button
          variant={runningCount > 0 ? "danger" : "ghost"}
          size="icon"
          onClick={handlePoweroff}
          disabled={runningCount === 0 || poweroff.isPending}
          icon={<Power className="h-4 w-4" />}
          title="Power off all projects"
        />

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsSettingsOpen(true)}
          icon={<Settings className="h-4 w-4" />}
          title="Settings"
        />
      </div>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <CreateProjectWizard
        isOpen={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
      />
    </header>
  );
}
