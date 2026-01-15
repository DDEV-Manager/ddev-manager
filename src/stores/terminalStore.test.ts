import { describe, it, expect, beforeEach } from "vitest";
import { useTerminalStore } from "./terminalStore";

describe("useTerminalStore", () => {
  beforeEach(() => {
    // Reset store to initial state
    const store = useTerminalStore.getState();
    store.close();
    store.setAutoOpen(true);
  });

  describe("initial state", () => {
    it("should start closed", () => {
      expect(useTerminalStore.getState().isOpen).toBe(false);
    });

    it("should have autoOpen enabled by default", () => {
      expect(useTerminalStore.getState().autoOpen).toBe(true);
    });
  });

  describe("open/close", () => {
    it("should open the terminal", () => {
      const { open } = useTerminalStore.getState();
      open();
      expect(useTerminalStore.getState().isOpen).toBe(true);
    });

    it("should close the terminal", () => {
      const { open, close } = useTerminalStore.getState();
      open();
      close();
      expect(useTerminalStore.getState().isOpen).toBe(false);
    });
  });

  describe("toggle", () => {
    it("should toggle from closed to open", () => {
      const { toggle } = useTerminalStore.getState();
      toggle();
      expect(useTerminalStore.getState().isOpen).toBe(true);
    });

    it("should toggle from open to closed", () => {
      const { open, toggle } = useTerminalStore.getState();
      open();
      toggle();
      expect(useTerminalStore.getState().isOpen).toBe(false);
    });

    it("should toggle multiple times correctly", () => {
      const { toggle } = useTerminalStore.getState();
      toggle(); // open
      toggle(); // closed
      toggle(); // open
      expect(useTerminalStore.getState().isOpen).toBe(true);
    });
  });

  describe("autoOpen", () => {
    it("should disable autoOpen", () => {
      const { setAutoOpen } = useTerminalStore.getState();
      setAutoOpen(false);
      expect(useTerminalStore.getState().autoOpen).toBe(false);
    });

    it("should enable autoOpen", () => {
      const { setAutoOpen } = useTerminalStore.getState();
      setAutoOpen(false);
      setAutoOpen(true);
      expect(useTerminalStore.getState().autoOpen).toBe(true);
    });
  });
});
