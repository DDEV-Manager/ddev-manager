import { Play, Square, RotateCw, ExternalLink, Folder } from "lucide-react";
import { cn, getStatusBgColor, formatProjectType, truncatePath } from "@/lib/utils";
import { useStartProject, useStopProject, useRestartProject, useOpenUrl, useOpenFolder } from "@/hooks/useDdev";
import type { DdevProjectBasic } from "@/types/ddev";

interface ProjectCardProps {
  project: DdevProjectBasic;
  isSelected: boolean;
  onSelect: () => void;
}

export function ProjectCard({ project, isSelected, onSelect }: ProjectCardProps) {
  const startProject = useStartProject();
  const stopProject = useStopProject();
  const restartProject = useRestartProject();
  const openUrl = useOpenUrl();
  const openFolder = useOpenFolder();

  const isRunning = project.status === "running";
  const isPending = startProject.isPending || stopProject.isPending || restartProject.isPending;

  const handleStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    startProject.mutate(project.name);
  };

  const handleStop = (e: React.MouseEvent) => {
    e.stopPropagation();
    stopProject.mutate(project.name);
  };

  const handleRestart = (e: React.MouseEvent) => {
    e.stopPropagation();
    restartProject.mutate(project.name);
  };

  const handleOpenUrl = (e: React.MouseEvent) => {
    e.stopPropagation();
    openUrl.mutate(project.primary_url);
  };

  const handleOpenFolder = (e: React.MouseEvent) => {
    e.stopPropagation();
    openFolder.mutate(project.approot);
  };

  return (
    <div
      onClick={onSelect}
      className={cn(
        "group relative p-3 rounded-lg border cursor-pointer transition-all",
        isSelected
          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
          : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Status indicator */}
          <div
            className={cn(
              "w-2.5 h-2.5 rounded-full flex-shrink-0",
              getStatusBgColor(project.status)
            )}
            title={project.status}
          />

          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
              {project.name}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatProjectType(project.type)}
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-600">•</span>
              <span className="text-xs text-gray-400 dark:text-gray-500 truncate" title={project.shortroot}>
                {truncatePath(project.shortroot, 30)}
              </span>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {isRunning ? (
            <>
              <button
                onClick={handleOpenUrl}
                className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
                title="Open in browser"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleRestart}
                disabled={isPending}
                className="p-1.5 rounded-md hover:bg-yellow-100 dark:hover:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 disabled:opacity-50"
                title="Restart"
              >
                <RotateCw className={cn("w-3.5 h-3.5", restartProject.isPending && "animate-spin")} />
              </button>
              <button
                onClick={handleStop}
                disabled={isPending}
                className="p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 disabled:opacity-50"
                title="Stop"
              >
                <Square className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleOpenFolder}
                className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
                title="Open folder"
              >
                <Folder className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleStart}
                disabled={isPending}
                className="p-1.5 rounded-md hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400 disabled:opacity-50"
                title="Start"
              >
                <Play className={cn("w-3.5 h-3.5", startProject.isPending && "animate-pulse")} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
