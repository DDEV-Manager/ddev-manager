import { X, Sun, Moon, Monitor, Minus, Plus } from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);
  const zoom = useAppStore((state) => state.zoom);
  const setZoom = useAppStore((state) => state.setZoom);

  const themeOptions: { value: "light" | "dark" | "system"; icon: typeof Sun; label: string }[] = [
    { value: "light", icon: Sun, label: "Light" },
    { value: "dark", icon: Moon, label: "Dark" },
    { value: "system", icon: Monitor, label: "System" },
  ];

  const zoomPresets = [75, 100, 125, 150];

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Settings</h2>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          <X className="h-5 w-5" />
        </button>
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
                    ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-400"
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
          <button
            onClick={() => setZoom(zoom - 10)}
            disabled={zoom <= 50}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <Minus className="h-4 w-4" />
          </button>
          <input
            type="range"
            min="50"
            max="200"
            step="5"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-gray-200 dark:bg-gray-700"
          />
          <button
            onClick={() => setZoom(zoom + 10)}
            disabled={zoom >= 200}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <Plus className="h-4 w-4" />
          </button>
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
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              )}
            >
              {preset}%
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
