import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { DEFAULT_SHORTCUTS, shortcutRegistry } from "./index";
import { useAppStore } from "@/stores/appStore";

describe("DEFAULT_SHORTCUTS", () => {
  beforeEach(() => {
    shortcutRegistry.clear();
    useAppStore.setState({ zoom: 100 });

    // Mock navigator.platform for consistent test behavior
    Object.defineProperty(window, "navigator", {
      value: { platform: "MacIntel" },
      writable: true,
    });
  });

  afterEach(() => {
    shortcutRegistry.clear();
  });

  describe("zoom shortcuts", () => {
    it("should have zoom-in shortcut (Cmd/Ctrl + =)", () => {
      const shortcut = DEFAULT_SHORTCUTS.find((s) => s.id === "zoom-in");
      expect(shortcut).toBeDefined();
      expect(shortcut?.key).toBe("=");
      expect(shortcut?.modifierKey).toBe(true);
    });

    it("should have zoom-in-shift-plus shortcut (Cmd/Ctrl + Shift + +)", () => {
      const shortcut = DEFAULT_SHORTCUTS.find((s) => s.id === "zoom-in-shift-plus");
      expect(shortcut).toBeDefined();
      expect(shortcut?.key).toBe("+");
      expect(shortcut?.modifierKey).toBe(true);
      expect(shortcut?.shiftKey).toBe(true);
    });

    it("should have zoom-in-plus shortcut (Cmd/Ctrl + +)", () => {
      const shortcut = DEFAULT_SHORTCUTS.find((s) => s.id === "zoom-in-plus");
      expect(shortcut).toBeDefined();
      expect(shortcut?.key).toBe("+");
      expect(shortcut?.modifierKey).toBe(true);
      expect(shortcut?.shiftKey).toBeUndefined();
    });

    it("should have zoom-out shortcut (Cmd/Ctrl + -)", () => {
      const shortcut = DEFAULT_SHORTCUTS.find((s) => s.id === "zoom-out");
      expect(shortcut).toBeDefined();
      expect(shortcut?.key).toBe("-");
      expect(shortcut?.modifierKey).toBe(true);
    });

    it("should have zoom-reset shortcut (Cmd/Ctrl + 0)", () => {
      const shortcut = DEFAULT_SHORTCUTS.find((s) => s.id === "zoom-reset");
      expect(shortcut).toBeDefined();
      expect(shortcut?.key).toBe("0");
      expect(shortcut?.modifierKey).toBe(true);
    });

    it("zoom-in action should increase zoom by 10", () => {
      useAppStore.setState({ zoom: 100 });
      const shortcut = DEFAULT_SHORTCUTS.find((s) => s.id === "zoom-in");
      shortcut?.action();
      expect(useAppStore.getState().zoom).toBe(110);
    });

    it("zoom-out action should decrease zoom by 10", () => {
      useAppStore.setState({ zoom: 100 });
      const shortcut = DEFAULT_SHORTCUTS.find((s) => s.id === "zoom-out");
      shortcut?.action();
      expect(useAppStore.getState().zoom).toBe(90);
    });

    it("zoom-reset action should reset zoom to 100", () => {
      useAppStore.setState({ zoom: 150 });
      const shortcut = DEFAULT_SHORTCUTS.find((s) => s.id === "zoom-reset");
      shortcut?.action();
      expect(useAppStore.getState().zoom).toBe(100);
    });

    it("zoom should respect max limit of 200", () => {
      useAppStore.setState({ zoom: 200 });
      const shortcut = DEFAULT_SHORTCUTS.find((s) => s.id === "zoom-in");
      shortcut?.action();
      expect(useAppStore.getState().zoom).toBe(200);
    });

    it("zoom should respect min limit of 50", () => {
      useAppStore.setState({ zoom: 50 });
      const shortcut = DEFAULT_SHORTCUTS.find((s) => s.id === "zoom-out");
      shortcut?.action();
      expect(useAppStore.getState().zoom).toBe(50);
    });
  });
});

describe("zoom shortcuts in registry", () => {
  beforeEach(() => {
    shortcutRegistry.clear();

    // Mock navigator.platform for consistent test behavior
    Object.defineProperty(window, "navigator", {
      value: { platform: "MacIntel" },
      writable: true,
    });

    // Manually register default shortcuts for testing
    DEFAULT_SHORTCUTS.forEach((shortcut) => {
      shortcutRegistry.register(shortcut);
    });
  });

  afterEach(() => {
    shortcutRegistry.clear();
  });

  it("should find zoom-in with Cmd + =", () => {
    const event = new KeyboardEvent("keydown", {
      key: "=",
      metaKey: true,
    });
    const found = shortcutRegistry.findByKey(event);
    expect(found?.id).toBe("zoom-in");
  });

  it("should find zoom-in-shift-plus with Cmd + Shift + +", () => {
    const event = new KeyboardEvent("keydown", {
      key: "+",
      metaKey: true,
      shiftKey: true,
    });
    const found = shortcutRegistry.findByKey(event);
    expect(found?.id).toBe("zoom-in-shift-plus");
  });

  it("should find zoom-in-plus with Cmd + + (numpad)", () => {
    const event = new KeyboardEvent("keydown", {
      key: "+",
      metaKey: true,
      shiftKey: false,
    });
    const found = shortcutRegistry.findByKey(event);
    expect(found?.id).toBe("zoom-in-plus");
  });

  it("should find zoom-out with Cmd + -", () => {
    const event = new KeyboardEvent("keydown", {
      key: "-",
      metaKey: true,
    });
    const found = shortcutRegistry.findByKey(event);
    expect(found?.id).toBe("zoom-out");
  });

  it("should find zoom-reset with Cmd + 0", () => {
    const event = new KeyboardEvent("keydown", {
      key: "0",
      metaKey: true,
    });
    const found = shortcutRegistry.findByKey(event);
    expect(found?.id).toBe("zoom-reset");
  });
});
