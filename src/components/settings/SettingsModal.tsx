import { useState, useEffect } from "react";
import {
  X,
  Sun,
  Moon,
  Monitor,
  Contrast,
  Minus,
  Plus,
  RefreshCw,
  Download,
  RotateCcw,
} from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { cn } from "@/lib/utils";
import { useUpdate } from "@/hooks/useUpdate";
import { getVersion } from "@tauri-apps/api/app";
import { getModifierDisplay } from "@/lib/shortcuts";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);
  const zoom = useAppStore((state) => state.zoom);
  const setZoom = useAppStore((state) => state.setZoom);
  const autoUpdateEnabled = useAppStore((state) => state.autoUpdateEnabled);
  const setAutoUpdateEnabled = useAppStore((state) => state.setAutoUpdateEnabled);

  const [appVersion, setAppVersion] = useState<string>("");
  const { status, update, error, downloadProgress, checkForUpdate, downloadAndInstall, restart } =
    useUpdate();

  useEffect(() => {
    getVersion()
      .then(setAppVersion)
      .catch(() => setAppVersion("dev"));
  }, []);

  const themeOptions: {
    value: "light" | "dark" | "high-contrast" | "system";
    icon: typeof Sun;
    label: string;
  }[] = [
    { value: "light", icon: Sun, label: "Light" },
    { value: "dark", icon: Moon, label: "Dark" },
    { value: "high-contrast", icon: Contrast, label: "High Contrast" },
    { value: "system", icon: Monitor, label: "System" },
  ];

  const zoomPresets = [75, 100, 125, 150];

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Settings</h2>
        <Button variant="ghost" size="icon-sm" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Theme Section */}
      <div className="mb-6">
        <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Appearance
        </label>
        <div className="flex gap-2">
          {themeOptions.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                onClick={() => setTheme(option.value)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-2 rounded-lg border-2 p-3 transition-colors",
                  theme === option.value
                    ? "border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-400 dark:bg-primary-900/30 dark:text-primary-400"
                    : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:bg-gray-800"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-sm font-medium">{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Zoom Section */}
      <div>
        <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Zoom ({zoom}%)
        </label>

        {/* Zoom slider with +/- buttons */}
        <div className="mb-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setZoom(zoom - 10)}
            disabled={zoom <= 50}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <input
            type="range"
            min="50"
            max="200"
            step="5"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-gray-200 dark:bg-gray-700"
          />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setZoom(zoom + 10)}
            disabled={zoom >= 200}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Preset buttons */}
        <div className="flex gap-2">
          {zoomPresets.map((preset) => (
            <button
              key={preset}
              onClick={() => setZoom(preset)}
              className={cn(
                "flex-1 rounded-lg py-1.5 text-sm font-medium transition-colors",
                zoom === preset
                  ? "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              )}
            >
              {preset}%
            </button>
          ))}
        </div>

        {/* Keyboard shortcuts hint */}
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          Keyboard: {getModifierDisplay()}+ to zoom in, {getModifierDisplay()}- to zoom out,{" "}
          {getModifierDisplay()}0 to reset
        </p>
      </div>

      {/* Separator */}
      <div className="my-6 border-t border-gray-200 dark:border-gray-700" />

      {/* Updates Section */}
      <div>
        <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Updates
        </label>

        {/* Version info */}
        <div className="mb-4 flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Current version</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">v{appVersion}</span>
        </div>

        {/* Auto-update toggle */}
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Check for updates automatically
          </span>
          <Toggle enabled={autoUpdateEnabled} onChange={setAutoUpdateEnabled} label="Auto-update" />
        </div>

        {/* Update status */}
        {status === "available" && update && (
          <div className="bg-primary-50 dark:bg-primary-900/20 mb-4 rounded-lg p-3">
            <p className="text-primary-800 dark:text-primary-300 text-sm font-medium">
              Update available: v{update.version}
            </p>
            <Button
              variant="primary"
              size="sm"
              icon={<Download className="h-4 w-4" />}
              onClick={downloadAndInstall}
              className="mt-2"
            >
              Download and Install
            </Button>
          </div>
        )}

        {status === "downloading" && (
          <div className="bg-primary-50 dark:bg-primary-900/20 mb-4 rounded-lg p-3">
            <p className="text-primary-800 dark:text-primary-300 mb-2 text-sm font-medium">
              Downloading update... {downloadProgress}%
            </p>
            <div className="bg-primary-200 dark:bg-primary-800 h-2 overflow-hidden rounded-full">
              <div
                className="bg-primary-500 h-full transition-all"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
          </div>
        )}

        {status === "ready" && (
          <div className="mb-4 rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
            <p className="text-sm font-medium text-green-800 dark:text-green-300">
              Update ready to install
            </p>
            <Button
              variant="success"
              size="sm"
              icon={<RotateCcw className="h-4 w-4" />}
              onClick={restart}
              className="mt-2"
            >
              Restart to Update
            </Button>
          </div>
        )}

        {status === "error" && error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Check for updates button */}
        <Button
          variant="secondary"
          size="md"
          icon={<RefreshCw className={cn("h-4 w-4", status === "checking" && "animate-spin")} />}
          onClick={checkForUpdate}
          disabled={status === "checking" || status === "downloading"}
          className="w-full"
        >
          {status === "checking" ? "Checking..." : "Check for Updates"}
        </Button>

        {status === "idle" && (
          <p className="mt-2 text-center text-xs text-gray-500 dark:text-gray-400">
            You&apos;re up to date!
          </p>
        )}
      </div>
    </Modal>
  );
}
