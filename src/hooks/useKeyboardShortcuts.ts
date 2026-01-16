import { useEffect, useCallback } from "react";
import { shortcutRegistry } from "@/lib/shortcuts/registry";

/**
 * Hook that initializes global keyboard shortcut handling.
 * Should be called once at the app root level (in App.tsx).
 */
export function useKeyboardShortcuts(): void {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Skip if user is typing in an input/textarea
    const target = event.target as HTMLElement;
    const isInputElement =
      target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

    // Find matching shortcut
    const shortcut = shortcutRegistry.findByKey(event);

    if (!shortcut) return;

    // For shortcuts with modifiers, allow even in input fields
    // For shortcuts without modifiers (like Escape), skip input fields
    if (!shortcut.modifierKey && isInputElement) {
      return;
    }

    // Prevent default if specified (defaults to true for modifier shortcuts)
    if (shortcut.preventDefault ?? shortcut.modifierKey) {
      event.preventDefault();
    }

    // Execute the action
    shortcut.action();
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
