import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { invoke } from "@tauri-apps/api/core";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useProjects,
  useProject,
  useDdevInstalled,
  useDdevVersion,
  useStartProject,
  useStopProject,
  useRestartProject,
  usePoweroff,
  useOpenUrl,
  useOpenFolder,
  useCreateSnapshot,
  useRestoreSnapshot,
  queryKeys,
} from "./useDdev";
import { setupInvokeMock, createMockProjectBasic, createMockProjectDetails } from "@/test/mocks";

vi.mock("@tauri-apps/api/core");

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

describe("useDdev hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("queryKeys", () => {
    it("should generate correct query keys", () => {
      expect(queryKeys.projects).toEqual(["projects"]);
      expect(queryKeys.project("test")).toEqual(["project", "test"]);
      expect(queryKeys.ddevInstalled).toEqual(["ddev-installed"]);
      expect(queryKeys.ddevVersion).toEqual(["ddev-version"]);
      expect(queryKeys.snapshots("my-project")).toEqual(["snapshots", "my-project"]);
    });
  });

  describe("useProjects", () => {
    it("should fetch projects successfully", async () => {
      const mockProjects = [
        createMockProjectBasic({ name: "project-1" }),
        createMockProjectBasic({ name: "project-2", status: "stopped" }),
      ];

      setupInvokeMock(vi.mocked(invoke), {
        list_projects: mockProjects,
      });

      const { result } = renderHook(() => useProjects(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toHaveLength(2);
      expect(result.current.data?.[0].name).toBe("project-1");
    });

    it("should handle fetch error", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("Failed to list projects"));

      const { result } = renderHook(() => useProjects(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeInstanceOf(Error);
    });
  });

  describe("useProject", () => {
    it("should fetch project details when name is provided", async () => {
      const mockDetails = createMockProjectDetails({ name: "my-project" });

      setupInvokeMock(vi.mocked(invoke), {
        describe_project: mockDetails,
      });

      const { result } = renderHook(() => useProject("my-project"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.name).toBe("my-project");
      expect(result.current.data?.php_version).toBe("8.2");
    });

    it("should not fetch when name is null", async () => {
      const { result } = renderHook(() => useProject(null), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
      expect(invoke).not.toHaveBeenCalled();
    });
  });

  describe("useDdevInstalled", () => {
    it("should return true when DDEV is installed", async () => {
      setupInvokeMock(vi.mocked(invoke), {
        check_ddev_installed: true,
      });

      const { result } = renderHook(() => useDdevInstalled(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toBe(true);
    });

    it("should return false when DDEV is not installed", async () => {
      setupInvokeMock(vi.mocked(invoke), {
        check_ddev_installed: false,
      });

      const { result } = renderHook(() => useDdevInstalled(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toBe(false);
    });
  });

  describe("useDdevVersion", () => {
    it("should return DDEV version string", async () => {
      setupInvokeMock(vi.mocked(invoke), {
        get_ddev_version: "v1.23.0",
      });

      const { result } = renderHook(() => useDdevVersion(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toBe("v1.23.0");
    });
  });

  describe("useStartProject", () => {
    it("should call start_project command", async () => {
      setupInvokeMock(vi.mocked(invoke), {
        start_project: undefined,
      });

      const { result } = renderHook(() => useStartProject(), {
        wrapper: createWrapper(),
      });

      result.current.mutate("my-project");

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invoke).toHaveBeenCalledWith("start_project", {
        name: "my-project",
      });
    });
  });

  describe("useStopProject", () => {
    it("should call stop_project command", async () => {
      setupInvokeMock(vi.mocked(invoke), {
        stop_project: undefined,
      });

      const { result } = renderHook(() => useStopProject(), {
        wrapper: createWrapper(),
      });

      result.current.mutate("my-project");

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invoke).toHaveBeenCalledWith("stop_project", {
        name: "my-project",
      });
    });
  });

  describe("useRestartProject", () => {
    it("should call restart_project command", async () => {
      setupInvokeMock(vi.mocked(invoke), {
        restart_project: undefined,
      });

      const { result } = renderHook(() => useRestartProject(), {
        wrapper: createWrapper(),
      });

      result.current.mutate("my-project");

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invoke).toHaveBeenCalledWith("restart_project", {
        name: "my-project",
      });
    });
  });

  describe("usePoweroff", () => {
    it("should call poweroff command", async () => {
      setupInvokeMock(vi.mocked(invoke), {
        poweroff: undefined,
      });

      const { result } = renderHook(() => usePoweroff(), {
        wrapper: createWrapper(),
      });

      result.current.mutate();

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invoke).toHaveBeenCalledWith("poweroff");
    });
  });

  describe("useOpenUrl", () => {
    it("should call open_project_url command", async () => {
      setupInvokeMock(vi.mocked(invoke), {
        open_project_url: undefined,
      });

      const { result } = renderHook(() => useOpenUrl(), {
        wrapper: createWrapper(),
      });

      result.current.mutate("https://my-project.ddev.site");

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invoke).toHaveBeenCalledWith("open_project_url", {
        url: "https://my-project.ddev.site",
      });
    });
  });

  describe("useOpenFolder", () => {
    it("should call open_project_folder command", async () => {
      setupInvokeMock(vi.mocked(invoke), {
        open_project_folder: undefined,
      });

      const { result } = renderHook(() => useOpenFolder(), {
        wrapper: createWrapper(),
      });

      result.current.mutate("/home/user/projects/my-project");

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invoke).toHaveBeenCalledWith("open_project_folder", {
        path: "/home/user/projects/my-project",
      });
    });
  });

  describe("useCreateSnapshot", () => {
    it("should call create_snapshot command without name", async () => {
      setupInvokeMock(vi.mocked(invoke), {
        create_snapshot: "snapshot-20240101-120000",
      });

      const { result } = renderHook(() => useCreateSnapshot(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ project: "my-project" });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invoke).toHaveBeenCalledWith("create_snapshot", {
        project: "my-project",
        name: undefined,
      });
    });

    it("should call create_snapshot command with name", async () => {
      setupInvokeMock(vi.mocked(invoke), {
        create_snapshot: "my-snapshot",
      });

      const { result } = renderHook(() => useCreateSnapshot(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ project: "my-project", name: "my-snapshot" });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invoke).toHaveBeenCalledWith("create_snapshot", {
        project: "my-project",
        name: "my-snapshot",
      });
    });
  });

  describe("useRestoreSnapshot", () => {
    it("should call restore_snapshot command", async () => {
      setupInvokeMock(vi.mocked(invoke), {
        restore_snapshot: "Snapshot restored successfully",
      });

      const { result } = renderHook(() => useRestoreSnapshot(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ project: "my-project", snapshot: "my-snapshot" });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invoke).toHaveBeenCalledWith("restore_snapshot", {
        project: "my-project",
        snapshot: "my-snapshot",
      });
    });
  });
});
