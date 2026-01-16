import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";
import { shortcutRegistry } from "@/lib/shortcuts/registry";

describe("useKeyboardShortcuts", () => {
  beforeEach(() => {
    shortcutRegistry.clear();

    // Mock navigator.platform for consistent Mac behavior
    Object.defineProperty(window, "navigator", {
      value: { platform: "MacIntel" },
      writable: true,
    });
  });

  afterEach(() => {
    shortcutRegistry.clear();
  });

  it("should call action when shortcut key is pressed", () => {
    const action = vi.fn();
    shortcutRegistry.register({
      id: "test",
      key: "i",
      modifierKey: true,
      description: "Test shortcut",
      action,
    });

    renderHook(() => useKeyboardShortcuts());

    const event = new KeyboardEvent("keydown", {
      key: "i",
      metaKey: true,
      bubbles: true,
    });
    document.dispatchEvent(event);

    expect(action).toHaveBeenCalledTimes(1);
  });

  it("should not call action when wrong key is pressed", () => {
    const action = vi.fn();
    shortcutRegistry.register({
      id: "test",
      key: "i",
      modifierKey: true,
      description: "Test shortcut",
      action,
    });

    renderHook(() => useKeyboardShortcuts());

    const event = new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true,
      bubbles: true,
    });
    document.dispatchEvent(event);

    expect(action).not.toHaveBeenCalled();
  });

  it("should not call action when modifier is missing", () => {
    const action = vi.fn();
    shortcutRegistry.register({
      id: "test",
      key: "i",
      modifierKey: true,
      description: "Test shortcut",
      action,
    });

    renderHook(() => useKeyboardShortcuts());

    const event = new KeyboardEvent("keydown", {
      key: "i",
      metaKey: false,
      bubbles: true,
    });
    document.dispatchEvent(event);

    expect(action).not.toHaveBeenCalled();
  });

  it("should call preventDefault when specified", () => {
    shortcutRegistry.register({
      id: "test",
      key: "i",
      modifierKey: true,
      description: "Test shortcut",
      action: vi.fn(),
      preventDefault: true,
    });

    renderHook(() => useKeyboardShortcuts());

    const event = new KeyboardEvent("keydown", {
      key: "i",
      metaKey: true,
      bubbles: true,
      cancelable: true,
    });
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");

    document.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it("should skip shortcuts without modifier when typing in input", () => {
    const action = vi.fn();
    shortcutRegistry.register({
      id: "test",
      key: "Escape",
      description: "Test shortcut",
      action,
    });

    renderHook(() => useKeyboardShortcuts());

    // Create an input element
    const input = document.createElement("input");
    document.body.appendChild(input);

    const event = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
    });
    Object.defineProperty(event, "target", { value: input });

    document.dispatchEvent(event);

    expect(action).not.toHaveBeenCalled();

    // Cleanup
    document.body.removeChild(input);
  });

  it("should allow shortcuts with modifier when typing in input", () => {
    const action = vi.fn();
    shortcutRegistry.register({
      id: "test",
      key: "i",
      modifierKey: true,
      description: "Test shortcut",
      action,
    });

    renderHook(() => useKeyboardShortcuts());

    // Create an input element
    const input = document.createElement("input");
    document.body.appendChild(input);

    const event = new KeyboardEvent("keydown", {
      key: "i",
      metaKey: true,
      bubbles: true,
    });
    Object.defineProperty(event, "target", { value: input });

    document.dispatchEvent(event);

    expect(action).toHaveBeenCalled();

    // Cleanup
    document.body.removeChild(input);
  });

  it("should remove event listener on unmount", () => {
    const action = vi.fn();
    shortcutRegistry.register({
      id: "test",
      key: "i",
      modifierKey: true,
      description: "Test shortcut",
      action,
    });

    const { unmount } = renderHook(() => useKeyboardShortcuts());

    unmount();

    const event = new KeyboardEvent("keydown", {
      key: "i",
      metaKey: true,
      bubbles: true,
    });
    document.dispatchEvent(event);

    expect(action).not.toHaveBeenCalled();
  });
});
