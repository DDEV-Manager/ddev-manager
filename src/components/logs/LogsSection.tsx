import { useState, useEffect, useRef, useCallback } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { FileText, Search, Play, Square, Clock, Trash2, Loader2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogsSectionProps {
  projectName: string;
  services: string[];
  isProjectRunning: boolean;
}

interface LogLine {
  id: number;
  text: string;
  stream: "stdout" | "stderr";
  timestamp: Date;
}

interface LogOutput {
  line: string;
  stream: string;
  project: string;
  service: string;
}

interface LogStatus {
  project: string;
  service: string;
  status: "started" | "finished" | "error" | "cancelled";
  message?: string;
  process_id?: string;
}

export function LogsSection({ projectName, services, isProjectRunning }: LogsSectionProps) {
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [selectedService, setSelectedService] = useState("web");
  const [searchFilter, setSearchFilter] = useState("");
  const [isFollowing, setIsFollowing] = useState(false);
  const [showTimestamps, setShowTimestamps] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [processId, setProcessId] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const lineIdRef = useRef(0);

  // Use ref to track processId for cleanup without causing re-renders
  const processIdRef = useRef<string | null>(null);

  // Sync processId to ref for cleanup
  useEffect(() => {
    processIdRef.current = processId;
  }, [processId]);

  // Available services - default to web and db if services array is empty
  const availableServices = services.length > 0 ? services : ["web", "db"];

  // Auto-scroll when following and new logs arrive
  useEffect(() => {
    if (isFollowing && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, isFollowing]);

  // Listen for log output events
  useEffect(() => {
    let mounted = true;
    let unlistenOutput: (() => void) | null = null;
    let unlistenStatus: (() => void) | null = null;

    listen<LogOutput>("log-output", (event) => {
      if (!mounted) return;
      const { line, stream, project, service } = event.payload;

      // Only accept logs for current project and service
      if (project !== projectName || service !== selectedService) return;

      setLogs((prev) => [
        ...prev,
        {
          id: lineIdRef.current++,
          text: line,
          stream: stream as "stdout" | "stderr",
          timestamp: new Date(),
        },
      ]);
    }).then((fn) => {
      if (mounted) unlistenOutput = fn;
      else fn();
    });

    listen<LogStatus>("log-status", (event) => {
      if (!mounted) return;
      const { project, service, status, process_id } = event.payload;

      // Only handle events for current project and service
      if (project !== projectName || service !== selectedService) return;

      if (status === "started" && process_id) {
        setProcessId(process_id);
        setIsLoading(false);
      } else if (status === "finished" || status === "error" || status === "cancelled") {
        setIsLoading(false);
        setIsFollowing(false);
        setProcessId(null);
      }
    }).then((fn) => {
      if (mounted) unlistenStatus = fn;
      else fn();
    });

    return () => {
      mounted = false;
      if (unlistenOutput) unlistenOutput();
      if (unlistenStatus) unlistenStatus();
    };
  }, [projectName, selectedService]);

  // Stop logs when component unmounts
  useEffect(() => {
    return () => {
      if (processIdRef.current) {
        invoke("cancel_command", { processId: processIdRef.current }).catch(() => {
          // Ignore errors on cleanup
        });
      }
    };
  }, []);

  const stopCurrentProcess = useCallback(() => {
    if (processIdRef.current) {
      invoke("cancel_command", { processId: processIdRef.current }).catch(() => {
        // Ignore errors
      });
      setProcessId(null);
    }
  }, []);

  const handleFetchLogs = useCallback(
    (follow: boolean) => {
      // Prevent double-clicks while loading
      if (isLoading) {
        return;
      }

      // Stop any existing streaming
      stopCurrentProcess();

      setIsLoading(true);
      setLogs([]);
      setIsFollowing(follow);

      invoke<string>("get_logs", {
        project: projectName,
        service: selectedService,
        follow,
        tail: 100,
        timestamps: showTimestamps,
      }).catch((error) => {
        console.error("Failed to get logs:", error);
        setIsLoading(false);
        setIsFollowing(false);
      });
    },
    [projectName, selectedService, showTimestamps, isLoading, stopCurrentProcess]
  );

  const handleStopFollowing = useCallback(() => {
    stopCurrentProcess();
    setIsFollowing(false);
  }, [stopCurrentProcess]);

  const handleClear = useCallback(() => {
    setLogs([]);
    lineIdRef.current = 0;
  }, []);

  const handleServiceChange = useCallback(
    (service: string) => {
      // Stop current streaming if active
      stopCurrentProcess();
      setIsFollowing(false);
      setSelectedService(service);
      setLogs([]);
      setIsDropdownOpen(false);
    },
    [stopCurrentProcess]
  );

  // Filter logs by search term
  const filteredLogs = searchFilter
    ? logs.filter((log) => log.text.toLowerCase().includes(searchFilter.toLowerCase()))
    : logs;

  return (
    <section>
      <h3 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
        <FileText className="mr-1 inline h-4 w-4" />
        Logs
      </h3>

      {!isProjectRunning ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
          Start the project to view logs
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-800">
            {/* Service dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-1 rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700"
              >
                <span className="min-w-[40px]">{selectedService}</span>
                <ChevronDown className="h-3 w-3" />
              </button>
              {isDropdownOpen && (
                <div className="absolute top-full left-0 z-10 mt-1 rounded border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-700">
                  {availableServices.map((service) => (
                    <button
                      key={service}
                      onClick={() => handleServiceChange(service)}
                      className={cn(
                        "block w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-600",
                        service === selectedService && "bg-blue-50 dark:bg-blue-900/30"
                      )}
                    >
                      {service}
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
                placeholder="Filter logs..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full rounded border border-gray-300 bg-white py-1 text-sm dark:border-gray-600 dark:bg-gray-700"
                style={{ paddingLeft: "28px", paddingRight: "8px" }}
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1">
              {/* Fetch/Follow toggle */}
              {isFollowing ? (
                <button
                  onClick={handleStopFollowing}
                  disabled={isLoading}
                  className="flex items-center gap-1 rounded bg-red-100 px-2 py-1 text-sm text-red-700 hover:bg-red-200 disabled:opacity-50 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                  title="Stop following"
                >
                  <Square className="h-3 w-3" />
                  Stop
                </button>
              ) : (
                <>
                  <button
                    onClick={() => handleFetchLogs(false)}
                    disabled={isLoading}
                    className="flex items-center gap-1 rounded bg-gray-200 px-2 py-1 text-sm text-gray-700 hover:bg-gray-300 disabled:opacity-50 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
                    title="Fetch logs"
                  >
                    {isLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <FileText className="h-3 w-3" />
                    )}
                    Fetch
                  </button>
                  <button
                    onClick={() => handleFetchLogs(true)}
                    disabled={isLoading}
                    className="flex items-center gap-1 rounded bg-blue-100 px-2 py-1 text-sm text-blue-700 hover:bg-blue-200 disabled:opacity-50 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
                    title="Follow logs (real-time)"
                  >
                    {isLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Play className="h-3 w-3" />
                    )}
                    Follow
                  </button>
                </>
              )}

              {/* Timestamps toggle */}
              <button
                onClick={() => setShowTimestamps(!showTimestamps)}
                className={cn(
                  "rounded p-1.5 text-sm",
                  showTimestamps
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    : "bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500"
                )}
                title="Toggle timestamps"
              >
                <Clock className="h-3.5 w-3.5" />
              </button>

              {/* Clear button */}
              <button
                onClick={handleClear}
                disabled={logs.length === 0}
                className="rounded bg-gray-200 p-1.5 text-sm text-gray-600 hover:bg-gray-300 disabled:opacity-50 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500"
                title="Clear logs"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Log content */}
          <div
            ref={logContainerRef}
            className="h-64 overflow-auto bg-gray-900 p-2 font-mono text-xs"
          >
            {filteredLogs.length === 0 ? (
              <div className="flex h-full items-center justify-center text-gray-500">
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading logs...
                  </div>
                ) : logs.length === 0 ? (
                  "Click 'Fetch' or 'Follow' to view logs"
                ) : (
                  "No logs match the filter"
                )}
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className={cn(
                    "break-all whitespace-pre-wrap",
                    log.stream === "stderr" ? "text-red-400" : "text-gray-300"
                  )}
                >
                  {showTimestamps && (
                    <span className="text-gray-500">[{log.timestamp.toLocaleTimeString()}] </span>
                  )}
                  {log.text}
                </div>
              ))
            )}
          </div>

          {/* Status bar */}
          {isFollowing && (
            <div className="flex items-center gap-2 border-t border-gray-700 bg-gray-800 px-2 py-1 text-xs text-green-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
              </span>
              Streaming logs...
            </div>
          )}
        </div>
      )}
    </section>
  );
}
