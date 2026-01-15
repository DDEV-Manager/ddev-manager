import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { invoke } from "@tauri-apps/api/core";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useInstalledAddons,
  useAddonRegistry,
  useInstallAddon,
  useRemoveAddon,
  addonQueryKeys,
} from "./useAddons";
import { setupInvokeMock } from "@/test/mocks";
import { useTerminalStore } from "@/stores/terminalStore";
import type { InstalledAddon, AddonRegistry } from "@/types/ddev";

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

const mockInstalledAddons: InstalledAddon[] = [
  { name: "redis", repository: "ddev/ddev-redis" },
  { name: "mailpit", repository: "ddev/ddev-mailpit" },
];

const mockAddonRegistry: AddonRegistry = {
  official: [
    {
      name: "redis",
      description: "Redis in-memory data store",
      repository: "ddev/ddev-redis",
      maintainer: "DDEV",
      stars: 100,
      last_updated: "2024-01-01",
    },
    {
      name: "elasticsearch",
      description: "Elasticsearch service",
      repository: "ddev/ddev-elasticsearch",
      maintainer: "DDEV",
      stars: 80,
      last_updated: "2024-01-01",
    },
  ],
  community: [
    {
      name: "varnish",
      description: "Varnish cache",
      repository: "community/ddev-varnish",
      maintainer: "Community",
      stars: 20,
      last_updated: "2024-01-01",
    },
  ],
};

describe("useAddons hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTerminalStore.setState({
      isOpen: false,
      autoOpen: false,
    });
  });

  describe("addonQueryKeys", () => {
    it("should generate correct query keys for installed addons", () => {
      expect(addonQueryKeys.installed("my-project")).toEqual(["addons", "installed", "my-project"]);
    });

    it("should generate correct query key for registry", () => {
      expect(addonQueryKeys.registry).toEqual(["addons", "registry"]);
    });
  });

  describe("useInstalledAddons", () => {
    it("should fetch installed addons for a project", async () => {
      setupInvokeMock(vi.mocked(invoke), {
        list_installed_addons: mockInstalledAddons,
      });

      const { result } = renderHook(() => useInstalledAddons("my-project"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invoke).toHaveBeenCalledWith("list_installed_addons", { project: "my-project" });
      expect(result.current.data).toHaveLength(2);
      expect(result.current.data?.[0].name).toBe("redis");
    });

    it("should not fetch when project is null", async () => {
      const { result } = renderHook(() => useInstalledAddons(null), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
      expect(invoke).not.toHaveBeenCalled();
    });

    it("should return empty array when project is null and query resolves", async () => {
      const { result } = renderHook(() => useInstalledAddons(null), {
        wrapper: createWrapper(),
      });

      // Query should be disabled
      expect(result.current.data).toBeUndefined();
    });

    it("should handle fetch error", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("Failed to list addons"));

      const { result } = renderHook(() => useInstalledAddons("my-project"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeInstanceOf(Error);
    });
  });

  describe("useAddonRegistry", () => {
    it("should fetch addon registry", async () => {
      setupInvokeMock(vi.mocked(invoke), {
        fetch_addon_registry: mockAddonRegistry,
      });

      const { result } = renderHook(() => useAddonRegistry(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invoke).toHaveBeenCalledWith("fetch_addon_registry");
      expect(result.current.data?.official).toHaveLength(2);
      expect(result.current.data?.community).toHaveLength(1);
    });

    it("should handle registry fetch error", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("Failed to fetch registry"));

      const { result } = renderHook(() => useAddonRegistry(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe("useInstallAddon", () => {
    it("should call install_addon command", async () => {
      setupInvokeMock(vi.mocked(invoke), {
        install_addon: undefined,
      });

      const { result } = renderHook(() => useInstallAddon(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ project: "my-project", addon: "redis" });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invoke).toHaveBeenCalledWith("install_addon", {
        project: "my-project",
        addon: "redis",
      });
    });

    it("should open terminal when autoOpen is enabled", async () => {
      setupInvokeMock(vi.mocked(invoke), {
        install_addon: undefined,
      });

      useTerminalStore.setState({ autoOpen: true, isOpen: false });

      const { result } = renderHook(() => useInstallAddon(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ project: "my-project", addon: "redis" });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(useTerminalStore.getState().isOpen).toBe(true);
    });

    it("should not open terminal when autoOpen is disabled", async () => {
      setupInvokeMock(vi.mocked(invoke), {
        install_addon: undefined,
      });

      useTerminalStore.setState({ autoOpen: false, isOpen: false });

      const { result } = renderHook(() => useInstallAddon(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ project: "my-project", addon: "redis" });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(useTerminalStore.getState().isOpen).toBe(false);
    });

    it("should handle install error", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("Install failed"));

      const { result } = renderHook(() => useInstallAddon(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ project: "my-project", addon: "invalid-addon" });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe("useRemoveAddon", () => {
    it("should call remove_addon command", async () => {
      setupInvokeMock(vi.mocked(invoke), {
        remove_addon: undefined,
      });

      const { result } = renderHook(() => useRemoveAddon(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ project: "my-project", addon: "redis" });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invoke).toHaveBeenCalledWith("remove_addon", {
        project: "my-project",
        addon: "redis",
      });
    });

    it("should open terminal when autoOpen is enabled", async () => {
      setupInvokeMock(vi.mocked(invoke), {
        remove_addon: undefined,
      });

      useTerminalStore.setState({ autoOpen: true, isOpen: false });

      const { result } = renderHook(() => useRemoveAddon(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ project: "my-project", addon: "redis" });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(useTerminalStore.getState().isOpen).toBe(true);
    });

    it("should not open terminal when autoOpen is disabled", async () => {
      setupInvokeMock(vi.mocked(invoke), {
        remove_addon: undefined,
      });

      useTerminalStore.setState({ autoOpen: false, isOpen: false });

      const { result } = renderHook(() => useRemoveAddon(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ project: "my-project", addon: "redis" });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(useTerminalStore.getState().isOpen).toBe(false);
    });

    it("should handle remove error", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("Remove failed"));

      const { result } = renderHook(() => useRemoveAddon(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ project: "my-project", addon: "nonexistent" });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});
