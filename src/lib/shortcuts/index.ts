export { shortcutRegistry } from "./registry";
export { detectPlatform, isMac, getModifierKey, getModifierDisplay } from "./platform";
export type { Platform } from "./platform";
export type { KeyboardShortcut, ShortcutRegistry } from "./types";

import { shortcutRegistry } from "./registry";
import { useChatStore } from "@/stores/chatStore";
import { useAppStore } from "@/stores/appStore";
import type { KeyboardShortcut } from "./types";

/**
 * Default application shortcuts.
 * These are registered when initializeDefaultShortcuts() is called.
 */
export const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  {
    id: "toggle-chat",
    key: "i",
    modifierKey: true,
    description: "Toggle AI chat sidebar",
    action: () => {
      const chatStore = useChatStore.getState();
      chatStore.toggle();
    },
    enabled: () => useAppStore.getState().experimentalChat,
    preventDefault: true,
  },
  // Future shortcuts can be added here:
  // {
  //   id: 'toggle-terminal',
  //   key: 't',
  //   modifierKey: true,
  //   description: 'Toggle terminal panel',
  //   action: () => useTerminalStore.getState().toggle(),
  // },
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
