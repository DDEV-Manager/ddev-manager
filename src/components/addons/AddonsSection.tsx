import { useState, useEffect, useCallback } from "react";
import { listen } from "@tauri-apps/api/event";
import { Package, Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useInstalledAddons,
  useAddonCommandListener,
  useInstallAddon,
  useRemoveAddon,
} from "@/hooks/useAddons";
import { InstalledAddonsList } from "./InstalledAddonsList";
import { AddonBrowser } from "./AddonBrowser";

interface CommandStatus {
  command: string;
  project: string;
  status: "started" | "finished" | "error";
  message?: string;
}

interface AddonsSectionProps {
  projectName: string;
  isProjectRunning: boolean;
}

type TabType = "installed" | "browse";

export function AddonsSection({ projectName, isProjectRunning }: AddonsSectionProps) {
  const [activeTab, setActiveTab] = useState<TabType>("installed");
  const [installingAddon, setInstallingAddon] = useState<string | null>(null);
  const [removingAddon, setRemovingAddon] = useState<string | null>(null);
  const { data: installedAddons, isLoading, refetch } = useInstalledAddons(projectName);
  const installAddon = useInstallAddon();
  const removeAddon = useRemoveAddon();

  // Listen for addon command completion to refresh the list and clear loading state
  useAddonCommandListener(refetch);

  // Listen for command completion to clear loading states
  useEffect(() => {
    let unlistenFn: (() => void) | null = null;

    listen<CommandStatus>("command-status", (event) => {
      const { command, status } = event.payload;

      if (status === "finished" || status === "error") {
        if (command === "addon-install") {
          setInstallingAddon(null);
        } else if (command === "addon-remove") {
          setRemovingAddon(null);
        }
      }
    }).then((fn) => {
      unlistenFn = fn;
    });

    return () => {
      if (unlistenFn) {
        unlistenFn();
      }
    };
  }, []);

  const handleInstall = useCallback(
    (addon: string) => {
      setInstallingAddon(addon);
      installAddon.mutate({ project: projectName, addon });
    },
    [projectName, installAddon]
  );

  const handleRemove = useCallback(
    (addon: string) => {
      setRemovingAddon(addon);
      removeAddon.mutate({ project: projectName, addon });
    },
    [projectName, removeAddon]
  );

  return (
    <section>
      <h3 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
        <Package className="mr-1 inline h-4 w-4" />
        Add-ons
      </h3>

      {/* Tabs */}
      <div className="mb-3 flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab("installed")}
          className={cn(
            "px-3 py-2 text-sm font-medium transition-colors",
            activeTab === "installed"
              ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
          )}
        >
          Installed ({installedAddons?.length ?? 0})
        </button>
        <button
          onClick={() => setActiveTab("browse")}
          className={cn(
            "flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors",
            activeTab === "browse"
              ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
          )}
        >
          <Download className="h-4 w-4" />
          Browse Registry
        </button>
      </div>

      {/* Tab Content */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : activeTab === "installed" ? (
        <InstalledAddonsList
          addons={installedAddons ?? []}
          isProjectRunning={isProjectRunning}
          removingAddon={removingAddon}
          onRemove={handleRemove}
        />
      ) : (
        <AddonBrowser
          installedAddons={installedAddons ?? []}
          isProjectRunning={isProjectRunning}
          installingAddon={installingAddon}
          onInstall={handleInstall}
        />
      )}
    </section>
  );
}
