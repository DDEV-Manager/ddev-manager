import { useState, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { RefreshCw, ImageOff, Loader2, Camera } from "lucide-react";
import { useScreenshotData, useCaptureScreenshot } from "@/hooks/useScreenshot";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface ScreenshotStatus {
  project: string;
  status: "started" | "capturing" | "finished" | "error";
  path: string | null;
  message: string | null;
}

interface ProjectScreenshotProps {
  projectName: string;
  primaryUrl: string;
  isRunning: boolean;
}

export function ProjectScreenshot({ projectName, primaryUrl, isRunning }: ProjectScreenshotProps) {
  const { data: screenshotData, isLoading: isLoadingData } = useScreenshotData(projectName);
  const captureScreenshot = useCaptureScreenshot();
  const queryClient = useQueryClient();

  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageKey, setImageKey] = useState(0); // For forcing image refresh

  // Auto-capture screenshot if none exists and project is running
  useEffect(() => {
    if (isRunning && !isLoadingData && !screenshotData && !isCapturing && !error) {
      captureScreenshot.mutate({ projectName, url: primaryUrl });
    }
  }, [
    isRunning,
    isLoadingData,
    screenshotData,
    isCapturing,
    error,
    projectName,
    primaryUrl,
    captureScreenshot,
  ]);

  // Listen for screenshot status events
  useEffect(() => {
    const unlisten = listen<ScreenshotStatus>("screenshot-status", (event) => {
      if (event.payload.project !== projectName) return;

      switch (event.payload.status) {
        case "started":
        case "capturing":
          setIsCapturing(true);
          setError(null);
          break;
        case "finished":
          setIsCapturing(false);
          setError(null);
          // Invalidate query to refresh the data
          queryClient.invalidateQueries({
            queryKey: ["screenshot-data", projectName],
          });
          // Force image refresh by changing key
          setImageKey((k) => k + 1);
          break;
        case "error":
          setIsCapturing(false);
          setError(event.payload.message || "Screenshot capture failed");
          break;
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [projectName, queryClient]);

  const handleCapture = () => {
    if (!isRunning || isCapturing) return;
    setError(null);
    captureScreenshot.mutate({ projectName, url: primaryUrl });
  };

  // Loading state
  if (isLoadingData) {
    return (
      <div className="flex h-48 w-full items-center justify-center rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  // Capturing state
  if (isCapturing) {
    return (
      <div className="flex h-48 w-full flex-col items-center justify-center gap-2 rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
        <span className="text-sm text-gray-500 dark:text-gray-400">Capturing screenshot...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-48 w-full flex-col items-center justify-center gap-3 rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
        <ImageOff className="h-8 w-8 text-red-400" />
        <span className="text-center text-sm text-red-600 dark:text-red-400">{error}</span>
        {isRunning && (
          <button
            onClick={handleCapture}
            className="flex items-center gap-1 rounded-md bg-red-100 px-3 py-1.5 text-sm text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        )}
      </div>
    );
  }

  // Screenshot exists
  if (screenshotData) {
    return (
      <div className="relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
        <img
          key={imageKey}
          src={screenshotData}
          alt={`Screenshot of ${projectName}`}
          className="h-auto w-full object-cover object-top"
          style={{ maxHeight: "300px" }}
        />
        {isRunning && (
          <button
            onClick={handleCapture}
            className="absolute top-2 right-2 rounded-md bg-black/50 p-1.5 text-white hover:bg-black/70"
            title="Refresh screenshot"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  // No screenshot - show placeholder with capture button
  return (
    <div className="flex h-48 w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800">
      <Camera className="h-8 w-8 text-gray-400" />
      <span className="text-sm text-gray-500 dark:text-gray-400">No screenshot available</span>
      {isRunning && (
        <button
          onClick={handleCapture}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm",
            "bg-blue-100 text-blue-700 hover:bg-blue-200",
            "dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
          )}
        >
          <Camera className="h-4 w-4" />
          Capture Screenshot
        </button>
      )}
      {!isRunning && (
        <span className="text-xs text-gray-400 dark:text-gray-500">
          Start the project to capture a screenshot
        </span>
      )}
    </div>
  );
}
