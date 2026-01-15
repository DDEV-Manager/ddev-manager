import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Toaster } from "./Toaster";
import { useToastStore } from "@/stores/toastStore";

describe("Toaster", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useToastStore.getState().clearToasts();
  });

  describe("visibility", () => {
    it("should not render when there are no toasts", () => {
      const { container } = render(<Toaster />);
      expect(container.firstChild).toBeNull();
    });

    it("should render when there are toasts", () => {
      useToastStore.getState().addToast({
        type: "success",
        title: "Test Toast",
        duration: 0,
      });

      render(<Toaster />);

      expect(screen.getByText("Test Toast")).toBeInTheDocument();
    });
  });

  describe("toast types", () => {
    it("should render success toast with correct styling", () => {
      useToastStore.getState().addToast({
        type: "success",
        title: "Success!",
        duration: 0,
      });

      render(<Toaster />);

      const toast = screen.getByText("Success!").closest("div[class*='rounded-lg']");
      expect(toast).toHaveClass("bg-green-50");
    });

    it("should render error toast with correct styling", () => {
      useToastStore.getState().addToast({
        type: "error",
        title: "Error!",
        duration: 0,
      });

      render(<Toaster />);

      const toast = screen.getByText("Error!").closest("div[class*='rounded-lg']");
      expect(toast).toHaveClass("bg-red-50");
    });

    it("should render info toast with correct styling", () => {
      useToastStore.getState().addToast({
        type: "info",
        title: "Info",
        duration: 0,
      });

      render(<Toaster />);

      const toast = screen.getByText("Info").closest("div[class*='rounded-lg']");
      expect(toast).toHaveClass("bg-blue-50");
    });

    it("should render warning toast with correct styling", () => {
      useToastStore.getState().addToast({
        type: "warning",
        title: "Warning",
        duration: 0,
      });

      render(<Toaster />);

      const toast = screen.getByText("Warning").closest("div[class*='rounded-lg']");
      expect(toast).toHaveClass("bg-amber-50");
    });
  });

  describe("toast content", () => {
    it("should display title", () => {
      useToastStore.getState().addToast({
        type: "success",
        title: "Test Title",
        duration: 0,
      });

      render(<Toaster />);

      expect(screen.getByText("Test Title")).toBeInTheDocument();
    });

    it("should display message when provided", () => {
      useToastStore.getState().addToast({
        type: "success",
        title: "Test Title",
        message: "Test message content",
        duration: 0,
      });

      render(<Toaster />);

      expect(screen.getByText("Test message content")).toBeInTheDocument();
    });

    it("should not display message when not provided", () => {
      useToastStore.getState().addToast({
        type: "success",
        title: "Test Title",
        duration: 0,
      });

      render(<Toaster />);

      // Title should be present
      expect(screen.getByText("Test Title")).toBeInTheDocument();
      // No message paragraph should exist
      const toastContent = screen.getByText("Test Title").parentElement;
      expect(toastContent?.children).toHaveLength(1);
    });
  });

  describe("dismiss button", () => {
    it("should dismiss toast when clicking close button", () => {
      useToastStore.getState().addToast({
        type: "success",
        title: "Dismissable Toast",
        duration: 0,
      });

      render(<Toaster />);

      expect(screen.getByText("Dismissable Toast")).toBeInTheDocument();

      const closeButton = screen.getByRole("button");
      fireEvent.click(closeButton);

      // Toast should be marked as exiting
      const toast = useToastStore.getState().toasts[0];
      expect(toast.exiting).toBe(true);
    });
  });

  describe("multiple toasts", () => {
    it("should render multiple toasts", () => {
      useToastStore.getState().addToast({
        type: "success",
        title: "First Toast",
        duration: 0,
      });
      useToastStore.getState().addToast({
        type: "error",
        title: "Second Toast",
        duration: 0,
      });
      useToastStore.getState().addToast({
        type: "info",
        title: "Third Toast",
        duration: 0,
      });

      render(<Toaster />);

      expect(screen.getByText("First Toast")).toBeInTheDocument();
      expect(screen.getByText("Second Toast")).toBeInTheDocument();
      expect(screen.getByText("Third Toast")).toBeInTheDocument();
    });
  });

  describe("animation", () => {
    it("should have slide-in animation when not exiting", () => {
      useToastStore.getState().addToast({
        type: "success",
        title: "Animated Toast",
        duration: 0,
      });

      render(<Toaster />);

      const toast = screen.getByText("Animated Toast").closest("div[class*='rounded-lg']");
      expect(toast).toHaveClass("animate-in");
      expect(toast).toHaveClass("slide-in-from-left");
    });

    it("should have slide-out animation when exiting", () => {
      useToastStore.getState().addToast({
        type: "success",
        title: "Exiting Toast",
        duration: 0,
      });

      // Mark as exiting
      const toastId = useToastStore.getState().toasts[0].id;
      useToastStore.setState({
        toasts: useToastStore
          .getState()
          .toasts.map((t) => (t.id === toastId ? { ...t, exiting: true } : t)),
      });

      render(<Toaster />);

      const toast = screen.getByText("Exiting Toast").closest("div[class*='rounded-lg']");
      expect(toast).toHaveClass("animate-out");
      expect(toast).toHaveClass("slide-out-to-left");
    });
  });
});
