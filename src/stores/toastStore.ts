import { create } from "zustand";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  exiting?: boolean;
}

interface ToastState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id" | "exiting">) => void;
  dismissToast: (id: string) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

let toastId = 0;
const EXIT_ANIMATION_DURATION = 200;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  addToast: (toast) => {
    const id = `toast-${++toastId}`;
    const duration = toast.duration ?? 5000;

    set((state) => ({
      toasts: [...state.toasts, { ...toast, id, exiting: false }],
    }));

    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => {
        get().dismissToast(id);
      }, duration);
    }
  },
  dismissToast: (id) => {
    // Mark as exiting to trigger exit animation
    set((state) => ({
      toasts: state.toasts.map((t) => (t.id === id ? { ...t, exiting: true } : t)),
    }));

    // Remove after animation completes
    setTimeout(() => {
      get().removeToast(id);
    }, EXIT_ANIMATION_DURATION);
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
  clearToasts: () => set({ toasts: [] }),
}));

// Helper function for easy toast creation
export const toast = {
  success: (title: string, message?: string) =>
    useToastStore.getState().addToast({ type: "success", title, message }),
  error: (title: string, message?: string) =>
    useToastStore.getState().addToast({ type: "error", title, message, duration: 8000 }),
  info: (title: string, message?: string) =>
    useToastStore.getState().addToast({ type: "info", title, message }),
  warning: (title: string, message?: string) =>
    useToastStore.getState().addToast({ type: "warning", title, message }),
};
