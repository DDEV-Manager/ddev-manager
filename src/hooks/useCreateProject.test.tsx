import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { invoke } from "@tauri-apps/api/core";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useSelectFolder,
  useCheckFolderEmpty,
  useCheckComposerInstalled,
  useCheckWpCliInstalled,
  useCreateProject,
  CreateProjectConfig,
} from "./useCreateProject";
import { setupInvokeMock } from "@/test/mocks";
import { useTerminalStore } from "@/stores/terminalStore";

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

describe("useCreateProject hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset terminal store state
    useTerminalStore.setState({
      isOpen: false,
      autoOpen: false,
    });
  });

  describe("useSelectFolder", () => {
    it("should call select_folder command", async () => {
      setupInvokeMock(vi.mocked(invoke), {
        select_folder: "/home/user/projects/new-project",
      });

      const { result } = renderHook(() => useSelectFolder(), {
        wrapper: createWrapper(),
      });

      result.current.mutate();

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invoke).toHaveBeenCalledWith("select_folder");
      expect(result.current.data).toBe("/home/user/projects/new-project");
    });

    it("should return null when dialog is cancelled", async () => {
      setupInvokeMock(vi.mocked(invoke), {
        select_folder: null,
      });

      const { result } = renderHook(() => useSelectFolder(), {
        wrapper: createWrapper(),
      });

      result.current.mutate();

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toBeNull();
    });

    it("should handle errors", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("Dialog failed"));

      const { result } = renderHook(() => useSelectFolder(), {
        wrapper: createWrapper(),
      });

      result.current.mutate();

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeInstanceOf(Error);
    });
  });

  describe("useCheckFolderEmpty", () => {
    it("should return true for empty folder", async () => {
      setupInvokeMock(vi.mocked(invoke), {
        check_folder_empty: true,
      });

      const { result } = renderHook(() => useCheckFolderEmpty(), {
        wrapper: createWrapper(),
      });

      result.current.mutate("/home/user/projects/empty-folder");

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invoke).toHaveBeenCalledWith("check_folder_empty", {
        path: "/home/user/projects/empty-folder",
      });
      expect(result.current.data).toBe(true);
    });

    it("should return false for non-empty folder", async () => {
      setupInvokeMock(vi.mocked(invoke), {
        check_folder_empty: false,
      });

      const { result } = renderHook(() => useCheckFolderEmpty(), {
        wrapper: createWrapper(),
      });

      result.current.mutate("/home/user/projects/existing-project");

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toBe(false);
    });

    it("should handle errors", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("Not a directory"));

      const { result } = renderHook(() => useCheckFolderEmpty(), {
        wrapper: createWrapper(),
      });

      result.current.mutate("/some/invalid/path");

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe("useCheckComposerInstalled", () => {
    it("should return true when composer is installed", async () => {
      setupInvokeMock(vi.mocked(invoke), {
        check_composer_installed: true,
      });

      const { result } = renderHook(() => useCheckComposerInstalled(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invoke).toHaveBeenCalledWith("check_composer_installed");
      expect(result.current.data).toBe(true);
    });

    it("should return false when composer is not installed", async () => {
      setupInvokeMock(vi.mocked(invoke), {
        check_composer_installed: false,
      });

      const { result } = renderHook(() => useCheckComposerInstalled(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toBe(false);
    });
  });

  describe("useCheckWpCliInstalled", () => {
    it("should return true when WP-CLI is installed", async () => {
      setupInvokeMock(vi.mocked(invoke), {
        check_wpcli_installed: true,
      });

      const { result } = renderHook(() => useCheckWpCliInstalled(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invoke).toHaveBeenCalledWith("check_wpcli_installed");
      expect(result.current.data).toBe(true);
    });

    it("should return false when WP-CLI is not installed", async () => {
      setupInvokeMock(vi.mocked(invoke), {
        check_wpcli_installed: false,
      });

      const { result } = renderHook(() => useCheckWpCliInstalled(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toBe(false);
    });
  });

  describe("useCreateProject", () => {
    const basicConfig: CreateProjectConfig = {
      path: "/home/user/projects/new-project",
      name: "new-project",
      projectType: "drupal10",
      autoStart: true,
    };

    it("should call create_project with basic config", async () => {
      setupInvokeMock(vi.mocked(invoke), {
        create_project: undefined,
      });

      const { result } = renderHook(() => useCreateProject(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(basicConfig);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invoke).toHaveBeenCalledWith("create_project", {
        path: "/home/user/projects/new-project",
        name: "new-project",
        projectType: "drupal10",
        phpVersion: null,
        database: null,
        webserver: null,
        docroot: null,
        autoStart: true,
        cmsInstall: null,
      });
    });

    it("should call create_project with full config", async () => {
      setupInvokeMock(vi.mocked(invoke), {
        create_project: undefined,
      });

      const { result } = renderHook(() => useCreateProject(), {
        wrapper: createWrapper(),
      });

      const fullConfig: CreateProjectConfig = {
        path: "/home/user/projects/drupal-site",
        name: "drupal-site",
        projectType: "drupal11",
        phpVersion: "8.3",
        database: "mariadb:10.11",
        webserver: "nginx-fpm",
        docroot: "web",
        autoStart: false,
        cmsInstall: {
          type: "composer",
          package: "drupal/cms",
        },
      };

      result.current.mutate(fullConfig);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invoke).toHaveBeenCalledWith("create_project", {
        path: "/home/user/projects/drupal-site",
        name: "drupal-site",
        projectType: "drupal11",
        phpVersion: "8.3",
        database: "mariadb:10.11",
        webserver: "nginx-fpm",
        docroot: "web",
        autoStart: false,
        cmsInstall: JSON.stringify({ type: "composer", package: "drupal/cms" }),
      });
    });

    it("should call create_project with WordPress CMS install", async () => {
      setupInvokeMock(vi.mocked(invoke), {
        create_project: undefined,
      });

      const { result } = renderHook(() => useCreateProject(), {
        wrapper: createWrapper(),
      });

      const wpConfig: CreateProjectConfig = {
        path: "/home/user/projects/wp-site",
        name: "wp-site",
        projectType: "wordpress",
        autoStart: true,
        cmsInstall: {
          type: "wordpress",
        },
      };

      result.current.mutate(wpConfig);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invoke).toHaveBeenCalledWith("create_project", {
        path: "/home/user/projects/wp-site",
        name: "wp-site",
        projectType: "wordpress",
        phpVersion: null,
        database: null,
        webserver: null,
        docroot: null,
        autoStart: true,
        cmsInstall: JSON.stringify({ type: "wordpress" }),
      });
    });

    it("should open terminal when autoOpen is enabled", async () => {
      setupInvokeMock(vi.mocked(invoke), {
        create_project: undefined,
      });

      // Enable autoOpen
      useTerminalStore.setState({ autoOpen: true, isOpen: false });

      const { result } = renderHook(() => useCreateProject(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(basicConfig);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Terminal should have been opened
      expect(useTerminalStore.getState().isOpen).toBe(true);
    });

    it("should not open terminal when autoOpen is disabled", async () => {
      setupInvokeMock(vi.mocked(invoke), {
        create_project: undefined,
      });

      // Ensure autoOpen is disabled
      useTerminalStore.setState({ autoOpen: false, isOpen: false });

      const { result } = renderHook(() => useCreateProject(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(basicConfig);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Terminal should remain closed
      expect(useTerminalStore.getState().isOpen).toBe(false);
    });

    it("should handle create_project errors", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("DDEV config failed"));

      const { result } = renderHook(() => useCreateProject(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(basicConfig);

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeInstanceOf(Error);
    });
  });
});
