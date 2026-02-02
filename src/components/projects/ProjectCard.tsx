import { forwardRef } from "react";
import { Play, Square, RotateCw, ExternalLink, Folder } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Tooltip } from "@/components/ui/Tooltip";
import { ProjectTypeIcon, getProjectTypeColor } from "./ProjectTypeIcon";
import { cn, getStatusBgColor, formatProjectType, truncatePath } from "@/lib/utils";
import {
  useStartProject,
  useStopProject,
  useRestartProject,
  useOpenUrl,
  useOpenFolder,
} from "@/hooks/useDdev";
import type { DdevProjectBasic } from "@/types/ddev";

interface ProjectCardProps {
  project: DdevProjectBasic;
  isSelected: boolean;
  onSelect: () => void;
}

export const ProjectCard = forwardRef<HTMLDivElement, ProjectCardProps>(function ProjectCard(
  { project, isSelected, onSelect },
  ref
) {
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

  const statusLabel = project.status.charAt(0).toUpperCase() + project.status.slice(1);

  return (
    <div
      ref={ref}
      id={`project-${project.name}`}
      role="option"
      aria-selected={isSelected}
      onClick={onSelect}
      className={cn(
        "group relative cursor-pointer rounded-lg border p-3 transition-all",
        isSelected
          ? "border-primary-500 bg-primary-50 ring-primary-500 dark:bg-primary-950/30 ring-2"
          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:hover:border-gray-700 dark:hover:bg-gray-900"
      )}
    >
      {/* Title row with status, name, and actions */}
      <div className="flex items-center gap-2">
        <Tooltip content={statusLabel} position="right">
          <div
            className={cn("h-2.5 w-2.5 shrink-0 rounded-full", getStatusBgColor(project.status))}
            aria-hidden="true"
          />
        </Tooltip>
        <span className="sr-only">Status: {statusLabel}</span>
        <h3 className="min-w-0 flex-1 truncate font-medium text-gray-900 dark:text-gray-100">
          {project.name}
        </h3>
        {/* Quick actions - tabIndex={-1} to keep them out of tab order (mouse-only, appear on hover) */}
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {isRunning ? (
            <>
              {project.primary_url && (
                <Tooltip content="Open in browser">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    tabIndex={-1}
                    onClick={handleOpenUrl}
                    className="rounded-md"
                    aria-label="Open in browser"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </Tooltip>
              )}
              <Tooltip content="Restart">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  tabIndex={-1}
                  onClick={handleRestart}
                  disabled={isPending}
                  className="rounded-md text-yellow-600 hover:bg-yellow-100 dark:text-yellow-400 dark:hover:bg-yellow-900/30"
                  aria-label="Restart"
                >
                  <RotateCw
                    className={cn("h-3.5 w-3.5", restartProject.isPending && "animate-spin")}
                  />
                </Button>
              </Tooltip>
              <Tooltip content="Stop">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  tabIndex={-1}
                  onClick={handleStop}
                  disabled={isPending}
                  className="rounded-md text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30"
                  aria-label="Stop"
                >
                  <Square className="h-3.5 w-3.5" />
                </Button>
              </Tooltip>
            </>
          ) : (
            <>
              <Tooltip content="Open folder">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  tabIndex={-1}
                  onClick={handleOpenFolder}
                  className="rounded-md"
                  aria-label="Open folder"
                >
                  <Folder className="h-3.5 w-3.5" />
                </Button>
              </Tooltip>
              <Tooltip content="Start">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  tabIndex={-1}
                  onClick={handleStart}
                  disabled={isPending}
                  className="rounded-md text-green-600 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-900/30"
                  aria-label="Start"
                >
                  <Play className={cn("h-3.5 w-3.5", startProject.isPending && "animate-pulse")} />
                </Button>
              </Tooltip>
            </>
          )}
        </div>
      </div>

      {/* Type and path - full width */}
      <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
        <ProjectTypeIcon
          type={project.type}
          size="sm"
          className={getProjectTypeColor(project.type)}
          aria-hidden="true"
        />
        <span>{formatProjectType(project.type)}</span>
      </div>
      <Tooltip content={project.shortroot} position="bottom">
        <div className="overflow-hidden text-xs whitespace-nowrap text-gray-400 dark:text-gray-500">
          {truncatePath(project.shortroot, 43)}
        </div>
      </Tooltip>
    </div>
  );
});
