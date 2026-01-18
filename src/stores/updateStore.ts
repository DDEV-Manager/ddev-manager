import { create } from "zustand";
import type { Update } from "@tauri-apps/plugin-updater";

export type UpdateStatus = "idle" | "checking" | "available" | "downloading" | "ready" | "error";

interface UpdateState {
  status: UpdateStatus;
  update: Update | null;
  error: string | null;
  downloadProgress: number;
}

interface UpdateActions {
  setStatus: (status: UpdateStatus) => void;
  setUpdate: (update: Update | null) => void;
  setError: (error: string | null) => void;
  setDownloadProgress: (progress: number) => void;
  reset: () => void;
}

const initialState: UpdateState = {
  status: "idle",
  update: null,
  error: null,
  downloadProgress: 0,
};

export const useUpdateStore = create<UpdateState & UpdateActions>()((set) => ({
  ...initialState,

  setStatus: (status) => set({ status }),
  setUpdate: (update) => set({ update }),
  setError: (error) => set({ error }),
  setDownloadProgress: (progress) => set({ downloadProgress: progress }),
  reset: () => set(initialState),
}));
