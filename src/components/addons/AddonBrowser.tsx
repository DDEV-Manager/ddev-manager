import { useState, useMemo } from "react";
import { Search, Star, Download, Check, Loader2, ExternalLink, ChevronDown } from "lucide-react";
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
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);

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
    <div className="rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Search and filters */}
      <div className="sticky top-0 z-10 flex items-center gap-2 rounded-t-lg border-b border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-800">
        {/* Type dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
            className="flex items-center gap-1 rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700"
          >
            <span className="min-w-[70px]">
              {filter.type === "all"
                ? "All"
                : filter.type === "official"
                  ? "Official"
                  : "Community"}
            </span>
            <ChevronDown className="h-3 w-3" />
          </button>
          {isTypeDropdownOpen && (
            <div className="absolute top-full left-0 z-10 mt-1 rounded border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-700">
              {(["all", "official", "contrib"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setFilter({ ...filter, type });
                    setIsTypeDropdownOpen(false);
                  }}
                  className={cn(
                    "block w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-600",
                    filter.type === type && "bg-blue-50 dark:bg-blue-900/30"
                  )}
                >
                  {type === "all" ? "All" : type === "official" ? "Official" : "Community"}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search input */}
        <div className="relative min-w-[120px] flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
            style={{ left: "8px" }}
          />
          <input
            type="text"
            placeholder="Search add-ons..."
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            className="w-full rounded border border-gray-300 bg-white py-1 text-sm dark:border-gray-600 dark:bg-gray-700"
            style={{ paddingLeft: "28px", paddingRight: "8px" }}
          />
        </div>
      </div>

      {/* Addons list */}
      <div className="space-y-2 p-2">
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="py-6 text-center text-sm text-red-500">
            Failed to load registry: {error instanceof Error ? error.message : String(error)}
          </div>
        ) : filteredAddons.length === 0 ? (
          <div className="py-6 text-center text-sm text-gray-500">No add-ons found</div>
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
        <div className="border-t border-gray-200 px-2 py-1.5 text-center text-xs text-gray-400 dark:border-gray-700">
          {registry.total_addons_count} add-ons available ({registry.official_addons_count}{" "}
          official)
        </div>
      )}
    </div>
  );
}
