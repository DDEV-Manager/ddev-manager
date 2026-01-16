import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { invoke } from "@tauri-apps/api/core";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useGetLogs, useStopLogs } from "./useLogs";
import { setupInvokeMock } from "@/test/mocks";

vi.mock("@tauri-apps/api/core");
vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

function createWrapper() {
  const queryClient = createTestQueryClient();
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useLogs hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useGetLogs", () => {
    it("should call get_logs with correct parameters", async () => {
      const mockProcessId = "logs-12345";
      setupInvokeMock(vi.mocked(invoke), {
        get_logs: mockProcessId,
      });

      const { result } = renderHook(() => useGetLogs(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        project: "my-project",
        service: "web",
        follow: false,
        timestamps: false,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invoke).toHaveBeenCalledWith("get_logs", {
        project: "my-project",
        service: "web",
        follow: false,
        tail: 100,
        timestamps: false,
      });
      expect(result.current.data).toBe(mockProcessId);
    });

    it("should call get_logs with follow mode enabled", async () => {
      const mockProcessId = "logs-12346";
      setupInvokeMock(vi.mocked(invoke), {
        get_logs: mockProcessId,
      });

      const { result } = renderHook(() => useGetLogs(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        project: "my-project",
        service: "db",
        follow: true,
        timestamps: true,
        tail: 50,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invoke).toHaveBeenCalledWith("get_logs", {
        project: "my-project",
        service: "db",
        follow: true,
        tail: 50,
        timestamps: true,
      });
    });

    it("should use default tail value of 100", async () => {
      setupInvokeMock(vi.mocked(invoke), {
        get_logs: "logs-12347",
      });

      const { result } = renderHook(() => useGetLogs(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        project: "my-project",
        service: "web",
        follow: false,
        timestamps: false,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invoke).toHaveBeenCalledWith("get_logs", expect.objectContaining({ tail: 100 }));
    });

    it("should handle error when fetching logs", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("Failed to get logs"));

      const { result } = renderHook(() => useGetLogs(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        project: "my-project",
        service: "web",
        follow: false,
        timestamps: false,
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeInstanceOf(Error);
    });
  });

  describe("useStopLogs", () => {
    it("should call cancel_command with process ID", async () => {
      setupInvokeMock(vi.mocked(invoke), {
        cancel_command: undefined,
      });

      const { result } = renderHook(() => useStopLogs(), {
        wrapper: createWrapper(),
      });

      result.current.mutate("logs-12345");

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invoke).toHaveBeenCalledWith("cancel_command", {
        processId: "logs-12345",
      });
    });

    it("should handle error when stopping logs", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("Failed to stop logs"));

      const { result } = renderHook(() => useStopLogs(), {
        wrapper: createWrapper(),
      });

      result.current.mutate("invalid-process-id");

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeInstanceOf(Error);
    });
  });
});
