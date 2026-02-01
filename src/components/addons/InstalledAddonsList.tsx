import { Trash2, ExternalLink, Loader2 } from "lucide-react";
import type { InstalledAddon } from "@/types/ddev";
import { useOpenUrl } from "@/hooks/useDdev";

// Convert repository format "ddev/ddev-opensearch" to full GitHub URL
function getGitHubUrl(repository: string): string {
  return `https://github.com/${repository}`;
}

interface InstalledAddonsListProps {
  addons: InstalledAddon[];
  removingAddon: string | null;
  onRemove: (addon: string) => void;
}

export function InstalledAddonsList({ addons, removingAddon, onRemove }: InstalledAddonsListProps) {
  const openUrl = useOpenUrl();

  if (addons.length === 0) {
    return (
      <div className="rounded-lg bg-gray-50 p-4 text-center text-sm text-gray-500 dark:bg-gray-900">
        No add-ons installed. Browse the registry to add functionality.
      </div>
    );
  }

  return (
    <div role="list" aria-label="Installed add-ons" className="space-y-2">
      {addons.map((addon) => (
        <div
          key={addon.name}
          role="listitem"
          className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-900"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 dark:text-gray-100">{addon.name}</span>
              {addon.version && <span className="text-xs text-gray-500">v{addon.version}</span>}
            </div>
            <div className="truncate text-xs text-gray-500">{addon.repository}</div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => openUrl.mutate(getGitHubUrl(addon.repository))}
              className="rounded p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700"
              aria-label={`View ${addon.name} on GitHub`}
            >
              <ExternalLink className="h-4 w-4 text-gray-400" aria-hidden="true" />
            </button>
            <button
              onClick={() => onRemove(addon.name)}
              disabled={removingAddon !== null}
              className="rounded p-1.5 text-red-500 hover:bg-red-100 disabled:opacity-50 dark:hover:bg-red-900/30"
              aria-label={`Remove ${addon.name} add-on`}
            >
              {removingAddon === addon.name ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
