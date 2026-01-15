import {
  Play,
  Square,
  RotateCw,
  ExternalLink,
  Folder,
  Mail,
  Database,
  Copy,
  Check,
  Loader2,
  Server,
} from "lucide-react";
import { useState } from "react";
import { useProject, useStartProject, useStopProject, useRestartProject, useOpenUrl, useOpenFolder } from "@/hooks/useDdev";
import { useAppStore } from "@/stores/appStore";
import { cn, getStatusBgColor, formatProjectType } from "@/lib/utils";

export function ProjectDetails() {
  const { selectedProject } = useAppStore();
  const { data: project, isLoading } = useProject(selectedProject);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const startProject = useStartProject();
  const stopProject = useStopProject();
  const restartProject = useRestartProject();
  const openUrl = useOpenUrl();
  const openFolder = useOpenFolder();

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (!selectedProject) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-600">
        <Server className="w-12 h-12 mb-3 opacity-50" />
        <p className="text-sm">Select a project to view details</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Project not found
      </div>
    );
  }

  const isRunning = project.status === "running";
  const isPending = startProject.isPending || stopProject.isPending || restartProject.isPending;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "w-3 h-3 rounded-full",
                  getStatusBgColor(project.status)
                )}
              />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {project.name}
              </h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {formatProjectType(project.type)} • PHP {project.php_version ?? "N/A"} • Node.js {project.nodejs_version}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {isRunning ? (
              <>
                <button
                  onClick={() => restartProject.mutate(project.name)}
                  disabled={isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:hover:bg-yellow-900/50 disabled:opacity-50 transition-colors"
                >
                  <RotateCw className={cn("w-4 h-4", restartProject.isPending && "animate-spin")} />
                  Restart
                </button>
                <button
                  onClick={() => stopProject.mutate(project.name)}
                  disabled={isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 disabled:opacity-50 transition-colors"
                >
                  <Square className="w-4 h-4" />
                  Stop
                </button>
              </>
            ) : (
              <button
                onClick={() => startProject.mutate(project.name)}
                disabled={isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 disabled:opacity-50 transition-colors"
              >
                <Play className={cn("w-4 h-4", startProject.isPending && "animate-pulse")} />
                Start
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Quick actions */}
        {isRunning && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => openUrl.mutate(project.primary_url)}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Open Site
            </button>
            <button
              onClick={() => openFolder.mutate(project.approot)}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <Folder className="w-4 h-4" />
              Open Folder
            </button>
            <button
              onClick={() => openUrl.mutate(project.mailpit_https_url)}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <Mail className="w-4 h-4" />
              Mailpit
            </button>
          </div>
        )}

        {/* URLs */}
        <section>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">URLs</h3>
          <div className="space-y-2">
            <UrlRow
              label="Primary"
              url={project.primary_url}
              onCopy={() => copyToClipboard(project.primary_url, "primary")}
              copied={copiedField === "primary"}
              isActive={isRunning}
            />
            {project.urls?.slice(1).map((url, i) => (
              <UrlRow
                key={url}
                label={`URL ${i + 2}`}
                url={url}
                onCopy={() => copyToClipboard(url, `url-${i}`)}
                copied={copiedField === `url-${i}`}
                isActive={isRunning}
              />
            ))}
          </div>
        </section>

        {/* Database info */}
        {project.dbinfo && (
          <section>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Database className="w-4 h-4 inline mr-1" />
              Database
            </h3>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 space-y-2 text-sm font-mono">
              <div className="flex justify-between">
                <span className="text-gray-500">Type:</span>
                <span className="text-gray-900 dark:text-gray-100">
                  {project.dbinfo.database_type} {project.dbinfo.database_version}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Host:</span>
                <span className="text-gray-900 dark:text-gray-100">{project.dbinfo.host}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Database:</span>
                <span className="text-gray-900 dark:text-gray-100">{project.dbinfo.dbname}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">User:</span>
                <span className="text-gray-900 dark:text-gray-100">{project.dbinfo.username}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Password:</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-900 dark:text-gray-100">{project.dbinfo.password}</span>
                  <button
                    onClick={() => copyToClipboard(project.dbinfo!.password, "password")}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                    title="Copy password"
                  >
                    {copiedField === "password" ? (
                      <Check className="w-3 h-3 text-green-500" />
                    ) : (
                      <Copy className="w-3 h-3 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
              {isRunning && project.dbinfo.published_port > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Port (host):</span>
                  <span className="text-gray-900 dark:text-gray-100">{project.dbinfo.published_port}</span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Services */}
        {project.services && Object.keys(project.services).length > 0 && (
          <section>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Services</h3>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(project.services).map(([name, service]) => (
                <div
                  key={name}
                  className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-900 rounded-lg"
                >
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full",
                      service.status === "running" ? "bg-green-500" : "bg-gray-400"
                    )}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{name}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Path */}
        <section>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Location</h3>
          <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <code className="text-sm text-gray-700 dark:text-gray-300 flex-1 truncate">
              {project.approot}
            </code>
            <button
              onClick={() => openFolder.mutate(project.approot)}
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              title="Open folder"
            >
              <Folder className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function UrlRow({
  label,
  url,
  onCopy,
  copied,
  isActive,
}: {
  label: string;
  url: string;
  onCopy: () => void;
  copied: boolean;
  isActive: boolean;
}) {
  const openUrl = useOpenUrl();

  return (
    <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
      <span className="text-xs text-gray-500 w-16">{label}</span>
      <code className="text-sm text-blue-600 dark:text-blue-400 flex-1 truncate">{url}</code>
      <button
        onClick={onCopy}
        className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
        title="Copy URL"
      >
        {copied ? (
          <Check className="w-4 h-4 text-green-500" />
        ) : (
          <Copy className="w-4 h-4 text-gray-400" />
        )}
      </button>
      {isActive && (
        <button
          onClick={() => openUrl.mutate(url)}
          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
          title="Open URL"
        >
          <ExternalLink className="w-4 h-4 text-gray-400" />
        </button>
      )}
    </div>
  );
}
