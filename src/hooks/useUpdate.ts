import { useCallback, useEffect } from "react";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { useAppStore } from "@/stores/appStore";
import { useUpdateStore, type UpdateStatus } from "@/stores/updateStore";
import type { Update } from "@tauri-apps/plugin-updater";

interface UseUpdateReturn {
  status: UpdateStatus;
  update: Update | null;
  error: string | null;
  downloadProgress: number;
  checkForUpdate: () => Promise<void>;
  downloadAndInstall: () => Promise<void>;
  restart: () => Promise<void>;
}

export type { UpdateStatus };

// Use a module-level flag to prevent multiple startup checks across component instances
let startupCheckScheduled = false;

export function useUpdate(): UseUpdateReturn {
  const autoUpdateEnabled = useAppStore((state) => state.autoUpdateEnabled);
  const setLastUpdateCheck = useAppStore((state) => state.setLastUpdateCheck);

  const status = useUpdateStore((state) => state.status);
  const update = useUpdateStore((state) => state.update);
  const error = useUpdateStore((state) => state.error);
  const downloadProgress = useUpdateStore((state) => state.downloadProgress);

  const setStatus = useUpdateStore((state) => state.setStatus);
  const setUpdate = useUpdateStore((state) => state.setUpdate);
  const setError = useUpdateStore((state) => state.setError);
  const setDownloadProgress = useUpdateStore((state) => state.setDownloadProgress);

  const checkForUpdate = useCallback(async () => {
    setStatus("checking");
    setError(null);

    try {
      const updateResult = await check();
      setLastUpdateCheck(Date.now());

      if (updateResult) {
        setStatus("available");
        setUpdate(updateResult);
        setError(null);
        setDownloadProgress(0);
      } else {
        setStatus("idle");
        setUpdate(null);
        setError(null);
        setDownloadProgress(0);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setStatus("error");
      setUpdate(null);
      setError(errorMessage || "Failed to check for updates");
      setDownloadProgress(0);
    }
  }, [setLastUpdateCheck, setStatus, setUpdate, setError, setDownloadProgress]);

  const downloadAndInstall = useCallback(async () => {
    if (!update) return;

    setStatus("downloading");
    setDownloadProgress(0);

    try {
      let downloaded = 0;
      let contentLength = 0;

      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case "Started":
            contentLength = event.data.contentLength ?? 0;
            break;
          case "Progress":
            downloaded += event.data.chunkLength;
            if (contentLength > 0) {
              const progress = Math.round((downloaded / contentLength) * 100);
              setDownloadProgress(progress);
            }
            break;
          case "Finished":
            setStatus("ready");
            setDownloadProgress(100);
            break;
        }
      });
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to download update");
    }
  }, [update, setStatus, setDownloadProgress, setError]);

  const restart = useCallback(async () => {
    await relaunch();
  }, []);

  // Check for updates on startup if enabled
  useEffect(() => {
    // Skip in non-Tauri environment (e.g., tests)
    if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
      return;
    }

    if (autoUpdateEnabled && !startupCheckScheduled) {
      startupCheckScheduled = true;
      // Small delay to not block app startup
      setTimeout(() => {
        checkForUpdate();
      }, 3000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoUpdateEnabled]);

  return {
    status,
    update,
    error,
    downloadProgress,
    checkForUpdate,
    downloadAndInstall,
    restart,
  };
}
