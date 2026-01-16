import type { KeyboardShortcut, ShortcutRegistry } from "./types";
import { getModifierKey } from "./platform";

/**
 * Creates a unique key for matching keyboard events to shortcuts.
 * Format: [modifiers]-[key]
 */
function createMatchKey(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];
  if (shortcut.modifierKey) parts.push("mod");
  if (shortcut.shiftKey) parts.push("shift");
  if (shortcut.altKey) parts.push("alt");
  parts.push(shortcut.key.toLowerCase());
  return parts.join("-");
}

/**
 * Creates a match key from a keyboard event.
 */
function eventToMatchKey(event: KeyboardEvent): string {
  const parts: string[] = [];
  const modKey = getModifierKey();

  if (event[modKey]) parts.push("mod");
  if (event.shiftKey) parts.push("shift");
  if (event.altKey) parts.push("alt");
  parts.push(event.key.toLowerCase());

  return parts.join("-");
}

/**
 * Global shortcut registry singleton.
 * Manages all registered keyboard shortcuts.
 */
class ShortcutRegistryImpl implements ShortcutRegistry {
  shortcuts = new Map<string, KeyboardShortcut>();
  private matchKeyToId = new Map<string, string>();

  register(shortcut: KeyboardShortcut): void {
    const matchKey = createMatchKey(shortcut);

    // Warn if overwriting an existing shortcut
    if (this.matchKeyToId.has(matchKey)) {
      console.warn(
        `Keyboard shortcut conflict: "${shortcut.id}" is overwriting ` +
          `"${this.matchKeyToId.get(matchKey)}" for key combination "${matchKey}"`
      );
    }

    this.shortcuts.set(shortcut.id, shortcut);
    this.matchKeyToId.set(matchKey, shortcut.id);
  }

  unregister(id: string): void {
    const shortcut = this.shortcuts.get(id);
    if (shortcut) {
      const matchKey = createMatchKey(shortcut);
      this.matchKeyToId.delete(matchKey);
      this.shortcuts.delete(id);
    }
  }

  getAll(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  findByKey(event: KeyboardEvent): KeyboardShortcut | undefined {
    const matchKey = eventToMatchKey(event);
    const id = this.matchKeyToId.get(matchKey);

    if (!id) return undefined;

    const shortcut = this.shortcuts.get(id);

    // Check if shortcut is enabled
    if (shortcut?.enabled && !shortcut.enabled()) {
      return undefined;
    }

    return shortcut;
  }

  clear(): void {
    this.shortcuts.clear();
    this.matchKeyToId.clear();
  }
}

// Singleton instance
export const shortcutRegistry = new ShortcutRegistryImpl();
