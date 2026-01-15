import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBar } from "./StatusBar";
import { useStatusStore } from "@/stores/statusStore";

// Mock Tauri event listener
vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

describe("StatusBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useStatusStore.getState().clear();
  });

  describe("visibility", () => {
    it("should not render when not running and not exiting", () => {
      const { container } = render(<StatusBar />);
      expect(container.firstChild).toBeNull();
    });

    it("should render when running", () => {
      useStatusStore.getState().setRunning("start", "my-project");

      render(<StatusBar />);

      expect(screen.getByText("Starting")).toBeInTheDocument();
      expect(screen.getByText("(my-project)")).toBeInTheDocument();
    });

    it("should render when exiting", () => {
      useStatusStore.setState({ isRunning: true, exiting: true, command: "stop", project: "test" });

      render(<StatusBar />);

      expect(screen.getByText("Stopping")).toBeInTheDocument();
    });
  });

  describe("command formatting", () => {
    it("should format start command", () => {
      useStatusStore.getState().setRunning("start", "project");
      render(<StatusBar />);
      expect(screen.getByText("Starting")).toBeInTheDocument();
    });

    it("should format stop command", () => {
      useStatusStore.getState().setRunning("stop", "project");
      render(<StatusBar />);
      expect(screen.getByText("Stopping")).toBeInTheDocument();
    });

    it("should format restart command", () => {
      useStatusStore.getState().setRunning("restart", "project");
      render(<StatusBar />);
      expect(screen.getByText("Restarting")).toBeInTheDocument();
    });

    it("should format config command", () => {
      useStatusStore.getState().setRunning("config", "project");
      render(<StatusBar />);
      expect(screen.getByText("Configuring")).toBeInTheDocument();
    });

    it("should format delete command", () => {
      useStatusStore.getState().setRunning("delete", "project");
      render(<StatusBar />);
      expect(screen.getByText("Removing")).toBeInTheDocument();
    });

    it("should format poweroff command", () => {
      useStatusStore.getState().setRunning("poweroff", "all");
      render(<StatusBar />);
      expect(screen.getByText("Powering off")).toBeInTheDocument();
    });

    it("should format addon-install command", () => {
      useStatusStore.getState().setRunning("addon-install", "project");
      render(<StatusBar />);
      expect(screen.getByText("Installing addon")).toBeInTheDocument();
    });

    it("should format addon-remove command", () => {
      useStatusStore.getState().setRunning("addon-remove", "project");
      render(<StatusBar />);
      expect(screen.getByText("Removing addon")).toBeInTheDocument();
    });

    it("should use command name for unknown commands", () => {
      useStatusStore.getState().setRunning("custom-command", "project");
      render(<StatusBar />);
      expect(screen.getByText("custom-command")).toBeInTheDocument();
    });
  });

  describe("project display", () => {
    it("should show project name in parentheses", () => {
      useStatusStore.getState().setRunning("start", "my-project");
      render(<StatusBar />);
      expect(screen.getByText("(my-project)")).toBeInTheDocument();
    });

    it("should not show project name for 'all'", () => {
      useStatusStore.getState().setRunning("poweroff", "all");
      render(<StatusBar />);
      expect(screen.queryByText("(all)")).not.toBeInTheDocument();
    });
  });

  describe("last line display", () => {
    it("should show 'Starting...' when no last line", () => {
      useStatusStore.getState().setRunning("start", "project");
      render(<StatusBar />);
      expect(screen.getByText("Starting...")).toBeInTheDocument();
    });

    it("should show last line when available", () => {
      useStatusStore.getState().setRunning("start", "project");
      useStatusStore.getState().setLastLine("Downloading images...");
      render(<StatusBar />);
      expect(screen.getByText("Downloading images...")).toBeInTheDocument();
    });
  });

  describe("animation classes", () => {
    it("should have slide-in animation when not exiting", () => {
      useStatusStore.setState({ isRunning: true, exiting: false, command: "start", project: "p" });
      render(<StatusBar />);

      const statusBar = screen.getByText("Starting").closest("div[class*='fixed']");
      expect(statusBar).toHaveClass("animate-in");
      expect(statusBar).toHaveClass("slide-in-from-bottom");
    });

    it("should have slide-out animation when exiting", () => {
      useStatusStore.setState({ isRunning: true, exiting: true, command: "start", project: "p" });
      render(<StatusBar />);

      const statusBar = screen.getByText("Starting").closest("div[class*='fixed']");
      expect(statusBar).toHaveClass("animate-out");
      expect(statusBar).toHaveClass("slide-out-to-bottom");
    });
  });
});
