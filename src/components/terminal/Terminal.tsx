import { useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { X, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

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

interface TerminalLine {
  id: number;
  text: string;
  type: "stdout" | "stderr" | "status" | "info";
  timestamp: Date;
}

interface TerminalProps {
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
}

export function Terminal({ isOpen, onClose, onToggle }: TerminalProps) {
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

  // Auto-scroll to bottom when new lines are added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

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
      }
    });

    return () => {
      unlistenOutput.then((fn) => fn());
      unlistenStatus.then((fn) => fn());
    };
  }, []);

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className={cn(
          "fixed right-4 bottom-4 flex items-center gap-2 rounded-lg px-3 py-2 shadow-lg transition-all",
          isRunning
            ? "animate-pulse bg-blue-500 text-white"
            : "bg-gray-800 text-gray-300 hover:bg-gray-700"
        )}
      >
        <ChevronUp className="h-4 w-4" />
        {isRunning ? `Running: ${currentCommand}` : "Terminal"}
      </button>
    );
  }

  return (
    <div className="flex flex-col border-t border-gray-200 bg-gray-900 dark:border-gray-800">
      {/* Terminal header */}
      <div className="flex items-center justify-between border-b border-gray-700 bg-gray-800 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-300">Terminal</span>
          {isRunning && (
            <span className="flex items-center gap-1 text-xs text-blue-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-blue-400" />
              {currentCommand}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={clearLines}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
            title="Clear terminal"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            onClick={onToggle}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
            title="Minimize"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Terminal content */}
      <div
        ref={scrollRef}
        className="max-h-64 min-h-32 flex-1 overflow-y-auto p-3 font-mono text-sm"
      >
        {lines.length === 0 ? (
          <div className="text-gray-500 italic">
            Terminal output will appear here when running commands...
          </div>
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
                line.type === "info" && "text-blue-400"
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
