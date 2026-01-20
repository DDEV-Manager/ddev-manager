import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { listen } from "@tauri-apps/api/event";
import { render } from "@/test/utils";
import { Terminal } from "./Terminal";

vi.mock("@tauri-apps/api/event");

describe("Terminal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listen).mockResolvedValue(() => {});
  });

  describe("when closed", () => {
    it("should not render UI but still listen for events", () => {
      const { container } = render(<Terminal isOpen={false} />);
      expect(container.firstChild).toBeNull();
      expect(listen).toHaveBeenCalled();
    });
  });

  describe("when open", () => {
    it("should render output panel", () => {
      render(<Terminal isOpen={true} />);

      expect(screen.getByText("Output")).toBeInTheDocument();
      expect(screen.getByText("Command output will appear here...")).toBeInTheDocument();
    });

    it("should have clear button", () => {
      render(<Terminal isOpen={true} />);

      expect(screen.getByTitle("Clear output")).toBeInTheDocument();
    });

    it("should display command output lines", async () => {
      let outputCallback: ((event: unknown) => void) | null = null;

      vi.mocked(listen).mockImplementation((event, callback) => {
        if (event === "command-output") {
          outputCallback = callback as (event: unknown) => void;
        }
        return Promise.resolve(() => {});
      });

      render(<Terminal isOpen={true} />);

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

      render(<Terminal isOpen={true} />);

      await act(async () => {
        outputCallback?.({
          payload: { line: "Error message", stream: "stderr" },
        });
      });

      const errorLine = screen.getByText("Error message");
      expect(errorLine.className).toContain("text-red-400");
    });

    it("should clear output when clear button is clicked", async () => {
      const user = userEvent.setup();
      let outputCallback: ((event: unknown) => void) | null = null;

      vi.mocked(listen).mockImplementation((event, callback) => {
        if (event === "command-output") {
          outputCallback = callback as (event: unknown) => void;
        }
        return Promise.resolve(() => {});
      });

      render(<Terminal isOpen={true} />);

      await act(async () => {
        outputCallback?.({
          payload: { line: "Some output", stream: "stdout" },
        });
      });

      expect(screen.getByText("Some output")).toBeInTheDocument();

      await user.click(screen.getByTitle("Clear output"));

      expect(screen.queryByText("Some output")).not.toBeInTheDocument();
      expect(screen.getByText("Command output will appear here...")).toBeInTheDocument();
    });

    it("should display command status messages", async () => {
      let statusCallback: ((event: unknown) => void) | null = null;

      vi.mocked(listen).mockImplementation((event, callback) => {
        if (event === "command-status") {
          statusCallback = callback as (event: unknown) => void;
        }
        return Promise.resolve(() => {});
      });

      render(<Terminal isOpen={true} />);

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

    it("should show running indicator in header when command is running", async () => {
      let statusCallback: ((event: unknown) => void) | null = null;

      vi.mocked(listen).mockImplementation((event, callback) => {
        if (event === "command-status") {
          statusCallback = callback as (event: unknown) => void;
        }
        return Promise.resolve(() => {});
      });

      render(<Terminal isOpen={true} />);

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

      expect(screen.getByText("start my-project")).toBeInTheDocument();
    });
  });

  it("should unsubscribe from events on unmount", async () => {
    const unsubscribeMock = vi.fn();
    vi.mocked(listen).mockResolvedValue(unsubscribeMock);

    const { unmount } = render(<Terminal isOpen={true} />);

    unmount();

    // Wait for async cleanup
    await vi.waitFor(() => {
      expect(unsubscribeMock).toHaveBeenCalled();
    });
  });
});
