import { Play, Square, RotateCw, ExternalLink, Folder } from "lucide-react";
import { Button } from "@/components/ui/Button";
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
        "group relative cursor-pointer rounded-lg border p-3 transition-all",
        isSelected
          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:hover:border-gray-700 dark:hover:bg-gray-900"
      )}
    >
      {/* Title row with status, name, and actions */}
      <div className="flex items-center gap-2">
        <div
          className={cn("h-2.5 w-2.5 shrink-0 rounded-full", getStatusBgColor(project.status))}
          title={project.status}
        />
        <h3 className="min-w-0 flex-1 truncate font-medium text-gray-900 dark:text-gray-100">
          {project.name}
        </h3>
        {/* Quick actions */}
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {isRunning ? (
            <>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleOpenUrl}
                icon={<ExternalLink className="h-3.5 w-3.5" />}
                title="Open in browser"
                className="rounded-md"
              />
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleRestart}
                disabled={isPending}
                icon={
                  <RotateCw
                    className={cn("h-3.5 w-3.5", restartProject.isPending && "animate-spin")}
                  />
                }
                title="Restart"
                className="rounded-md text-yellow-600 hover:bg-yellow-100 dark:text-yellow-400 dark:hover:bg-yellow-900/30"
              />
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleStop}
                disabled={isPending}
                icon={<Square className="h-3.5 w-3.5" />}
                title="Stop"
                className="rounded-md text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30"
              />
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleOpenFolder}
                icon={<Folder className="h-3.5 w-3.5" />}
                title="Open folder"
                className="rounded-md"
              />
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleStart}
                disabled={isPending}
                icon={
                  <Play className={cn("h-3.5 w-3.5", startProject.isPending && "animate-pulse")} />
                }
                title="Start"
                className="rounded-md text-green-600 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-900/30"
              />
            </>
          )}
        </div>
      </div>

      {/* Type and path - full width */}
      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {formatProjectType(project.type)}
      </div>
      <div
        className="overflow-hidden text-xs whitespace-nowrap text-gray-400 dark:text-gray-500"
        title={project.shortroot}
      >
        {truncatePath(project.shortroot, 43)}
      </div>
    </div>
  );
}
