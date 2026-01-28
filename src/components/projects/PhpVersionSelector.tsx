import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, Loader2, Check } from "lucide-react";
import { listen } from "@tauri-apps/api/event";
import { useDdevSchema } from "@/hooks/useSchema";
import { useChangePhpVersion } from "@/hooks/useDdev";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/toastStore";

interface CommandStatus {
  command: string;
  project: string;
  status: "started" | "finished" | "error" | "cancelled";
  message?: string;
  process_id?: string;
}

interface PhpVersionSelectorProps {
  currentVersion: string | null | undefined;
  projectName: string;
  approot: string;
  isRunning: boolean;
  disabled?: boolean;
}

export function PhpVersionSelector({
  currentVersion,
  projectName,
  approot,
  isRunning,
  disabled = false,
}: PhpVersionSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: schema, isLoading: schemaLoading } = useDdevSchema();
  const changePhpVersion = useChangePhpVersion();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Listen for command completion
  useEffect(() => {
    if (!isChanging) return;

    let mounted = true;
    let unlistenFn: (() => void) | null = null;

    listen<CommandStatus>("command-status", (event) => {
      if (!mounted) return;

      const { command, project, status } = event.payload;

      if (command !== "change-php" || project !== projectName) return;

      if (status === "finished") {
        toast.success("PHP version changed", `PHP version changed to ${selectedVersion}`);
        setIsChanging(false);
        setSelectedVersion(null);
      } else if (status === "error") {
        toast.error("Failed to change PHP version", "Check the terminal for details");
        setIsChanging(false);
        setSelectedVersion(null);
      } else if (status === "cancelled") {
        toast.info("Operation cancelled", "PHP version change was cancelled");
        setIsChanging(false);
        setSelectedVersion(null);
      }
    }).then((fn) => {
      if (mounted) {
        unlistenFn = fn;
      } else {
        fn();
      }
    });

    return () => {
      mounted = false;
      if (unlistenFn) {
        unlistenFn();
      }
    };
  }, [isChanging, projectName, selectedVersion]);

  const handleVersionClick = useCallback(
    (version: string) => {
      if (version === currentVersion) return;
      setSelectedVersion(version);
      setIsOpen(false);
      setShowConfirm(true);
    },
    [currentVersion]
  );

  const handleConfirm = useCallback(() => {
    if (!selectedVersion) return;
    setShowConfirm(false);
    setIsChanging(true);
    changePhpVersion.mutate({
      name: projectName,
      approot,
      phpVersion: selectedVersion,
      restart: isRunning,
    });
  }, [selectedVersion, projectName, approot, isRunning, changePhpVersion]);

  const handleCancel = useCallback(() => {
    setShowConfirm(false);
    setSelectedVersion(null);
  }, []);

  const phpVersions = schema?.php_versions ?? [];
  const displayVersion = currentVersion ?? "N/A";
  const isDisabled = disabled || isChanging || schemaLoading;

  return (
    <>
      <div ref={dropdownRef} className="relative inline-block">
        <button
          type="button"
          onClick={() => !isDisabled && setIsOpen(!isOpen)}
          disabled={isDisabled}
          className={cn(
            "inline-flex items-center gap-1 text-sm transition-colors",
            isDisabled
              ? "cursor-not-allowed opacity-50"
              : "text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 cursor-pointer",
            !isDisabled && "border-primary-400 dark:border-primary-500 border-b border-dotted"
          )}
        >
          {isChanging ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Changing...</span>
            </>
          ) : (
            <>
              <span>PHP {displayVersion}</span>
              {!isDisabled && phpVersions.length > 0 && <ChevronDown className="h-3 w-3" />}
            </>
          )}
        </button>

        {isOpen && phpVersions.length > 0 && (
          <div className="absolute top-full left-0 z-50 mt-1 max-h-64 min-w-[100px] overflow-y-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
            {phpVersions.map((version) => {
              const isCurrent = version === currentVersion;
              return (
                <button
                  key={version}
                  type="button"
                  onClick={() => handleVersionClick(version)}
                  disabled={isCurrent}
                  className={cn(
                    "flex w-full items-center justify-between px-3 py-1.5 text-left text-sm",
                    isCurrent
                      ? "bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 cursor-default"
                      : "hover:bg-gray-100 dark:hover:bg-gray-700"
                  )}
                >
                  <span>{version}</span>
                  {isCurrent && <Check className="h-4 w-4" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={showConfirm}
        title="Change PHP Version"
        message={
          isRunning
            ? `Change PHP version to ${selectedVersion}? The project will be restarted.`
            : `Change PHP version to ${selectedVersion}?`
        }
        confirmLabel="Change"
        cancelLabel="Cancel"
        variant={isRunning ? "warning" : "default"}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </>
  );
}
