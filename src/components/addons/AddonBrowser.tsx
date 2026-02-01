import { useState, useMemo } from "react";
import { Star, Download, Check, Loader2, ExternalLink } from "lucide-react";
import type { InstalledAddon, AddonFilter } from "@/types/ddev";
import { useAddonRegistry } from "@/hooks/useAddons";
import { useOpenUrl } from "@/hooks/useDdev";
import { Button } from "@/components/ui/Button";
import { Dropdown } from "@/components/ui/Dropdown";
import { SearchInput } from "@/components/ui/SearchInput";
import { Badge } from "@/components/ui/Badge";
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
    <div className="rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Search and filters */}
      <div className="sticky top-0 z-10 flex items-center gap-2 rounded-t-lg border-b border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-800">
        {/* Type dropdown */}
        <Dropdown
          value={filter.type}
          onChange={(type) => setFilter({ ...filter, type })}
          options={[
            { value: "all", label: "All" },
            { value: "official", label: "Official" },
            { value: "contrib", label: "Community" },
          ]}
        />

        {/* Search input */}
        <SearchInput
          placeholder="Search add-ons..."
          value={filter.search}
          onChange={(e) => setFilter({ ...filter, search: e.target.value })}
        />
      </div>

      {/* Addons list */}
      <div
        role="list"
        aria-label="Available add-ons"
        aria-busy={isLoading}
        className="space-y-2 p-2"
      >
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" aria-label="Loading add-ons" />
          </div>
        ) : error ? (
          <div role="alert" className="py-6 text-center text-sm text-red-500">
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
                role="listitem"
                className="flex items-start gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-900"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium text-gray-900 dark:text-gray-100">
                      {addon.repo}
                    </span>
                    {addon.type === "official" && <Badge variant="blue">Official</Badge>}
                    {isInstalled && <Badge variant="green">Installed</Badge>}
                  </div>
                  <p className="line-clamp-2 text-xs text-gray-500">{addon.description}</p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3" aria-hidden="true" />
                      <span aria-label={`${addon.stars} stars`}>{addon.stars}</span>
                    </span>
                    {addon.tag_name && <span>{addon.tag_name}</span>}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => openUrl.mutate(addon.github_url)}
                    icon={<ExternalLink className="h-4 w-4 text-gray-400" aria-hidden="true" />}
                    aria-label={`View ${addon.repo} on GitHub`}
                  />
                  <Button
                    variant={isInstalled ? "success" : "primary"}
                    onClick={() => onInstall(addonFullName)}
                    disabled={isInstalled || installingAddon !== null}
                    loading={isInstalling}
                    icon={
                      isInstalled ? (
                        <Check className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Download className="h-4 w-4" aria-hidden="true" />
                      )
                    }
                    aria-label={
                      isInstalled
                        ? `${addon.repo} is installed`
                        : isInstalling
                          ? `Installing ${addon.repo}`
                          : `Install ${addon.repo}`
                    }
                    className={cn(
                      isInstalled
                        ? ""
                        : "bg-primary-100 text-primary-700 hover:bg-primary-200 dark:bg-primary-900/30 dark:text-primary-400 dark:hover:bg-primary-900/50"
                    )}
                  >
                    {isInstalled ? "Installed" : isInstalling ? "Installing..." : "Install"}
                  </Button>
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
