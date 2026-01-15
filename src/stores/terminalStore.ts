import { create } from "zustand";

interface TerminalState {
  isOpen: boolean;
  autoOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setAutoOpen: (autoOpen: boolean) => void;
}

export const useTerminalStore = create<TerminalState>((set) => ({
  isOpen: false,
  autoOpen: true,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  setAutoOpen: (autoOpen) => set({ autoOpen }),
}));
