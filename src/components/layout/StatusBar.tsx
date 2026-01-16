import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStatusStore } from "@/stores/statusStore";

interface CommandOutput {
  line: string;
  stream: "stdout" | "stderr";
}

interface CommandStatus {
  command: string;
  project: string;
  status: "started" | "finished" | "error";
  message?: string;
}

export function StatusBar() {
  const { isRunning, command, project, lastLine, exiting, setRunning, setLastLine, setFinished } =
    useStatusStore();

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
      const { command, project, status } = event.payload;

      if (status === "started") {
        setRunning(command, project);
      } else if (status === "finished" || status === "error") {
        setFinished();
      }
    });

    return () => {
      unlistenOutput.then((fn) => fn());
      unlistenStatus.then((fn) => fn());
    };
  }, [setRunning, setLastLine, setFinished]);

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
        "fixed right-0 bottom-0 left-0 z-40 border-t border-gray-200 bg-gray-100 px-4 py-2 dark:border-gray-700 dark:bg-gray-800",
        exiting
          ? "animate-out slide-out-to-bottom fade-out duration-300"
          : "animate-in slide-in-from-bottom fade-in duration-300"
      )}
    >
      <div className="flex items-center gap-3">
        {/* Running indicator */}
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
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
      </div>
    </div>
  );
}
