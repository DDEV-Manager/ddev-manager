import { describe, it, expect, beforeEach } from "vitest";
import { useUpdateStore } from "./updateStore";

describe("updateStore", () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useUpdateStore.getState().reset();
  });

  describe("initial state", () => {
    it("should have correct initial values", () => {
      const state = useUpdateStore.getState();

      expect(state.status).toBe("idle");
      expect(state.update).toBeNull();
      expect(state.error).toBeNull();
      expect(state.downloadProgress).toBe(0);
    });
  });

  describe("setStatus", () => {
    it("should update status to checking", () => {
      useUpdateStore.getState().setStatus("checking");
      expect(useUpdateStore.getState().status).toBe("checking");
    });

    it("should update status to available", () => {
      useUpdateStore.getState().setStatus("available");
      expect(useUpdateStore.getState().status).toBe("available");
    });

    it("should update status to downloading", () => {
      useUpdateStore.getState().setStatus("downloading");
      expect(useUpdateStore.getState().status).toBe("downloading");
    });

    it("should update status to ready", () => {
      useUpdateStore.getState().setStatus("ready");
      expect(useUpdateStore.getState().status).toBe("ready");
    });

    it("should update status to error", () => {
      useUpdateStore.getState().setStatus("error");
      expect(useUpdateStore.getState().status).toBe("error");
    });
  });

  describe("setUpdate", () => {
    it("should set update object", () => {
      const mockUpdate = { version: "1.0.0" } as never;
      useUpdateStore.getState().setUpdate(mockUpdate);
      expect(useUpdateStore.getState().update).toBe(mockUpdate);
    });

    it("should set update to null", () => {
      const mockUpdate = { version: "1.0.0" } as never;
      useUpdateStore.getState().setUpdate(mockUpdate);
      useUpdateStore.getState().setUpdate(null);
      expect(useUpdateStore.getState().update).toBeNull();
    });
  });

  describe("setError", () => {
    it("should set error message", () => {
      useUpdateStore.getState().setError("Something went wrong");
      expect(useUpdateStore.getState().error).toBe("Something went wrong");
    });

    it("should clear error", () => {
      useUpdateStore.getState().setError("Something went wrong");
      useUpdateStore.getState().setError(null);
      expect(useUpdateStore.getState().error).toBeNull();
    });
  });

  describe("setDownloadProgress", () => {
    it("should set download progress to 0", () => {
      useUpdateStore.getState().setDownloadProgress(0);
      expect(useUpdateStore.getState().downloadProgress).toBe(0);
    });

    it("should set download progress to 50", () => {
      useUpdateStore.getState().setDownloadProgress(50);
      expect(useUpdateStore.getState().downloadProgress).toBe(50);
    });

    it("should set download progress to 100", () => {
      useUpdateStore.getState().setDownloadProgress(100);
      expect(useUpdateStore.getState().downloadProgress).toBe(100);
    });
  });

  describe("reset", () => {
    it("should reset all values to initial state", () => {
      // Set various state values
      useUpdateStore.getState().setStatus("downloading");
      useUpdateStore.getState().setUpdate({ version: "1.0.0" } as never);
      useUpdateStore.getState().setError("Some error");
      useUpdateStore.getState().setDownloadProgress(75);

      // Reset
      useUpdateStore.getState().reset();

      // Verify initial state
      const state = useUpdateStore.getState();
      expect(state.status).toBe("idle");
      expect(state.update).toBeNull();
      expect(state.error).toBeNull();
      expect(state.downloadProgress).toBe(0);
    });
  });

  describe("state transitions", () => {
    it("should handle typical update flow: idle -> checking -> available -> downloading -> ready", () => {
      const store = useUpdateStore.getState();

      // Initial
      expect(useUpdateStore.getState().status).toBe("idle");

      // Start check
      store.setStatus("checking");
      expect(useUpdateStore.getState().status).toBe("checking");

      // Update found
      store.setStatus("available");
      store.setUpdate({ version: "2.0.0" } as never);
      expect(useUpdateStore.getState().status).toBe("available");
      expect(useUpdateStore.getState().update).toBeTruthy();

      // Start download
      store.setStatus("downloading");
      store.setDownloadProgress(0);
      expect(useUpdateStore.getState().status).toBe("downloading");

      // Progress
      store.setDownloadProgress(50);
      expect(useUpdateStore.getState().downloadProgress).toBe(50);

      // Complete
      store.setStatus("ready");
      store.setDownloadProgress(100);
      expect(useUpdateStore.getState().status).toBe("ready");
      expect(useUpdateStore.getState().downloadProgress).toBe(100);
    });

    it("should handle error during check: idle -> checking -> error", () => {
      const store = useUpdateStore.getState();

      store.setStatus("checking");
      store.setStatus("error");
      store.setError("Network error");

      expect(useUpdateStore.getState().status).toBe("error");
      expect(useUpdateStore.getState().error).toBe("Network error");
    });

    it("should handle no update available: idle -> checking -> idle", () => {
      const store = useUpdateStore.getState();

      store.setStatus("checking");
      store.setStatus("idle");

      expect(useUpdateStore.getState().status).toBe("idle");
      expect(useUpdateStore.getState().update).toBeNull();
    });
  });
});
