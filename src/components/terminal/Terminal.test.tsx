import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { listen } from "@tauri-apps/api/event";
import { render } from "@/test/utils";
import { Terminal } from "./Terminal";

vi.mock("@tauri-apps/api/event");

describe("Terminal", () => {
  const mockOnClose = vi.fn();
  const mockOnToggle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listen).mockResolvedValue(() => {});
  });

  describe("when closed", () => {
    it("should render minimized button", () => {
      render(<Terminal isOpen={false} onClose={mockOnClose} onToggle={mockOnToggle} />);

      expect(screen.getByText("Terminal")).toBeInTheDocument();
    });

    it("should call onToggle when minimized button is clicked", async () => {
      const user = userEvent.setup();

      render(<Terminal isOpen={false} onClose={mockOnClose} onToggle={mockOnToggle} />);

      await user.click(screen.getByText("Terminal"));

      expect(mockOnToggle).toHaveBeenCalled();
    });

    it("should show running state in minimized button", async () => {
      // Simulate a command starting
      let statusCallback: ((event: unknown) => void) | null = null;

      vi.mocked(listen).mockImplementation((event, callback) => {
        if (event === "command-status") {
          statusCallback = callback as (event: unknown) => void;
        }
        return Promise.resolve(() => {});
      });

      render(<Terminal isOpen={false} onClose={mockOnClose} onToggle={mockOnToggle} />);

      // Simulate command started
      await act(async () => {
        statusCallback?.({
          payload: {
            command: "start",
            project: "my-project",
            status: "started",
            message: "Starting my-project...",
          },
        });
      });

      expect(screen.getByText(/Running: start my-project/)).toBeInTheDocument();
    });
  });

  describe("when open", () => {
    it("should render terminal panel", () => {
      render(<Terminal isOpen={true} onClose={mockOnClose} onToggle={mockOnToggle} />);

      expect(screen.getByText("Terminal")).toBeInTheDocument();
      expect(
        screen.getByText("Terminal output will appear here when running commands...")
      ).toBeInTheDocument();
    });

    it("should have close button", async () => {
      const user = userEvent.setup();

      render(<Terminal isOpen={true} onClose={mockOnClose} onToggle={mockOnToggle} />);

      await user.click(screen.getByTitle("Close"));

      expect(mockOnClose).toHaveBeenCalled();
    });

    it("should have minimize button", async () => {
      const user = userEvent.setup();

      render(<Terminal isOpen={true} onClose={mockOnClose} onToggle={mockOnToggle} />);

      await user.click(screen.getByTitle("Minimize"));

      expect(mockOnToggle).toHaveBeenCalled();
    });

    it("should have clear button", () => {
      render(<Terminal isOpen={true} onClose={mockOnClose} onToggle={mockOnToggle} />);

      expect(screen.getByTitle("Clear terminal")).toBeInTheDocument();
    });

    it("should display command output lines", async () => {
      let outputCallback: ((event: unknown) => void) | null = null;

      vi.mocked(listen).mockImplementation((event, callback) => {
        if (event === "command-output") {
          outputCallback = callback as (event: unknown) => void;
        }
        return Promise.resolve(() => {});
      });

      render(<Terminal isOpen={true} onClose={mockOnClose} onToggle={mockOnToggle} />);

      await act(async () => {
        outputCallback?.({
          payload: { line: "Starting containers...", stream: "stdout" },
        });
        outputCallback?.({
          payload: { line: "Container started", stream: "stdout" },
        });
      });

      expect(screen.getByText("Starting containers...")).toBeInTheDocument();
      expect(screen.getByText("Container started")).toBeInTheDocument();
    });

    it("should display stderr with different styling", async () => {
      let outputCallback: ((event: unknown) => void) | null = null;

      vi.mocked(listen).mockImplementation((event, callback) => {
        if (event === "command-output") {
          outputCallback = callback as (event: unknown) => void;
        }
        return Promise.resolve(() => {});
      });

      render(<Terminal isOpen={true} onClose={mockOnClose} onToggle={mockOnToggle} />);

      await act(async () => {
        outputCallback?.({
          payload: { line: "Error message", stream: "stderr" },
        });
      });

      const errorLine = screen.getByText("Error message");
      expect(errorLine.className).toContain("text-red-400");
    });

    it("should clear terminal when clear button is clicked", async () => {
      const user = userEvent.setup();
      let outputCallback: ((event: unknown) => void) | null = null;

      vi.mocked(listen).mockImplementation((event, callback) => {
        if (event === "command-output") {
          outputCallback = callback as (event: unknown) => void;
        }
        return Promise.resolve(() => {});
      });

      render(<Terminal isOpen={true} onClose={mockOnClose} onToggle={mockOnToggle} />);

      await act(async () => {
        outputCallback?.({
          payload: { line: "Some output", stream: "stdout" },
        });
      });

      expect(screen.getByText("Some output")).toBeInTheDocument();

      await user.click(screen.getByTitle("Clear terminal"));

      expect(screen.queryByText("Some output")).not.toBeInTheDocument();
      expect(
        screen.getByText("Terminal output will appear here when running commands...")
      ).toBeInTheDocument();
    });

    it("should display command status messages", async () => {
      let statusCallback: ((event: unknown) => void) | null = null;

      vi.mocked(listen).mockImplementation((event, callback) => {
        if (event === "command-status") {
          statusCallback = callback as (event: unknown) => void;
        }
        return Promise.resolve(() => {});
      });

      render(<Terminal isOpen={true} onClose={mockOnClose} onToggle={mockOnToggle} />);

      await act(async () => {
        statusCallback?.({
          payload: {
            command: "start",
            project: "test",
            status: "finished",
            message: "Project started successfully",
          },
        });
      });

      expect(screen.getByText(/Project started successfully/)).toBeInTheDocument();
    });
  });

  it("should unsubscribe from events on unmount", async () => {
    const unsubscribeMock = vi.fn();
    vi.mocked(listen).mockResolvedValue(unsubscribeMock);

    const { unmount } = render(
      <Terminal isOpen={true} onClose={mockOnClose} onToggle={mockOnToggle} />
    );

    unmount();

    // Wait for async cleanup
    await vi.waitFor(() => {
      expect(unsubscribeMock).toHaveBeenCalled();
    });
  });
});
