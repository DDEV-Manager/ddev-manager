import { useState, useCallback, useEffect, useRef } from "react";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { useAppStore } from "@/stores/appStore";

export type UpdateStatus = "idle" | "checking" | "available" | "downloading" | "ready" | "error";

interface UpdateState {
  status: UpdateStatus;
  update: Update | null;
  error: string | null;
  downloadProgress: number;
}

interface UseUpdateReturn extends UpdateState {
  checkForUpdate: () => Promise<void>;
  downloadAndInstall: () => Promise<void>;
  restart: () => Promise<void>;
}

export function useUpdate(): UseUpdateReturn {
  const [state, setState] = useState<UpdateState>({
    status: "idle",
    update: null,
    error: null,
    downloadProgress: 0,
  });

  const autoUpdateEnabled = useAppStore((state) => state.autoUpdateEnabled);
  const setLastUpdateCheck = useAppStore((state) => state.setLastUpdateCheck);
  const hasCheckedOnStartup = useRef(false);

  const checkForUpdate = useCallback(async () => {
    setState((prev) => ({ ...prev, status: "checking", error: null }));

    try {
      const update = await check();
      setLastUpdateCheck(Date.now());

      if (update) {
        setState({
          status: "available",
          update,
          error: null,
          downloadProgress: 0,
        });
      } else {
        setState({
          status: "idle",
          update: null,
          error: null,
          downloadProgress: 0,
        });
      }
    } catch (err) {
      setState({
        status: "error",
        update: null,
        error: err instanceof Error ? err.message : "Failed to check for updates",
        downloadProgress: 0,
      });
    }
  }, [setLastUpdateCheck]);

  const downloadAndInstall = useCallback(async () => {
    if (!state.update) return;

    setState((prev) => ({ ...prev, status: "downloading", downloadProgress: 0 }));

    try {
      let downloaded = 0;
      let contentLength = 0;

      await state.update.downloadAndInstall((event) => {
        switch (event.event) {
          case "Started":
            contentLength = event.data.contentLength ?? 0;
            break;
          case "Progress":
            downloaded += event.data.chunkLength;
            if (contentLength > 0) {
              const progress = Math.round((downloaded / contentLength) * 100);
              setState((prev) => ({ ...prev, downloadProgress: progress }));
            }
            break;
          case "Finished":
            setState((prev) => ({ ...prev, status: "ready", downloadProgress: 100 }));
            break;
        }
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        status: "error",
        error: err instanceof Error ? err.message : "Failed to download update",
      }));
    }
  }, [state.update]);

  const restart = useCallback(async () => {
    await relaunch();
  }, []);

  // Check for updates on startup if enabled
  useEffect(() => {
    // Skip in non-Tauri environment (e.g., tests)
    if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
      return;
    }

    if (autoUpdateEnabled && !hasCheckedOnStartup.current) {
      hasCheckedOnStartup.current = true;
      // Small delay to not block app startup
      const timer = setTimeout(() => {
        checkForUpdate();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [autoUpdateEnabled, checkForUpdate]);

  return {
    ...state,
    checkForUpdate,
    downloadAndInstall,
    restart,
  };
}
