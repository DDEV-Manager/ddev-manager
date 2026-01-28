import {
  Database,
  Copy,
  Check,
  Folder,
  Trash2,
  Upload,
  Download,
  ExternalLink,
} from "lucide-react";
import { useState } from "react";
import { useOpenUrl, useOpenFolder } from "@/hooks/useDdev";
import { ProjectScreenshot } from "./ProjectScreenshot";
import { Button } from "@/components/ui/Button";
import { Accordion } from "@/components/ui/Accordion";
import { cn } from "@/lib/utils";
import type { DdevProjectDetails } from "@/types/ddev";

interface EnvironmentTabProps {
  project: DdevProjectDetails;
  isRunning: boolean;
  isOperationPending: boolean;
  currentOp:
    | "start"
    | "stop"
    | "restart"
    | "delete"
    | "import-db"
    | "export-db"
    | "change-php"
    | "change-nodejs"
    | null;
  onDelete: () => void;
  onImportDb: () => void;
  onExportDb: () => void;
}

export function EnvironmentTab({
  project,
  isRunning,
  isOperationPending,
  currentOp,
  onDelete,
  onImportDb,
  onExportDb,
}: EnvironmentTabProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const openFolder = useOpenFolder();

  // Get additional URLs (excluding primary)
  const additionalUrls = project.urls?.slice(1) || [];
  const hasMoreThanTwo = additionalUrls.length > 1;

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="space-y-6 p-4 pb-16">
      {/* URLs + Database and Preview - side by side */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left column: URLs + Database */}
        <div className="space-y-4">
          {/* URLs - only show if project has a primary URL */}
          {project.primary_url && (
            <section>
              <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">URLs</h3>
              <div className="space-y-2">
                {/* Primary URL - always visible */}
                <UrlRow
                  label="Primary"
                  url={project.primary_url}
                  onCopy={() => copyToClipboard(project.primary_url, "primary")}
                  copied={copiedField === "primary"}
                  isActive={isRunning}
                />

                {/* Show first additional URL if exists and total ≤ 2 */}
                {!hasMoreThanTwo &&
                  additionalUrls.map((url, i) => (
                    <UrlRow
                      key={url}
                      label={`URL ${i + 2}`}
                      url={url}
                      onCopy={() => copyToClipboard(url, `url-${i}`)}
                      copied={copiedField === `url-${i}`}
                      isActive={isRunning}
                    />
                  ))}

                {/* Accordion for more than 2 URLs */}
                {hasMoreThanTwo && (
                  <Accordion title={`${additionalUrls.length} more URLs`}>
                    <div className="space-y-2">
                      {additionalUrls.map((url, i) => (
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
                  </Accordion>
                )}
              </div>
            </section>
          )}

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
                  <span className="text-gray-900 dark:text-gray-100">
                    {project.dbinfo.username}
                  </span>
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
              {isRunning && (
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={onImportDb}
                    disabled={isOperationPending}
                    loading={currentOp === "import-db"}
                    icon={<Upload className="h-4 w-4" />}
                  >
                    Import
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={onExportDb}
                    disabled={isOperationPending}
                    loading={currentOp === "export-db"}
                    icon={<Download className="h-4 w-4" />}
                  >
                    Export
                  </Button>
                </div>
              )}
            </section>
          )}
        </div>

        {/* Right column: Preview - only for projects with URLs */}
        {project.primary_url && (
          <section>
            <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Preview</h3>
            <ProjectScreenshot
              projectName={project.name}
              primaryUrl={project.primary_url}
              isRunning={isRunning}
            />
          </section>
        )}
      </div>

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
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => openFolder.mutate(project.approot)}
            icon={<Folder className="h-4 w-4 text-gray-500" />}
            title="Open folder"
          />
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
          <Button
            variant="danger-solid"
            onClick={onDelete}
            disabled={isOperationPending}
            loading={currentOp === "delete"}
            icon={<Trash2 className="h-4 w-4" />}
          >
            {currentOp === "delete" ? "Removing..." : "Remove"}
          </Button>
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
      {isActive ? (
        <button
          onClick={() => openUrl.mutate(url)}
          className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 flex-1 cursor-pointer truncate text-left font-mono text-sm underline decoration-dotted underline-offset-2"
          title="Open in browser"
        >
          {url}
        </button>
      ) : (
        <code className="flex-1 truncate text-sm text-gray-400 dark:text-gray-500">{url}</code>
      )}
      {isActive && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => openUrl.mutate(url)}
          icon={<ExternalLink className="h-4 w-4 text-gray-400" />}
          title="Open URL"
        />
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onCopy}
        icon={
          copied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4 text-gray-400" />
          )
        }
        title="Copy URL"
      />
    </div>
  );
}
