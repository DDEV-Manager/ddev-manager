import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { shortcutRegistry } from "./registry";

describe("shortcutRegistry", () => {
  beforeEach(() => {
    shortcutRegistry.clear();

    // Mock navigator.platform for consistent test behavior
    Object.defineProperty(window, "navigator", {
      value: { platform: "MacIntel" },
      writable: true,
    });
  });

  afterEach(() => {
    shortcutRegistry.clear();
  });

  describe("register", () => {
    it("should register a shortcut", () => {
      const action = vi.fn();
      shortcutRegistry.register({
        id: "test-shortcut",
        key: "i",
        modifierKey: true,
        description: "Test shortcut",
        action,
      });

      expect(shortcutRegistry.getAll()).toHaveLength(1);
      expect(shortcutRegistry.getAll()[0].id).toBe("test-shortcut");
    });

    it("should warn when overwriting an existing shortcut", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      shortcutRegistry.register({
        id: "first",
        key: "i",
        modifierKey: true,
        description: "First",
        action: vi.fn(),
      });

      shortcutRegistry.register({
        id: "second",
        key: "i",
        modifierKey: true,
        description: "Second",
        action: vi.fn(),
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Keyboard shortcut conflict")
      );

      consoleSpy.mockRestore();
    });
  });

  describe("unregister", () => {
    it("should unregister a shortcut by id", () => {
      shortcutRegistry.register({
        id: "test",
        key: "i",
        description: "Test",
        action: vi.fn(),
      });

      expect(shortcutRegistry.getAll()).toHaveLength(1);

      shortcutRegistry.unregister("test");

      expect(shortcutRegistry.getAll()).toHaveLength(0);
    });

    it("should do nothing when unregistering non-existent id", () => {
      shortcutRegistry.unregister("non-existent");
      expect(shortcutRegistry.getAll()).toHaveLength(0);
    });
  });

  describe("findByKey", () => {
    it("should find shortcut by key event with modifier", () => {
      const action = vi.fn();
      shortcutRegistry.register({
        id: "test",
        key: "i",
        modifierKey: true,
        description: "Test",
        action,
      });

      const event = new KeyboardEvent("keydown", {
        key: "i",
        metaKey: true, // Mac Cmd key
      });

      const found = shortcutRegistry.findByKey(event);
      expect(found).toBeDefined();
      expect(found?.id).toBe("test");
    });

    it("should not find shortcut when modifier is missing", () => {
      shortcutRegistry.register({
        id: "test",
        key: "i",
        modifierKey: true,
        description: "Test",
        action: vi.fn(),
      });

      const event = new KeyboardEvent("keydown", {
        key: "i",
        metaKey: false,
      });

      expect(shortcutRegistry.findByKey(event)).toBeUndefined();
    });

    it("should find shortcut without modifier when none required", () => {
      shortcutRegistry.register({
        id: "test",
        key: "Escape",
        description: "Test",
        action: vi.fn(),
      });

      const event = new KeyboardEvent("keydown", { key: "Escape" });

      const found = shortcutRegistry.findByKey(event);
      expect(found).toBeDefined();
      expect(found?.id).toBe("test");
    });

    it("should find shortcut with shift modifier", () => {
      shortcutRegistry.register({
        id: "test",
        key: "k",
        modifierKey: true,
        shiftKey: true,
        description: "Test",
        action: vi.fn(),
      });

      const event = new KeyboardEvent("keydown", {
        key: "k",
        metaKey: true,
        shiftKey: true,
      });

      const found = shortcutRegistry.findByKey(event);
      expect(found).toBeDefined();
    });

    it("should not find shortcut when enabled returns false", () => {
      shortcutRegistry.register({
        id: "test",
        key: "i",
        modifierKey: true,
        description: "Test",
        action: vi.fn(),
        enabled: () => false,
      });

      const event = new KeyboardEvent("keydown", {
        key: "i",
        metaKey: true,
      });

      expect(shortcutRegistry.findByKey(event)).toBeUndefined();
    });

    it("should find shortcut when enabled returns true", () => {
      shortcutRegistry.register({
        id: "test",
        key: "i",
        modifierKey: true,
        description: "Test",
        action: vi.fn(),
        enabled: () => true,
      });

      const event = new KeyboardEvent("keydown", {
        key: "i",
        metaKey: true,
      });

      expect(shortcutRegistry.findByKey(event)).toBeDefined();
    });

    it("should match keys case-insensitively", () => {
      shortcutRegistry.register({
        id: "test",
        key: "I", // uppercase
        modifierKey: true,
        description: "Test",
        action: vi.fn(),
      });

      const event = new KeyboardEvent("keydown", {
        key: "i", // lowercase
        metaKey: true,
      });

      expect(shortcutRegistry.findByKey(event)).toBeDefined();
    });
  });

  describe("getAll", () => {
    it("should return all registered shortcuts", () => {
      shortcutRegistry.register({
        id: "first",
        key: "i",
        description: "First",
        action: vi.fn(),
      });

      shortcutRegistry.register({
        id: "second",
        key: "k",
        description: "Second",
        action: vi.fn(),
      });

      const all = shortcutRegistry.getAll();
      expect(all).toHaveLength(2);
      expect(all.map((s) => s.id)).toContain("first");
      expect(all.map((s) => s.id)).toContain("second");
    });
  });

  describe("clear", () => {
    it("should remove all shortcuts", () => {
      shortcutRegistry.register({
        id: "test",
        key: "i",
        description: "Test",
        action: vi.fn(),
      });

      shortcutRegistry.clear();

      expect(shortcutRegistry.getAll()).toHaveLength(0);
    });
  });
});
