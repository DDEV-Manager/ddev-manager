export interface KeyboardShortcut {
  /** Unique identifier for the shortcut */
  id: string;

  /** The key to listen for (e.g., 'i', 'k', 'Escape') */
  key: string;

  /** Description for documentation/accessibility */
  description: string;

  /** Whether Cmd/Ctrl modifier is required */
  modifierKey?: boolean;

  /** Whether Shift modifier is required */
  shiftKey?: boolean;

  /** Whether Alt/Option modifier is required */
  altKey?: boolean;

  /** Action to execute when shortcut is triggered */
  action: () => void;

  /** Optional condition - shortcut only fires when this returns true */
  enabled?: () => boolean;

  /** Prevent default browser behavior (defaults to true for modifier shortcuts) */
  preventDefault?: boolean;
}

export interface ShortcutRegistry {
  shortcuts: Map<string, KeyboardShortcut>;
  register: (shortcut: KeyboardShortcut) => void;
  unregister: (id: string) => void;
  getAll: () => KeyboardShortcut[];
  findByKey: (event: KeyboardEvent) => KeyboardShortcut | undefined;
}
