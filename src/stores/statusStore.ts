import { create } from "zustand";

interface StatusState {
  isRunning: boolean;
  command: string | null;
  project: string | null;
  lastLine: string | null;
  exiting: boolean;
  processId: string | null;
  setRunning: (command: string, project: string, processId?: string) => void;
  setLastLine: (line: string) => void;
  setFinished: () => void;
  setCancelled: () => void;
  clear: () => void;
}

const EXIT_ANIMATION_DURATION = 300;

export const useStatusStore = create<StatusState>((set, get) => ({
  isRunning: false,
  command: null,
  project: null,
  lastLine: null,
  exiting: false,
  processId: null,

  setRunning: (command, project, processId) =>
    set({
      isRunning: true,
      command,
      project,
      lastLine: null,
      exiting: false,
      processId: processId ?? null,
    }),

  setLastLine: (line) => set({ lastLine: line }),

  setFinished: () => {
    // Start exit animation
    set({ exiting: true });

    // Clear after animation
    setTimeout(() => {
      get().clear();
    }, EXIT_ANIMATION_DURATION);
  },

  setCancelled: () => {
    // Start exit animation
    set({ exiting: true });

    // Clear after animation
    setTimeout(() => {
      get().clear();
    }, EXIT_ANIMATION_DURATION);
  },

  clear: () =>
    set({
      isRunning: false,
      command: null,
      project: null,
      lastLine: null,
      exiting: false,
      processId: null,
    }),
}));
