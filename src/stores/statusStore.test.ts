import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { useStatusStore } from "./statusStore";

describe("useStatusStore", () => {
  beforeEach(() => {
    // Reset store to initial state
    useStatusStore.getState().clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("initial state", () => {
    it("should start not running", () => {
      expect(useStatusStore.getState().isRunning).toBe(false);
    });

    it("should have null command", () => {
      expect(useStatusStore.getState().command).toBeNull();
    });

    it("should have null project", () => {
      expect(useStatusStore.getState().project).toBeNull();
    });

    it("should have null lastLine", () => {
      expect(useStatusStore.getState().lastLine).toBeNull();
    });

    it("should not be exiting", () => {
      expect(useStatusStore.getState().exiting).toBe(false);
    });
  });

  describe("setRunning", () => {
    it("should set running state with command and project", () => {
      const { setRunning } = useStatusStore.getState();
      setRunning("start", "my-project");

      const state = useStatusStore.getState();
      expect(state.isRunning).toBe(true);
      expect(state.command).toBe("start");
      expect(state.project).toBe("my-project");
      expect(state.exiting).toBe(false);
    });

    it("should reset lastLine when starting new command", () => {
      const { setRunning, setLastLine } = useStatusStore.getState();
      setLastLine("previous line");
      setRunning("config", "test-project");

      expect(useStatusStore.getState().lastLine).toBeNull();
    });
  });

  describe("setLastLine", () => {
    it("should update the last line", () => {
      const { setLastLine } = useStatusStore.getState();
      setLastLine("Installing dependencies...");

      expect(useStatusStore.getState().lastLine).toBe("Installing dependencies...");
    });

    it("should overwrite previous last line", () => {
      const { setLastLine } = useStatusStore.getState();
      setLastLine("First line");
      setLastLine("Second line");

      expect(useStatusStore.getState().lastLine).toBe("Second line");
    });
  });

  describe("setFinished", () => {
    it("should set exiting to true", () => {
      const { setRunning, setFinished } = useStatusStore.getState();
      setRunning("start", "project");
      setFinished();

      expect(useStatusStore.getState().exiting).toBe(true);
    });

    it("should clear state after animation duration", () => {
      const { setRunning, setFinished } = useStatusStore.getState();
      setRunning("start", "project");
      setFinished();

      // State should still show exiting
      expect(useStatusStore.getState().exiting).toBe(true);
      expect(useStatusStore.getState().isRunning).toBe(true);

      // After animation duration (300ms)
      vi.advanceTimersByTime(300);

      const state = useStatusStore.getState();
      expect(state.isRunning).toBe(false);
      expect(state.exiting).toBe(false);
      expect(state.command).toBeNull();
      expect(state.project).toBeNull();
    });
  });

  describe("clear", () => {
    it("should reset all state to initial values", () => {
      const { setRunning, setLastLine, clear } = useStatusStore.getState();
      setRunning("config", "test");
      setLastLine("some output");
      clear();

      const state = useStatusStore.getState();
      expect(state.isRunning).toBe(false);
      expect(state.command).toBeNull();
      expect(state.project).toBeNull();
      expect(state.lastLine).toBeNull();
      expect(state.exiting).toBe(false);
    });
  });
});
