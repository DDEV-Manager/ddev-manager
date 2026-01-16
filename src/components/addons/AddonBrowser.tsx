import { useState, useMemo } from "react";
import { Search, Star, Download, Check, Loader2, ExternalLink } from "lucide-react";
import type { InstalledAddon, AddonFilter } from "@/types/ddev";
import { useAddonRegistry } from "@/hooks/useAddons";
import { useOpenUrl } from "@/hooks/useDdev";
import { cn } from "@/lib/utils";

interface AddonBrowserProps {
  installedAddons: InstalledAddon[];
  installingAddon: string | null;
  onInstall: (addon: string) => void;
}

export function AddonBrowser({ installedAddons, installingAddon, onInstall }: AddonBrowserProps) {
  const { data: registry, isLoading, error } = useAddonRegistry();
  const openUrl = useOpenUrl();

  const [filter, setFilter] = useState<AddonFilter>({
    search: "",
    type: "all",
  });

  // Create a set of installed addon repositories for quick lookup
  // Installed addons have repository like "ddev/ddev-opensearch"
  const installedRepos = useMemo(
    () => new Set(installedAddons.map((a) => a.repository.toLowerCase())),
    [installedAddons]
  );

  const filteredAddons = useMemo(() => {
    if (!registry?.addons) return [];

    return registry.addons.filter((addon) => {
      // Search filter
      if (filter.search) {
        const search = filter.search.toLowerCase();
        const matchesSearch =
          addon.title.toLowerCase().includes(search) ||
          addon.description.toLowerCase().includes(search) ||
          addon.repo.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }

      // Type filter
      if (filter.type !== "all" && addon.type !== filter.type) {
        return false;
      }

      return true;
    });
  }, [registry, filter]);

  return (
    <div className="space-y-3">
      {/* Search and filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search add-ons..."
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pr-3 pl-9 text-sm dark:border-gray-700 dark:bg-gray-800"
          />
        </div>
        <select
          value={filter.type}
          onChange={(e) => setFilter({ ...filter, type: e.target.value as AddonFilter["type"] })}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <option value="all">All</option>
          <option value="official">Official</option>
          <option value="contrib">Community</option>
        </select>
      </div>

      {/* Addons list */}
      <div className="max-h-64 space-y-2 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="py-8 text-center text-red-500">
            Failed to load registry: {error instanceof Error ? error.message : String(error)}
          </div>
        ) : filteredAddons.length === 0 ? (
          <div className="py-8 text-center text-gray-500">No add-ons found</div>
        ) : (
          filteredAddons.map((addon) => {
            const repoPath = `${addon.user}/${addon.repo}`.toLowerCase();
            const addonFullName = `${addon.user}/${addon.repo}`;
            const isInstalled = installedRepos.has(repoPath);
            const isInstalling = installingAddon === addonFullName;
            return (
              <div
                key={addon.repo_id}
                className="flex items-start gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-900"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium text-gray-900 dark:text-gray-100">
                      {addon.repo}
                    </span>
                    {addon.type === "official" && (
                      <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        Official
                      </span>
                    )}
                    {isInstalled && (
                      <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        Installed
                      </span>
                    )}
                  </div>
                  <p className="line-clamp-2 text-xs text-gray-500">{addon.description}</p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      {addon.stars}
                    </span>
                    {addon.tag_name && <span>{addon.tag_name}</span>}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => openUrl.mutate(addon.github_url)}
                    className="rounded p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700"
                    title="View on GitHub"
                  >
                    <ExternalLink className="h-4 w-4 text-gray-400" />
                  </button>
                  <button
                    onClick={() => onInstall(addonFullName)}
                    disabled={isInstalled || installingAddon !== null}
                    className={cn(
                      "flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm transition-colors",
                      isInstalled
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
                    )}
                  >
                    {isInstalled ? (
                      <>
                        <Check className="h-4 w-4" />
                        Installed
                      </>
                    ) : isInstalling ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Installing...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        Install
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Registry stats */}
      {registry && (
        <div className="text-center text-xs text-gray-400">
          {registry.total_addons_count} add-ons available ({registry.official_addons_count}{" "}
          official)
        </div>
      )}
    </div>
  );
}
