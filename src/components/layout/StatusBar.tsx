import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStatusStore } from "@/stores/statusStore";

interface CommandOutput {
  line: string;
  stream: "stdout" | "stderr";
}

interface CommandStatus {
  command: string;
  project: string;
  status: "started" | "finished" | "error" | "cancelled";
  message?: string;
  process_id?: string;
}

export function StatusBar() {
  const {
    isRunning,
    command,
    project,
    lastLine,
    exiting,
    processId,
    setRunning,
    setLastLine,
    setFinished,
    setCancelled,
  } = useStatusStore();

  // Listen for command events
  useEffect(() => {
    const unlistenOutput = listen<CommandOutput>("command-output", (event) => {
      // Only update if we have a non-empty line
      const line = event.payload.line.trim();
      if (line) {
        setLastLine(line);
      }
    });

    const unlistenStatus = listen<CommandStatus>("command-status", (event) => {
      const { command, project, status, process_id } = event.payload;

      if (status === "started") {
        setRunning(command, project, process_id);
      } else if (status === "finished" || status === "error") {
        setFinished();
      } else if (status === "cancelled") {
        setCancelled();
      }
    });

    return () => {
      unlistenOutput.then((fn) => fn());
      unlistenStatus.then((fn) => fn());
    };
  }, [setRunning, setLastLine, setFinished, setCancelled]);

  const handleCancel = async () => {
    if (!processId) return;

    try {
      await invoke("cancel_command", { processId });
    } catch (error) {
      console.error("Failed to cancel command:", error);
    }
  };

  // Don't render if not running and not exiting
  if (!isRunning && !exiting) {
    return null;
  }

  // Format command name for display
  const formatCommand = (cmd: string | null) => {
    if (!cmd) return "";
    const commandNames: Record<string, string> = {
      start: "Starting",
      stop: "Stopping",
      restart: "Restarting",
      config: "Configuring",
      delete: "Removing",
      poweroff: "Powering off",
      "addon-install": "Installing addon",
      "addon-remove": "Removing addon",
    };
    return commandNames[cmd] || cmd;
  };

  return (
    <div
      className={cn(
        "fixed right-0 bottom-0 left-0 z-40 border-t border-gray-200/50 bg-gray-100/80 backdrop-blur-md dark:border-gray-700/50 dark:bg-gray-800/80",
        exiting
          ? "animate-out slide-out-to-bottom fade-out duration-300"
          : "animate-in slide-in-from-bottom fade-in duration-300"
      )}
    >
      {/* Progress bar */}
      <div className="bg-primary-100 dark:bg-primary-900/30 absolute inset-x-0 top-0 h-1 overflow-hidden">
        <div className="animate-progress bg-primary-500 h-full w-1/3" />
      </div>

      <div className="flex items-center gap-3 px-4 py-2">
        {/* Running indicator */}
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <Loader2 className="text-primary-500 h-4 w-4 animate-spin" />
          <span>
            {formatCommand(command)}
            {project && project !== "all" && (
              <span className="ml-1 text-gray-500 dark:text-gray-400">({project})</span>
            )}
          </span>
        </div>

        {/* Separator */}
        <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />

        {/* Last line of output */}
        <div className="min-w-0 flex-1 truncate font-mono text-sm text-gray-600 dark:text-gray-400">
          {lastLine || "Starting..."}
        </div>

        {/* Cancel button */}
        {processId && !exiting && (
          <button
            onClick={handleCancel}
            className="flex shrink-0 items-center gap-1.5 rounded-md bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
            title="Cancel command"
          >
            <X className="h-3.5 w-3.5" />
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
