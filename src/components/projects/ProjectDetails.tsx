import { useMemo } from "react";
import {
  Play,
  Square,
  RotateCw,
  ExternalLink,
  Folder,
  Mail,
  Loader2,
  Server,
  Settings,
  Package,
  FileText,
  Database,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Tabs, type Tab } from "@/components/ui/Tabs";
import { listen } from "@tauri-apps/api/event";
import { AddonsSection } from "@/components/addons/AddonsSection";
import { LogsSection } from "@/components/logs/LogsSection";
import { SnapshotsSection } from "@/components/snapshots/SnapshotsSection";
import { EnvironmentTab } from "./EnvironmentTab";
import { PhpVersionSelector } from "./PhpVersionSelector";
import { NodejsVersionSelector } from "./NodejsVersionSelector";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useState, useEffect, useCallback } from "react";
import {
  useProject,
  useStartProject,
  useStopProject,
  useRestartProject,
  useDeleteProject,
  useOpenUrl,
  useOpenFolder,
  useSelectDatabaseFile,
  useSelectExportDestination,
  useImportDb,
  useExportDb,
} from "@/hooks/useDdev";
import { useCaptureScreenshot } from "@/hooks/useScreenshot";
import { useAppStore } from "@/stores/appStore";
import { cn, getStatusBgColor, formatProjectType } from "@/lib/utils";
import { toast } from "@/stores/toastStore";

interface CommandStatus {
  command: string;
  project: string;
  status: "started" | "finished" | "error" | "cancelled";
  message?: string;
  process_id?: string;
}

type ProjectOperation =
  | "start"
  | "stop"
  | "restart"
  | "delete"
  | "import-db"
  | "export-db"
  | "change-php"
  | "change-nodejs"
  | null;

interface OperationState {
  type: ProjectOperation;
  projectName: string | null;
}

type ProjectTab = "environment" | "addons" | "logs" | "snapshots";

