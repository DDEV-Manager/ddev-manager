import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StatusBar } from "./StatusBar";
import { useStatusStore } from "@/stores/statusStore";

// Mock Tauri event listener
vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

const defaultProps = {
  onToggleTerminal: vi.fn(),
  isTerminalOpen: false,
};

describe("StatusBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useStatusStore.getState().clear();
  });

  describe("visibility", () => {
    it("should always render", () => {
      render(<StatusBar {...defaultProps} />);
      expect(screen.getByText("Output")).toBeInTheDocument();
      expect(screen.getByText("Ready")).toBeInTheDocument();
    });

    it("should show running status when command is running", () => {
      useStatusStore.getState().setRunning("start", "my-project");

      render(<StatusBar {...defaultProps} />);

      expect(screen.getByText("Starting")).toBeInTheDocument();
      expect(screen.getByText("(my-project)")).toBeInTheDocument();
    });
  });

  describe("terminal toggle", () => {
    it("should call onToggleTerminal when terminal button is clicked", async () => {
      const onToggleTerminal = vi.fn();
      render(<StatusBar {...defaultProps} onToggleTerminal={onToggleTerminal} />);

      await userEvent.click(screen.getByText("Output"));

      expect(onToggleTerminal).toHaveBeenCalledTimes(1);
    });

    it("should show different style when terminal is open", () => {
      render(<StatusBar {...defaultProps} isTerminalOpen={true} />);

      const button = screen.getByText("Output").closest("button");
      expect(button).toHaveClass("bg-primary-100");
    });
  });

  describe("command formatting", () => {
    it("should format start command", () => {
      useStatusStore.getState().setRunning("start", "project");
      render(<StatusBar {...defaultProps} />);
      expect(screen.getByText("Starting")).toBeInTheDocument();
    });

    it("should format stop command", () => {
      useStatusStore.getState().setRunning("stop", "project");
      render(<StatusBar {...defaultProps} />);
      expect(screen.getByText("Stopping")).toBeInTheDocument();
    });

    it("should format restart command", () => {
      useStatusStore.getState().setRunning("restart", "project");
      render(<StatusBar {...defaultProps} />);
      expect(screen.getByText("Restarting")).toBeInTheDocument();
    });

    it("should format config command", () => {
      useStatusStore.getState().setRunning("config", "project");
      render(<StatusBar {...defaultProps} />);
      expect(screen.getByText("Configuring")).toBeInTheDocument();
    });

    it("should format delete command", () => {
      useStatusStore.getState().setRunning("delete", "project");
      render(<StatusBar {...defaultProps} />);
      expect(screen.getByText("Removing")).toBeInTheDocument();
    });

    it("should format poweroff command", () => {
      useStatusStore.getState().setRunning("poweroff", "all");
      render(<StatusBar {...defaultProps} />);
      expect(screen.getByText("Powering off")).toBeInTheDocument();
    });

    it("should format addon-install command", () => {
      useStatusStore.getState().setRunning("addon-install", "project");
      render(<StatusBar {...defaultProps} />);
      expect(screen.getByText("Installing addon")).toBeInTheDocument();
    });

    it("should format addon-remove command", () => {
      useStatusStore.getState().setRunning("addon-remove", "project");
      render(<StatusBar {...defaultProps} />);
      expect(screen.getByText("Removing addon")).toBeInTheDocument();
    });

    it("should use command name for unknown commands", () => {
      useStatusStore.getState().setRunning("custom-command", "project");
      render(<StatusBar {...defaultProps} />);
      expect(screen.getByText("custom-command")).toBeInTheDocument();
    });
  });

  describe("project display", () => {
    it("should show project name in parentheses", () => {
      useStatusStore.getState().setRunning("start", "my-project");
      render(<StatusBar {...defaultProps} />);
      expect(screen.getByText("(my-project)")).toBeInTheDocument();
    });

    it("should not show project name for 'all'", () => {
      useStatusStore.getState().setRunning("poweroff", "all");
      render(<StatusBar {...defaultProps} />);
      expect(screen.queryByText("(all)")).not.toBeInTheDocument();
    });
  });

  describe("last line display", () => {
    it("should show 'Starting...' when no last line", () => {
      useStatusStore.getState().setRunning("start", "project");
      render(<StatusBar {...defaultProps} />);
      expect(screen.getByText("Starting...")).toBeInTheDocument();
    });

    it("should show last line when available", () => {
      useStatusStore.getState().setRunning("start", "project");
      useStatusStore.getState().setLastLine("Downloading images...");
      render(<StatusBar {...defaultProps} />);
      expect(screen.getByText("Downloading images...")).toBeInTheDocument();
    });
  });

  describe("idle state", () => {
    it("should show Ready when not running", () => {
      render(<StatusBar {...defaultProps} />);
      expect(screen.getByText("Ready")).toBeInTheDocument();
    });

    it("should not show progress bar when idle", () => {
      const { container } = render(<StatusBar {...defaultProps} />);
      expect(container.querySelector(".animate-progress")).not.toBeInTheDocument();
    });

    it("should show progress bar when running", () => {
      useStatusStore.getState().setRunning("start", "project");
      const { container } = render(<StatusBar {...defaultProps} />);
      expect(container.querySelector(".animate-progress")).toBeInTheDocument();
    });
  });
});
