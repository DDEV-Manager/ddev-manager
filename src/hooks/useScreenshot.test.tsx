import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { invoke } from "@tauri-apps/api/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useScreenshotPath,
  useScreenshotData,
  useCaptureScreenshot,
  useDeleteScreenshot,
  screenshotQueryKeys,
} from "./useScreenshot";
import { setupInvokeMock } from "@/test/mocks";

vi.mock("@tauri-apps/api/core");

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useScreenshot hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("screenshotQueryKeys", () => {
    it("should generate correct query key for project", () => {
      const key = screenshotQueryKeys.path("my-project");
      expect(key).toEqual(["screenshot", "my-project"]);
    });
  });

  describe("useScreenshotPath", () => {
    it("should return screenshot path when project exists", async () => {
      setupInvokeMock(vi.mocked(invoke), {
        get_screenshot_path: "/path/to/screenshot.png",
      });

      const { result } = renderHook(() => useScreenshotPath("my-project"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBe("/path/to/screenshot.png");
      expect(invoke).toHaveBeenCalledWith("get_screenshot_path", {
        projectName: "my-project",
      });
    });

    it("should return null when no screenshot exists", async () => {
      setupInvokeMock(vi.mocked(invoke), {
        get_screenshot_path: null,
      });

      const { result } = renderHook(() => useScreenshotPath("my-project"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeNull();
    });

    it("should not fetch when projectName is null", () => {
      const { result } = renderHook(() => useScreenshotPath(null), {
        wrapper: createWrapper(),
      });

      expect(invoke).not.toHaveBeenCalled();
      expect(result.current.fetchStatus).toBe("idle");
    });
  });

  describe("useScreenshotData", () => {
    it("should return screenshot data as base64", async () => {
      const base64Data = "data:image/png;base64,iVBORw0KGgo...";
      setupInvokeMock(vi.mocked(invoke), {
        get_screenshot_data: base64Data,
      });

      const { result } = renderHook(() => useScreenshotData("my-project"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBe(base64Data);
      expect(invoke).toHaveBeenCalledWith("get_screenshot_data", {
        projectName: "my-project",
      });
    });

    it("should not fetch when projectName is null", () => {
      const { result } = renderHook(() => useScreenshotData(null), {
        wrapper: createWrapper(),
      });

      expect(invoke).not.toHaveBeenCalled();
      expect(result.current.fetchStatus).toBe("idle");
    });
  });

  describe("useCaptureScreenshot", () => {
    it("should capture screenshot successfully", async () => {
      setupInvokeMock(vi.mocked(invoke), {
        capture_screenshot: undefined,
      });

      const { result } = renderHook(() => useCaptureScreenshot(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ projectName: "my-project", url: "https://my-project.ddev.site" });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invoke).toHaveBeenCalledWith("capture_screenshot", {
        projectName: "my-project",
        url: "https://my-project.ddev.site",
      });
    });

    it("should handle capture error", async () => {
      setupInvokeMock(vi.mocked(invoke), {
        capture_screenshot: Promise.reject(new Error("Capture failed")),
      });

      const { result } = renderHook(() => useCaptureScreenshot(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ projectName: "my-project", url: "https://my-project.ddev.site" });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(new Error("Capture failed"));
    });
  });

  describe("useDeleteScreenshot", () => {
    it("should delete screenshot successfully", async () => {
      setupInvokeMock(vi.mocked(invoke), {
        delete_screenshot: undefined,
      });

      const { result } = renderHook(() => useDeleteScreenshot(), {
        wrapper: createWrapper(),
      });

      result.current.mutate("my-project");

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invoke).toHaveBeenCalledWith("delete_screenshot", {
        projectName: "my-project",
      });
    });

    it("should handle delete error", async () => {
      setupInvokeMock(vi.mocked(invoke), {
        delete_screenshot: Promise.reject(new Error("Delete failed")),
      });

      const { result } = renderHook(() => useDeleteScreenshot(), {
        wrapper: createWrapper(),
      });

      result.current.mutate("my-project");

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(new Error("Delete failed"));
    });
  });
});
