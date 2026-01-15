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
import { AddonsSection } from "@/components/addons/AddonsSection";
import { useState } from "react";
import {
  useProject,
  useStartProject,
  useStopProject,
  useRestartProject,
  useOpenUrl,
  useOpenFolder,
} from "@/hooks/useDdev";
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
      <div className="flex h-full items-center justify-center text-gray-500">Project not found</div>
    );
  }

  const isRunning = project.status === "running";
  const isPending = startProject.isPending || stopProject.isPending || restartProject.isPending;

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
              {formatProjectType(project.type)} • PHP {project.php_version ?? "N/A"} • Node.js{" "}
              {project.nodejs_version}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {isRunning ? (
              <>
                <button
                  onClick={() => restartProject.mutate(project.name)}
                  disabled={isPending}
                  className="flex items-center gap-1.5 rounded-lg bg-yellow-100 px-3 py-1.5 text-sm text-yellow-700 transition-colors hover:bg-yellow-200 disabled:opacity-50 dark:bg-yellow-900/30 dark:text-yellow-400 dark:hover:bg-yellow-900/50"
                >
                  <RotateCw className={cn("h-4 w-4", restartProject.isPending && "animate-spin")} />
                  Restart
                </button>
                <button
                  onClick={() => stopProject.mutate(project.name)}
                  disabled={isPending}
                  className="flex items-center gap-1.5 rounded-lg bg-red-100 px-3 py-1.5 text-sm text-red-700 transition-colors hover:bg-red-200 disabled:opacity-50 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                >
                  <Square className="h-4 w-4" />
                  Stop
                </button>
              </>
            ) : (
              <button
                onClick={() => startProject.mutate(project.name)}
                disabled={isPending}
                className="flex items-center gap-1.5 rounded-lg bg-green-100 px-3 py-1.5 text-sm text-green-700 transition-colors hover:bg-green-200 disabled:opacity-50 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
              >
                <Play className={cn("h-4 w-4", startProject.isPending && "animate-pulse")} />
                Start
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-6 overflow-y-auto p-4">
        {/* Quick actions */}
        {isRunning && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => openUrl.mutate(project.primary_url)}
              className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
            >
              <ExternalLink className="h-4 w-4" />
              Open Site
            </button>
            <button
              onClick={() => openFolder.mutate(project.approot)}
              className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
            >
              <Folder className="h-4 w-4" />
              Open Folder
            </button>
            <button
              onClick={() => openUrl.mutate(project.mailpit_https_url)}
              className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
            >
              <Mail className="h-4 w-4" />
              Mailpit
            </button>
          </div>
        )}

        {/* URLs */}
        <section>
          <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">URLs</h3>
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
            <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Database className="mr-1 inline h-4 w-4" />
              Database
            </h3>
            <div className="space-y-2 rounded-lg bg-gray-50 p-3 font-mono text-sm dark:bg-gray-900">
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
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Password:</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-900 dark:text-gray-100">
                    {project.dbinfo.password}
                  </span>
                  <button
                    onClick={() => copyToClipboard(project.dbinfo!.password, "password")}
                    className="rounded p-1 hover:bg-gray-200 dark:hover:bg-gray-700"
                    title="Copy password"
                  >
                    {copiedField === "password" ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
              {isRunning && project.dbinfo.published_port > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Port (host):</span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {project.dbinfo.published_port}
                  </span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Services */}
        {project.services && Object.keys(project.services).length > 0 && (
          <section>
            <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Services</h3>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(project.services).map(([name, service]) => (
                <div
                  key={name}
                  className="flex items-center gap-2 rounded-lg bg-gray-50 p-2 dark:bg-gray-900"
                >
                  <div
                    className={cn(
                      "h-2 w-2 rounded-full",
                      service.status === "running" ? "bg-green-500" : "bg-gray-400"
                    )}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{name}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Add-ons */}
        <AddonsSection projectName={project.name} isProjectRunning={isRunning} />

        {/* Path */}
        <section>
          <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Location</h3>
          <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-2 dark:bg-gray-900">
            <code className="flex-1 truncate text-sm text-gray-700 dark:text-gray-300">
              {project.approot}
            </code>
            <button
              onClick={() => openFolder.mutate(project.approot)}
              className="rounded p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700"
              title="Open folder"
            >
              <Folder className="h-4 w-4 text-gray-500" />
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
    <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-2 dark:bg-gray-900">
      <span className="w-16 text-xs text-gray-500">{label}</span>
      <code className="flex-1 truncate text-sm text-blue-600 dark:text-blue-400">{url}</code>
      <button
        onClick={onCopy}
        className="rounded p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700"
        title="Copy URL"
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Copy className="h-4 w-4 text-gray-400" />
        )}
      </button>
      {isActive && (
        <button
          onClick={() => openUrl.mutate(url)}
          className="rounded p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700"
          title="Open URL"
        >
          <ExternalLink className="h-4 w-4 text-gray-400" />
        </button>
      )}
    </div>
  );
}
