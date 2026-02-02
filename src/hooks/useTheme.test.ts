import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { invoke } from "@tauri-apps/api/core";
import { useTheme } from "./useTheme";
import { useAppStore } from "@/stores/appStore";

// Mock Tauri invoke
vi.mock("@tauri-apps/api/core");

describe("useTheme", () => {
  let originalMatchMedia: typeof window.matchMedia;
  let mockMediaQueryList: {
    matches: boolean;
    addEventListener: ReturnType<typeof vi.fn>;
    removeEventListener: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    // Mock invoke to return resolved promise
    vi.mocked(invoke).mockResolvedValue(undefined);

    // Reset app store
    useAppStore.setState({ theme: "light", zoom: 100 });

    // Save original matchMedia
    originalMatchMedia = window.matchMedia;

    // Create mock media query list
    mockMediaQueryList = {
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    // Mock matchMedia
    window.matchMedia = vi.fn().mockReturnValue(mockMediaQueryList);

    // Clear document classes and styles
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "";
    document.documentElement.style.removeProperty("--zoom");
  });

  afterEach(() => {
    // Restore original matchMedia
    window.matchMedia = originalMatchMedia;
  });

  describe("theme application", () => {
    it("should apply light theme by default", () => {
      useAppStore.setState({ theme: "light" });

      renderHook(() => useTheme());

      expect(document.documentElement.classList.contains("dark")).toBe(false);
      expect(document.documentElement.style.colorScheme).toBe("light");
    });

    it("should apply dark theme when set to dark", () => {
      useAppStore.setState({ theme: "dark" });

      renderHook(() => useTheme());

      expect(document.documentElement.classList.contains("dark")).toBe(true);
      expect(document.documentElement.style.colorScheme).toBe("dark");
    });

    it("should follow system preference when set to system (light)", () => {
      mockMediaQueryList.matches = false; // System prefers light
      useAppStore.setState({ theme: "system" });

      renderHook(() => useTheme());

      expect(document.documentElement.classList.contains("dark")).toBe(false);
      expect(document.documentElement.style.colorScheme).toBe("light");
    });

    it("should follow system preference when set to system (dark)", () => {
      mockMediaQueryList.matches = true; // System prefers dark
      useAppStore.setState({ theme: "system" });

      renderHook(() => useTheme());

      expect(document.documentElement.classList.contains("dark")).toBe(true);
      expect(document.documentElement.style.colorScheme).toBe("dark");
    });
  });

  describe("system theme listener", () => {
    it("should add event listener when theme is system", () => {
      useAppStore.setState({ theme: "system" });

      renderHook(() => useTheme());

      expect(mockMediaQueryList.addEventListener).toHaveBeenCalledWith(
        "change",
        expect.any(Function)
      );
    });

    it("should not add event listener when theme is light", () => {
      useAppStore.setState({ theme: "light" });

      renderHook(() => useTheme());

      expect(mockMediaQueryList.addEventListener).not.toHaveBeenCalled();
    });

    it("should not add event listener when theme is dark", () => {
      useAppStore.setState({ theme: "dark" });

      renderHook(() => useTheme());

      expect(mockMediaQueryList.addEventListener).not.toHaveBeenCalled();
    });

    it("should remove event listener on cleanup when theme is system", () => {
      useAppStore.setState({ theme: "system" });

      const { unmount } = renderHook(() => useTheme());
      unmount();

      expect(mockMediaQueryList.removeEventListener).toHaveBeenCalledWith(
        "change",
        expect.any(Function)
      );
    });
  });

  describe("theme switching", () => {
    it("should update when theme changes from light to dark", () => {
      useAppStore.setState({ theme: "light" });

      const { rerender } = renderHook(() => useTheme());

      expect(document.documentElement.classList.contains("dark")).toBe(false);

      act(() => {
        useAppStore.setState({ theme: "dark" });
      });
      rerender();

      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it("should update when theme changes from dark to light", () => {
      useAppStore.setState({ theme: "dark" });

      const { rerender } = renderHook(() => useTheme());

      expect(document.documentElement.classList.contains("dark")).toBe(true);

      act(() => {
        useAppStore.setState({ theme: "light" });
      });
      rerender();

      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });
  });

  describe("zoom application", () => {
    it("should set --zoom CSS variable to 1 for 100%", () => {
      useAppStore.setState({ zoom: 100 });

      renderHook(() => useTheme());

      expect(document.documentElement.style.getPropertyValue("--zoom")).toBe("1");
    });

    it("should set --zoom CSS variable to 0.8 for 80%", () => {
      useAppStore.setState({ zoom: 80 });

      renderHook(() => useTheme());

      expect(document.documentElement.style.getPropertyValue("--zoom")).toBe("0.8");
    });

    it("should set --zoom CSS variable to 1.2 for 120%", () => {
      useAppStore.setState({ zoom: 120 });

      renderHook(() => useTheme());

      expect(document.documentElement.style.getPropertyValue("--zoom")).toBe("1.2");
    });

    it("should update zoom when value changes", () => {
      useAppStore.setState({ zoom: 100 });

      const { rerender } = renderHook(() => useTheme());

      expect(document.documentElement.style.getPropertyValue("--zoom")).toBe("1");

      act(() => {
        useAppStore.setState({ zoom: 150 });
      });
      rerender();

      expect(document.documentElement.style.getPropertyValue("--zoom")).toBe("1.5");
    });
  });
});
