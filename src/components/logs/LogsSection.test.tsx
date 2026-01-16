import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { render } from "@/test/utils";
import { LogsSection } from "./LogsSection";
import { setupInvokeMock } from "@/test/mocks";

vi.mock("@tauri-apps/api/event");
vi.mock("@tauri-apps/api/core");

describe("LogsSection", () => {
  const defaultProps = {
    projectName: "my-project",
    services: ["web", "db"],
    isProjectRunning: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listen).mockResolvedValue(() => {});
  });

  describe("when project is not running", () => {
    it("should show a message to start the project", () => {
      render(<LogsSection {...defaultProps} isProjectRunning={false} />);

      expect(screen.getByText("Start the project to view logs")).toBeInTheDocument();
    });

    it("should not show log controls", () => {
      render(<LogsSection {...defaultProps} isProjectRunning={false} />);

      expect(screen.queryByText("Fetch")).not.toBeInTheDocument();
      expect(screen.queryByText("Follow")).not.toBeInTheDocument();
    });
  });

  describe("when project is running", () => {
    it("should render the logs section header", () => {
      render(<LogsSection {...defaultProps} />);

      expect(screen.getByText("Logs")).toBeInTheDocument();
    });

    it("should show service dropdown with default service", () => {
      render(<LogsSection {...defaultProps} />);

      expect(screen.getByText("web")).toBeInTheDocument();
    });

    it("should show search input", () => {
      render(<LogsSection {...defaultProps} />);

      expect(screen.getByPlaceholderText("Filter logs...")).toBeInTheDocument();
    });

    it("should show Fetch and Follow buttons", () => {
      render(<LogsSection {...defaultProps} />);

      expect(screen.getByText("Fetch")).toBeInTheDocument();
      expect(screen.getByText("Follow")).toBeInTheDocument();
    });

    it("should show empty state message", () => {
      render(<LogsSection {...defaultProps} />);

      expect(screen.getByText("Click 'Fetch' or 'Follow' to view logs")).toBeInTheDocument();
    });

    it("should fetch logs when Fetch button is clicked", async () => {
      const user = userEvent.setup();
      const mockProcessId = "logs-12345";

      setupInvokeMock(vi.mocked(invoke), {
        get_logs: mockProcessId,
      });

      render(<LogsSection {...defaultProps} />);

      await user.click(screen.getByText("Fetch"));

      expect(invoke).toHaveBeenCalledWith("get_logs", {
        project: "my-project",
        service: "web",
        follow: false,
        tail: 100,
        timestamps: false,
      });
    });

    it("should start following logs when Follow button is clicked", async () => {
      const user = userEvent.setup();
      const mockProcessId = "logs-12345";

      setupInvokeMock(vi.mocked(invoke), {
        get_logs: mockProcessId,
      });

      render(<LogsSection {...defaultProps} />);

      await user.click(screen.getByText("Follow"));

      expect(invoke).toHaveBeenCalledWith("get_logs", {
        project: "my-project",
        service: "web",
        follow: true,
        tail: 100,
        timestamps: false,
      });
    });

    it("should change service when dropdown option is clicked", async () => {
      const user = userEvent.setup();

      render(<LogsSection {...defaultProps} />);

      // Open dropdown
      await user.click(screen.getByText("web"));

      // Select db service
      await user.click(screen.getByText("db"));

      // Dropdown should now show db
      expect(screen.getByText("db")).toBeInTheDocument();
    });

    it("should display log output events", async () => {
      let outputCallback: ((event: unknown) => void) | null = null;

      vi.mocked(listen).mockImplementation((event, callback) => {
        if (event === "log-output") {
          outputCallback = callback as (event: unknown) => void;
        }
        return Promise.resolve(() => {});
      });

      render(<LogsSection {...defaultProps} />);

      await act(async () => {
        outputCallback?.({
          payload: {
            line: "Log line 1",
            stream: "stdout",
            project: "my-project",
            service: "web",
          },
        });
        outputCallback?.({
          payload: {
            line: "Log line 2",
            stream: "stdout",
            project: "my-project",
            service: "web",
          },
        });
      });

      expect(screen.getByText("Log line 1")).toBeInTheDocument();
      expect(screen.getByText("Log line 2")).toBeInTheDocument();
    });

    it("should display stderr logs with red color", async () => {
      let outputCallback: ((event: unknown) => void) | null = null;

      vi.mocked(listen).mockImplementation((event, callback) => {
        if (event === "log-output") {
          outputCallback = callback as (event: unknown) => void;
        }
        return Promise.resolve(() => {});
      });

      render(<LogsSection {...defaultProps} />);

      await act(async () => {
        outputCallback?.({
          payload: {
            line: "Error log",
            stream: "stderr",
            project: "my-project",
            service: "web",
          },
        });
      });

      const errorLine = screen.getByText("Error log");
      expect(errorLine.className).toContain("text-red-400");
    });

    it("should filter logs by search term", async () => {
      const user = userEvent.setup();
      let outputCallback: ((event: unknown) => void) | null = null;

      vi.mocked(listen).mockImplementation((event, callback) => {
        if (event === "log-output") {
          outputCallback = callback as (event: unknown) => void;
        }
        return Promise.resolve(() => {});
      });

      render(<LogsSection {...defaultProps} />);

      await act(async () => {
        outputCallback?.({
          payload: {
            line: "Important log message",
            stream: "stdout",
            project: "my-project",
            service: "web",
          },
        });
        outputCallback?.({
          payload: {
            line: "Another log",
            stream: "stdout",
            project: "my-project",
            service: "web",
          },
        });
      });

      // Type in search filter
      await user.type(screen.getByPlaceholderText("Filter logs..."), "Important");

      expect(screen.getByText("Important log message")).toBeInTheDocument();
      expect(screen.queryByText("Another log")).not.toBeInTheDocument();
    });

    it("should clear logs when clear button is clicked", async () => {
      const user = userEvent.setup();
      let outputCallback: ((event: unknown) => void) | null = null;

      vi.mocked(listen).mockImplementation((event, callback) => {
        if (event === "log-output") {
          outputCallback = callback as (event: unknown) => void;
        }
        return Promise.resolve(() => {});
      });

      render(<LogsSection {...defaultProps} />);

      await act(async () => {
        outputCallback?.({
          payload: {
            line: "Some log",
            stream: "stdout",
            project: "my-project",
            service: "web",
          },
        });
      });

      expect(screen.getByText("Some log")).toBeInTheDocument();

      await user.click(screen.getByTitle("Clear logs"));

      expect(screen.queryByText("Some log")).not.toBeInTheDocument();
      expect(screen.getByText("Click 'Fetch' or 'Follow' to view logs")).toBeInTheDocument();
    });

    it("should ignore logs from different projects", async () => {
      let outputCallback: ((event: unknown) => void) | null = null;

      vi.mocked(listen).mockImplementation((event, callback) => {
        if (event === "log-output") {
          outputCallback = callback as (event: unknown) => void;
        }
        return Promise.resolve(() => {});
      });

      render(<LogsSection {...defaultProps} />);

      await act(async () => {
        outputCallback?.({
          payload: {
            line: "Log from other project",
            stream: "stdout",
            project: "other-project",
            service: "web",
          },
        });
      });

      expect(screen.queryByText("Log from other project")).not.toBeInTheDocument();
    });

    it("should ignore logs from different services", async () => {
      let outputCallback: ((event: unknown) => void) | null = null;

      vi.mocked(listen).mockImplementation((event, callback) => {
        if (event === "log-output") {
          outputCallback = callback as (event: unknown) => void;
        }
        return Promise.resolve(() => {});
      });

      render(<LogsSection {...defaultProps} />);

      await act(async () => {
        outputCallback?.({
          payload: {
            line: "Log from db service",
            stream: "stdout",
            project: "my-project",
            service: "db",
          },
        });
      });

      // Default service is "web", so db logs should be ignored
      expect(screen.queryByText("Log from db service")).not.toBeInTheDocument();
    });
  });

  describe("service dropdown", () => {
    it("should use default services when services array is empty", () => {
      render(<LogsSection {...defaultProps} services={[]} />);

      expect(screen.getByText("web")).toBeInTheDocument();
    });

    it("should show available services in dropdown", async () => {
      const user = userEvent.setup();

      render(<LogsSection {...defaultProps} services={["web", "db", "redis"]} />);

      // Open dropdown
      await user.click(screen.getByText("web"));

      expect(screen.getByText("db")).toBeInTheDocument();
      expect(screen.getByText("redis")).toBeInTheDocument();
    });
  });

  it("should unsubscribe from events on unmount", async () => {
    const unsubscribeMock = vi.fn();
    vi.mocked(listen).mockResolvedValue(unsubscribeMock);

    const { unmount } = render(<LogsSection {...defaultProps} />);

    unmount();

    // Wait for async cleanup
    await vi.waitFor(() => {
      expect(unsubscribeMock).toHaveBeenCalled();
    });
  });
});
