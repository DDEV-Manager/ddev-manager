import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { useToastStore, toast } from "./toastStore";

describe("useToastStore", () => {
  beforeEach(() => {
    // Reset store to initial state
    useToastStore.getState().clearToasts();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("initial state", () => {
    it("should start with empty toasts array", () => {
      expect(useToastStore.getState().toasts).toEqual([]);
    });
  });

  describe("addToast", () => {
    it("should add a toast to the array", () => {
      const { addToast } = useToastStore.getState();
      addToast({ type: "success", title: "Test Toast" });

      const toasts = useToastStore.getState().toasts;
      expect(toasts).toHaveLength(1);
      expect(toasts[0].type).toBe("success");
      expect(toasts[0].title).toBe("Test Toast");
      expect(toasts[0].exiting).toBe(false);
    });

    it("should add toast with message", () => {
      const { addToast } = useToastStore.getState();
      addToast({ type: "info", title: "Title", message: "Description" });

      const toasts = useToastStore.getState().toasts;
      expect(toasts[0].message).toBe("Description");
    });

    it("should generate unique ids", () => {
      const { addToast } = useToastStore.getState();
      addToast({ type: "success", title: "First" });
      addToast({ type: "error", title: "Second" });

      const toasts = useToastStore.getState().toasts;
      expect(toasts[0].id).not.toBe(toasts[1].id);
    });

    it("should auto-dismiss after default duration", () => {
      const { addToast } = useToastStore.getState();
      addToast({ type: "success", title: "Auto dismiss" });

      expect(useToastStore.getState().toasts).toHaveLength(1);

      // Fast forward past default duration (5000ms) + animation (200ms)
      vi.advanceTimersByTime(5200);

      expect(useToastStore.getState().toasts).toHaveLength(0);
    });

    it("should use custom duration", () => {
      const { addToast } = useToastStore.getState();
      addToast({ type: "success", title: "Custom", duration: 1000 });

      vi.advanceTimersByTime(1000);
      // Should be marked as exiting
      expect(useToastStore.getState().toasts[0]?.exiting).toBe(true);

      vi.advanceTimersByTime(200);
      expect(useToastStore.getState().toasts).toHaveLength(0);
    });

    it("should not auto-dismiss when duration is 0", () => {
      const { addToast } = useToastStore.getState();
      addToast({ type: "success", title: "Persistent", duration: 0 });

      vi.advanceTimersByTime(10000);

      expect(useToastStore.getState().toasts).toHaveLength(1);
    });
  });

  describe("dismissToast", () => {
    it("should mark toast as exiting", () => {
      const { addToast, dismissToast } = useToastStore.getState();
      addToast({ type: "success", title: "Test", duration: 0 });

      const toastId = useToastStore.getState().toasts[0].id;
      dismissToast(toastId);

      expect(useToastStore.getState().toasts[0].exiting).toBe(true);
    });

    it("should remove toast after animation duration", () => {
      const { addToast, dismissToast } = useToastStore.getState();
      addToast({ type: "success", title: "Test", duration: 0 });

      const toastId = useToastStore.getState().toasts[0].id;
      dismissToast(toastId);

      expect(useToastStore.getState().toasts).toHaveLength(1);

      vi.advanceTimersByTime(200);

      expect(useToastStore.getState().toasts).toHaveLength(0);
    });
  });

  describe("removeToast", () => {
    it("should immediately remove toast by id", () => {
      const { addToast, removeToast } = useToastStore.getState();
      addToast({ type: "success", title: "Test", duration: 0 });

      const toastId = useToastStore.getState().toasts[0].id;
      removeToast(toastId);

      expect(useToastStore.getState().toasts).toHaveLength(0);
    });

    it("should only remove specified toast", () => {
      const { addToast, removeToast } = useToastStore.getState();
      addToast({ type: "success", title: "First", duration: 0 });
      addToast({ type: "error", title: "Second", duration: 0 });

      const firstId = useToastStore.getState().toasts[0].id;
      removeToast(firstId);

      const toasts = useToastStore.getState().toasts;
      expect(toasts).toHaveLength(1);
      expect(toasts[0].title).toBe("Second");
    });
  });

  describe("clearToasts", () => {
    it("should remove all toasts", () => {
      const { addToast, clearToasts } = useToastStore.getState();
      addToast({ type: "success", title: "First", duration: 0 });
      addToast({ type: "error", title: "Second", duration: 0 });
      addToast({ type: "info", title: "Third", duration: 0 });

      clearToasts();

      expect(useToastStore.getState().toasts).toHaveLength(0);
    });
  });

  describe("toast helper", () => {
    it("should create success toast", () => {
      toast.success("Success!", "It worked");

      const toasts = useToastStore.getState().toasts;
      expect(toasts[0].type).toBe("success");
      expect(toasts[0].title).toBe("Success!");
      expect(toasts[0].message).toBe("It worked");
    });

    it("should create error toast with longer duration", () => {
      toast.error("Error!", "Something failed");

      const toasts = useToastStore.getState().toasts;
      expect(toasts[0].type).toBe("error");

      // Error should not dismiss after 5s (default)
      vi.advanceTimersByTime(5200);
      expect(useToastStore.getState().toasts).toHaveLength(1);

      // Should dismiss after 8s
      vi.advanceTimersByTime(3000);
      expect(useToastStore.getState().toasts).toHaveLength(0);
    });

    it("should create info toast", () => {
      toast.info("Info");

      expect(useToastStore.getState().toasts[0].type).toBe("info");
    });

    it("should create warning toast", () => {
      toast.warning("Warning");

      expect(useToastStore.getState().toasts[0].type).toBe("warning");
    });
  });
});
