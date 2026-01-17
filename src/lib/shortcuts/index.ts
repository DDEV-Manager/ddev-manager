export { shortcutRegistry } from "./registry";
export { detectPlatform, isMac, getModifierKey, getModifierDisplay } from "./platform";
export type { Platform } from "./platform";
export type { KeyboardShortcut, ShortcutRegistry } from "./types";

import { shortcutRegistry } from "./registry";
import type { KeyboardShortcut } from "./types";

/**
 * Default application shortcuts.
 * These are registered when initializeDefaultShortcuts() is called.
 */
export const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
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
