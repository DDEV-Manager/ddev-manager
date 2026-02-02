import { useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/Tooltip";

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

interface TerminalLine {
  id: number;
  text: string;
  type: "stdout" | "stderr" | "status" | "info";
  timestamp: Date;
}

interface TerminalProps {
  isOpen: boolean;
}

export function Terminal({ isOpen }: TerminalProps) {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentCommand, setCurrentCommand] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lineIdRef = useRef(0);

  const addLine = (text: string, type: TerminalLine["type"]) => {
    const newLine: TerminalLine = {
      id: lineIdRef.current++,
      text,
      type,
      timestamp: new Date(),
    };
    setLines((prev) => [...prev, newLine]);
  };

  const clearLines = () => {
    setLines([]);
  };

  // Auto-scroll to bottom when new lines are added or panel is opened
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines, isOpen]);

  // Listen for command output events
  useEffect(() => {
    const unlistenOutput = listen<CommandOutput>("command-output", (event) => {
      addLine(event.payload.line, event.payload.stream);
    });

    const unlistenStatus = listen<CommandStatus>("command-status", (event) => {
      const { command, project, status, message } = event.payload;

      if (status === "started") {
        setIsRunning(true);
        setCurrentCommand(`${command} ${project}`);
        addLine(`▶ ${message || `Starting ${command} for ${project}...`}`, "info");
      } else if (status === "finished") {
        setIsRunning(false);
        setCurrentCommand(null);
        addLine(`✓ ${message || "Command completed successfully"}`, "status");
      } else if (status === "error") {
        setIsRunning(false);
        setCurrentCommand(null);
        addLine(`✗ ${message || "Command failed"}`, "status");
      } else if (status === "cancelled") {
        setIsRunning(false);
        setCurrentCommand(null);
        addLine(`⊘ ${message || "Command was cancelled"}`, "status");
      }
    });

    return () => {
      unlistenOutput.then((fn) => fn());
      unlistenStatus.then((fn) => fn());
    };
  }, []);

  // Don't render UI when closed, but keep component mounted for event listeners
  if (!isOpen) {
    return null;
  }

  return (
    <div className="flex flex-col border-t border-gray-200 bg-gray-900 dark:border-gray-800">
      {/* Output header */}
      <div className="flex items-center justify-between border-b border-gray-700 bg-gray-800 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-300">Output</span>
          {isRunning && (
            <span className="text-primary-400 flex items-center gap-1 text-xs">
              <span className="bg-primary-400 h-2 w-2 animate-pulse rounded-full" />
              {currentCommand}
            </span>
          )}
        </div>
        <Tooltip content="Clear output">
          <button
            onClick={clearLines}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
            aria-label="Clear output"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </Tooltip>
      </div>

      {/* Terminal content */}
      <div
        ref={scrollRef}
        className="max-h-64 min-h-32 flex-1 overflow-y-auto p-3 font-mono text-sm"
      >
        {lines.length === 0 ? (
          <div className="text-gray-500 italic">Command output will appear here...</div>
        ) : (
          lines.map((line) => (
            <div
              key={line.id}
              className={cn(
                "break-all whitespace-pre-wrap",
                line.type === "stdout" && "text-gray-300",
                line.type === "stderr" && "text-red-400",
                line.type === "status" && line.text.startsWith("✓") && "font-medium text-green-400",
                line.type === "status" && line.text.startsWith("✗") && "font-medium text-red-400",
                line.type === "status" &&
                  line.text.startsWith("⊘") &&
                  "font-medium text-yellow-400",
                line.type === "info" && "text-primary-400"
              )}
            >
              {line.text}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
