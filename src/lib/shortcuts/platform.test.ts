import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { detectPlatform, isMac, getModifierKey, getModifierDisplay } from "./platform";

describe("platform detection", () => {
  let originalNavigator: Navigator;

  beforeEach(() => {
    originalNavigator = window.navigator;
  });

  afterEach(() => {
    // Restore navigator
    Object.defineProperty(window, "navigator", {
      value: originalNavigator,
      writable: true,
    });
  });

  function mockNavigator(platform: string, userAgentData?: { platform: string }) {
    Object.defineProperty(window, "navigator", {
      value: {
        platform,
        userAgentData,
      },
      writable: true,
    });
  }

  describe("detectPlatform", () => {
    it("should detect macOS from navigator.platform", () => {
      mockNavigator("MacIntel");
      expect(detectPlatform()).toBe("mac");
    });

    it("should detect macOS from navigator.platform (lowercase)", () => {
      mockNavigator("macintel");
      expect(detectPlatform()).toBe("mac");
    });

    it("should detect Windows from navigator.platform", () => {
      mockNavigator("Win32");
      expect(detectPlatform()).toBe("windows");
    });

    it("should detect Linux from navigator.platform", () => {
      mockNavigator("Linux x86_64");
      expect(detectPlatform()).toBe("linux");
    });

    it("should default to linux for unknown platforms", () => {
      mockNavigator("Unknown");
      expect(detectPlatform()).toBe("linux");
    });

    it("should prefer userAgentData over platform when available", () => {
      mockNavigator("Linux", { platform: "macOS" });
      expect(detectPlatform()).toBe("mac");
    });

    it("should detect Windows from userAgentData", () => {
      mockNavigator("Linux", { platform: "Windows" });
      expect(detectPlatform()).toBe("windows");
    });
  });

  describe("isMac", () => {
    it("should return true on macOS", () => {
      mockNavigator("MacIntel");
      expect(isMac()).toBe(true);
    });

    it("should return false on Windows", () => {
      mockNavigator("Win32");
      expect(isMac()).toBe(false);
    });

    it("should return false on Linux", () => {
      mockNavigator("Linux");
      expect(isMac()).toBe(false);
    });
  });

  describe("getModifierKey", () => {
    it("should return metaKey on macOS", () => {
      mockNavigator("MacIntel");
      expect(getModifierKey()).toBe("metaKey");
    });

    it("should return ctrlKey on Windows", () => {
      mockNavigator("Win32");
      expect(getModifierKey()).toBe("ctrlKey");
    });

    it("should return ctrlKey on Linux", () => {
      mockNavigator("Linux");
      expect(getModifierKey()).toBe("ctrlKey");
    });
  });

  describe("getModifierDisplay", () => {
    it("should return ⌘ on macOS", () => {
      mockNavigator("MacIntel");
      expect(getModifierDisplay()).toBe("\u2318");
    });

    it("should return Ctrl on Windows", () => {
      mockNavigator("Win32");
      expect(getModifierDisplay()).toBe("Ctrl");
    });

    it("should return Ctrl on Linux", () => {
      mockNavigator("Linux");
      expect(getModifierDisplay()).toBe("Ctrl");
    });
  });
});
