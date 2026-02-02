export { shortcutRegistry } from "./registry";
export { detectPlatform, isMac, getModifierKey, getModifierDisplay } from "./platform";
export type { Platform } from "./platform";
export type { KeyboardShortcut, ShortcutRegistry } from "./types";

import { shortcutRegistry } from "./registry";
import type { KeyboardShortcut } from "./types";
import { useAppStore } from "@/stores/appStore";

const ZOOM_STEP = 10;

/**
 * Default application shortcuts.
 * These are registered when initializeDefaultShortcuts() is called.
 */
export const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  // Zoom in: Cmd/Ctrl + =
  {
    id: "zoom-in",
    key: "=",
    modifierKey: true,
    description: "Zoom in",
    action: () => {
      const { zoom, setZoom } = useAppStore.getState();
      setZoom(zoom + ZOOM_STEP);
    },
    preventDefault: true,
  },
  // Zoom out: Cmd/Ctrl + -
  {
    id: "zoom-out",
    key: "-",
    modifierKey: true,
    description: "Zoom out",
    action: () => {
      const { zoom, setZoom } = useAppStore.getState();
      setZoom(zoom - ZOOM_STEP);
    },
    preventDefault: true,
  },
  // Reset zoom: Cmd/Ctrl + 0
  {
    id: "zoom-reset",
    key: "0",
    modifierKey: true,
    description: "Reset zoom to 100%",
    action: () => {
      useAppStore.getState().setZoom(100);
    },
    preventDefault: true,
  },
];

let initialized = false;

/**
 * Register all default application shortcuts.
 * Call this once during app initialization.
 */
export function initializeDefaultShortcuts(): void {
  if (initialized) return;

  DEFAULT_SHORTCUTS.forEach((shortcut) => {
    shortcutRegistry.register(shortcut);
  });

  initialized = true;
}

// Extend Window interface for global menu handlers
declare global {
  interface Window {
    __ZOOM_IN?: () => void;
    __ZOOM_OUT?: () => void;
    __ZOOM_RESET?: () => void;
    __SET_THEME?: (theme: "light" | "dark" | "system") => void;
  }
}

/**
 * Initialize global handlers for native menu integration.
 * These are called from Tauri's native menu via window.eval().
 */
export function initializeMenuZoomHandlers(): void {
  window.__ZOOM_IN = () => {
    const { zoom, setZoom } = useAppStore.getState();
    setZoom(zoom + ZOOM_STEP);
  };

  window.__ZOOM_OUT = () => {
    const { zoom, setZoom } = useAppStore.getState();
    setZoom(zoom - ZOOM_STEP);
  };

  window.__ZOOM_RESET = () => {
    useAppStore.getState().setZoom(100);
  };

  window.__SET_THEME = (theme: "light" | "dark" | "system") => {
    useAppStore.getState().setTheme(theme);
  };
}