export function ProjectDetails() {
  const { selectedProject } = useAppStore();
  const { data: project, isLoading, error } = useProject(selectedProject);
  const [operation, setOperation] = useState<OperationState>({ type: null, projectName: null });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<ProjectTab>("environment");

  const startProject = useStartProject();
  const stopProject = useStopProject();
  const restartProject = useRestartProject();
  const deleteProject = useDeleteProject();
  const openUrl = useOpenUrl();
  const openFolder = useOpenFolder();
  const captureScreenshot = useCaptureScreenshot();
  const selectDbFile = useSelectDatabaseFile();
  const selectExportDest = useSelectExportDestination();
  const importDb = useImportDb();
  const exportDb = useExportDb();

  const hasDatabase = !!project?.dbinfo;

  const projectTabs: Tab[] = useMemo(() => {
    const tabs: Tab[] = [
      { id: "environment", label: "Environment", icon: <Settings className="h-4 w-4" /> },
      { id: "addons", label: "Add-ons", icon: <Package className="h-4 w-4" /> },
      { id: "logs", label: "Logs", icon: <FileText className="h-4 w-4" /> },
    ];
    // Only show Snapshots tab if project has a database
    if (hasDatabase) {
      tabs.push({ id: "snapshots", label: "Snapshots", icon: <Database className="h-4 w-4" /> });
    }
    return tabs;
  }, [hasDatabase]);

  // Derive effective tab - fallback to environment if snapshots not available
  const effectiveTab = activeTab === "snapshots" && !hasDatabase ? "environment" : activeTab;

  // Listen for command completion to clear loading state and show toasts
  useEffect(() => {
    if (!operation.type || !operation.projectName) return;

    let mounted = true;
    let unlistenFn: (() => void) | null = null;

    listen<CommandStatus>("command-status", (event) => {
      if (!mounted) return;

      const { command, project: projectName, status } = event.payload;

      // Only handle events for the project being operated on
      if (projectName !== operation.projectName) return;

      // Handle start/stop/restart/delete commands
      if (
        command === "start" ||
        command === "stop" ||
        command === "restart" ||
        command === "delete"
      ) {
        if (status === "finished") {
          if (command === "delete") {
            toast.success("Project removed", `${projectName} has been removed from DDEV`);
          } else {
            const actionPast =
              command === "start" ? "started" : command === "stop" ? "stopped" : "restarted";
            toast.success(`Project ${actionPast}`, `${projectName} has been ${actionPast}`);

            // Auto-capture screenshot after project starts or restarts
            if ((command === "start" || command === "restart") && project?.primary_url) {
              // Small delay to ensure the project is fully ready
              setTimeout(() => {
                captureScreenshot.mutate({
                  projectName: projectName,
                  url: project.primary_url,
                });
              }, 2000);
            }
          }
          setOperation({ type: null, projectName: null });
        } else if (status === "error") {
          toast.error(`Failed to ${command}`, "Check the terminal for details");
          setOperation({ type: null, projectName: null });
        } else if (status === "cancelled") {
          toast.info("Command cancelled", "The operation was cancelled");
          setOperation({ type: null, projectName: null });
        }
      }

      // Handle database import/export commands
      if (command === "import-db" || command === "export-db") {
        if (status === "finished") {
          if (command === "import-db") {
            toast.success("Database imported", "Database has been imported successfully");
          } else {
            toast.success("Database exported", "Database has been exported successfully");
          }
          setOperation({ type: null, projectName: null });
        } else if (status === "error") {
          toast.error(
            `Failed to ${command === "import-db" ? "import" : "export"} database`,
            "Check the terminal for details"
          );
          setOperation({ type: null, projectName: null });
        } else if (status === "cancelled") {
          toast.info("Operation cancelled", "The database operation was cancelled");
          setOperation({ type: null, projectName: null });
        }
      }
    }).then((fn) => {
      if (mounted) {
        unlistenFn = fn;
      } else {
        fn();
      }
    });

    return () => {
      mounted = false;
      if (unlistenFn) {
        unlistenFn();
      }
    };
  }, [operation, project, captureScreenshot]);

  const handleStart = useCallback(() => {
    if (!project) return;
    setOperation({ type: "start", projectName: project.name });
    startProject.mutate(project.name);
  }, [project, startProject]);

  const handleStop = useCallback(() => {
    if (!project) return;
    setOperation({ type: "stop", projectName: project.name });
    stopProject.mutate(project.name);
  }, [project, stopProject]);

  const handleRestart = useCallback(() => {
    if (!project) return;
    setOperation({ type: "restart", projectName: project.name });
    restartProject.mutate(project.name);
  }, [project, restartProject]);

  const handleDelete = useCallback(() => {
    if (!project) return;
    setShowDeleteConfirm(true);
  }, [project]);

  const confirmDelete = useCallback(() => {
    if (!project) return;
    setShowDeleteConfirm(false);
    setOperation({ type: "delete", projectName: project.name });
    deleteProject.mutate(project.name);
  }, [project, deleteProject]);

  const handleImportDb = useCallback(async () => {
    if (!project) return;
    const filePath = await selectDbFile.mutateAsync();
    if (filePath) {
      setOperation({ type: "import-db", projectName: project.name });
      importDb.mutate({ project: project.name, filePath });
    }
  }, [project, selectDbFile, importDb]);

  const handleExportDb = useCallback(async () => {
    if (!project) return;
    const defaultName = `${project.name}-${new Date().toISOString().split("T")[0]}.sql.gz`;
    const filePath = await selectExportDest.mutateAsync(defaultName);
    if (filePath) {
      setOperation({ type: "export-db", projectName: project.name });
      exportDb.mutate({ project: project.name, filePath });
    }
  }, [project, selectExportDest, exportDb]);

  if (!selectedProject) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-gray-400 dark:text-gray-600">
        <Server className="mb-3 h-12 w-12 opacity-50" />
        <p className="text-sm">Select a project to view details</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-gray-500">
        <span>Project not found</span>
        {error && (
          <span className="max-w-md text-center text-xs text-red-500">
            {error instanceof Error ? error.message : String(error)}
          </span>
        )}
      </div>
    );
  }

  const isRunning = project.status === "running";
  // Only consider operation pending if it's for the current project
  const isCurrentProjectOp = operation.projectName === project.name;
  const isOperationPending = operation.type !== null && isCurrentProjectOp;
  const currentOp = isCurrentProjectOp ? operation.type : null;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-200 p-4 dark:border-gray-800">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className={cn("h-3 w-3 rounded-full", getStatusBgColor(project.status))} />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {project.name}
              </h2>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {formatProjectType(project.type)} •{" "}
              <PhpVersionSelector
                currentVersion={project.php_version}
                projectName={project.name}
                approot={project.approot}
                isRunning={isRunning}
                disabled={isOperationPending}
              />{" "}
              •{" "}
              <NodejsVersionSelector
                currentVersion={project.nodejs_version}
                projectName={project.name}
                approot={project.approot}
                isRunning={isRunning}
                disabled={isOperationPending}
              />
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {isRunning ? (
              <>
                <Button
                  variant="warning"
                  onClick={handleRestart}
                  disabled={isOperationPending}
                  loading={currentOp === "restart"}
                  icon={<RotateCw className="h-4 w-4" />}
                >
                  {currentOp === "restart" ? "Restarting..." : "Restart"}
                </Button>
                <Button
                  variant="danger"
                  onClick={handleStop}
                  disabled={isOperationPending}
                  loading={currentOp === "stop"}
                  icon={<Square className="h-4 w-4" />}
                >
                  {currentOp === "stop" ? "Stopping..." : "Stop"}
                </Button>
              </>
            ) : (
              <Button
                variant="success"
                onClick={handleStart}
                disabled={isOperationPending}
                loading={currentOp === "start"}
                icon={<Play className="h-4 w-4" />}
              >
                {currentOp === "start" ? "Starting..." : "Start"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions Bar */}
      {isRunning && (
        <div className="flex flex-wrap gap-2 border-b border-gray-200 bg-gray-50 px-4 py-6 dark:border-gray-800 dark:bg-gray-900/50">
          {project.primary_url && (
            <Button
              variant="secondary"
              onClick={() => openUrl.mutate(project.primary_url)}
              icon={<ExternalLink className="h-4 w-4" />}
              className="shadow-sm"
            >
              Open Site
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={() => openFolder.mutate(project.approot)}
            icon={<Folder className="h-4 w-4" />}
            className="shadow-sm"
          >
            Open Folder
          </Button>
          {project.mailpit_https_url && (
            <Button
              variant="secondary"
              onClick={() => openUrl.mutate(project.mailpit_https_url)}
              icon={<Mail className="h-4 w-4" />}
              className="shadow-sm"
            >
              Mailpit
            </Button>
          )}
        </div>
      )}

      {/* Tab Bar */}
      <Tabs
        tabs={projectTabs}
        activeTab={effectiveTab}
        onChange={(id) => setActiveTab(id as ProjectTab)}
        className="px-4 dark:border-gray-800"
      />

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {effectiveTab === "environment" && (
          <EnvironmentTab
            project={project}
            isRunning={isRunning}
            isOperationPending={isOperationPending}
            currentOp={currentOp}
            onDelete={handleDelete}
            onImportDb={handleImportDb}
            onExportDb={handleExportDb}
          />
        )}
        {effectiveTab === "addons" && (
          <div className="p-4 pb-16">
            <AddonsSection projectName={project.name} />
          </div>
        )}
        {effectiveTab === "logs" && (
          <div className="p-4 pb-16">
            <LogsSection
              projectName={project.name}
              services={Object.keys(project.services || {})}
              isProjectRunning={isRunning}
            />
          </div>
        )}
        {effectiveTab === "snapshots" && (
          <div className="p-4 pb-16">
            <SnapshotsSection projectName={project.name} approot={project.approot} />
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Remove Project"
        message={`Are you sure you want to remove "${project.name}" from DDEV? This will remove all DDEV configuration and Docker resources but keep your project files.`}
        confirmLabel="Remove"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
