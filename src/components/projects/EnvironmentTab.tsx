import { Database, Copy, Check, Folder, Loader2, Trash2, ExternalLink } from "lucide-react";
import { useState } from "react";
import { useOpenUrl, useOpenFolder } from "@/hooks/useDdev";
import { ProjectScreenshot } from "./ProjectScreenshot";
import { cn } from "@/lib/utils";
import type { DdevProjectDetails } from "@/types/ddev";

interface EnvironmentTabProps {
  project: DdevProjectDetails;
  isRunning: boolean;
  isOperationPending: boolean;
  currentOp: "start" | "stop" | "restart" | "delete" | null;
  onDelete: () => void;
}

export function EnvironmentTab({
  project,
  isRunning,
  isOperationPending,
  currentOp,
  onDelete,
}: EnvironmentTabProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const openFolder = useOpenFolder();

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="space-y-6 p-4">
      {/* URLs and Screenshot - side by side */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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

        {/* Screenshot */}
        <section>
          <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Preview</h3>
          <ProjectScreenshot
            projectName={project.name}
            primaryUrl={project.primary_url}
            isRunning={isRunning}
          />
        </section>
      </div>

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
                <span className="text-gray-900 dark:text-gray-100">{project.dbinfo.password}</span>
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

      {/* Location */}
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

      {/* Danger Zone */}
      <section className="border-t border-gray-200 pt-6 dark:border-gray-800">
        <h3 className="mb-2 text-sm font-medium text-red-600 dark:text-red-400">Danger Zone</h3>
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-900/20">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Remove this project
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Removes DDEV configuration and Docker resources. Project files are kept.
            </p>
          </div>
          <button
            onClick={onDelete}
            disabled={isOperationPending}
            className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {currentOp === "delete" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            {currentOp === "delete" ? "Removing..." : "Remove"}
          </button>
        </div>
      </section>
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
