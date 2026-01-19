import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { invoke } from "@tauri-apps/api/core";
import { render } from "@/test/utils";
import { EnvironmentTab } from "./EnvironmentTab";
import { setupInvokeMock, createMockProjectDetails } from "@/test/mocks";

vi.mock("@tauri-apps/api/core");

describe("EnvironmentTab", () => {
  const defaultProps = {
    project: createMockProjectDetails(),
    isRunning: true,
    isOperationPending: false,
    currentOp: null as "start" | "stop" | "restart" | "delete" | "import-db" | "export-db" | null,
    onDelete: vi.fn(),
    onImportDb: vi.fn(),
    onExportDb: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setupInvokeMock(vi.mocked(invoke), {
      open_project_url: undefined,
      open_project_folder: undefined,
    });
  });

  describe("URLs section", () => {
    it("should render primary URL", () => {
      render(<EnvironmentTab {...defaultProps} />);

      expect(screen.getByText("Primary")).toBeInTheDocument();
      expect(screen.getByText(defaultProps.project.primary_url)).toBeInTheDocument();
    });

    it("should copy URL to clipboard when copy button clicked", async () => {
      const user = userEvent.setup();
      const writeText = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal("navigator", { clipboard: { writeText } });

      render(<EnvironmentTab {...defaultProps} />);

      const copyButtons = screen.getAllByTitle("Copy URL");
      await user.click(copyButtons[0]);

      expect(writeText).toHaveBeenCalledWith(defaultProps.project.primary_url);

      vi.unstubAllGlobals();
    });

    it("should open URL when external link clicked", async () => {
      const user = userEvent.setup();
      render(<EnvironmentTab {...defaultProps} />);

      const openButtons = screen.getAllByTitle("Open URL");
      await user.click(openButtons[0]);

      await waitFor(() => {
        expect(invoke).toHaveBeenCalledWith("open_project_url", {
          url: defaultProps.project.primary_url,
        });
      });
    });

    it("should not show open URL button when project is stopped", () => {
      render(<EnvironmentTab {...defaultProps} isRunning={false} />);

      expect(screen.queryByTitle("Open URL")).not.toBeInTheDocument();
    });

    it("should show additional URLs in accordion when more than 2", () => {
      const project = createMockProjectDetails({
        urls: [
          "https://test.ddev.site",
          "https://test2.ddev.site",
          "https://test3.ddev.site",
          "https://test4.ddev.site",
        ],
      });

      render(<EnvironmentTab {...defaultProps} project={project} />);

      expect(screen.getByText("3 more URLs")).toBeInTheDocument();
    });
  });

  describe("Database section", () => {
    it("should render database info when present", () => {
      render(<EnvironmentTab {...defaultProps} />);

      expect(screen.getByText("Database")).toBeInTheDocument();
      // Type is rendered as "mariadb 10.11" in the same span
      expect(screen.getByText(/mariadb/i)).toBeInTheDocument();
      expect(screen.getByText(/10\.11/)).toBeInTheDocument();
      // Database host is "db"
      expect(screen.getByText("Host:")).toBeInTheDocument();
    });

    it("should not render database section when dbinfo is missing", () => {
      const project = createMockProjectDetails({ dbinfo: undefined });
      render(<EnvironmentTab {...defaultProps} project={project} />);

      expect(screen.queryByText("Database")).not.toBeInTheDocument();
    });

    it("should show published port when running", () => {
      render(<EnvironmentTab {...defaultProps} />);

      expect(screen.getByText("Port (host):")).toBeInTheDocument();
      expect(screen.getByText("32768")).toBeInTheDocument();
    });

    it("should not show published port when stopped", () => {
      render(<EnvironmentTab {...defaultProps} isRunning={false} />);

      expect(screen.queryByText("Port (host):")).not.toBeInTheDocument();
    });

    it("should copy password when copy button clicked", async () => {
      const user = userEvent.setup();
      const writeText = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal("navigator", { clipboard: { writeText } });

      render(<EnvironmentTab {...defaultProps} />);

      await user.click(screen.getByTitle("Copy password"));

      expect(writeText).toHaveBeenCalledWith("db");

      vi.unstubAllGlobals();
    });
  });

  describe("Import/Export buttons", () => {
    it("should show import/export buttons when running", () => {
      render(<EnvironmentTab {...defaultProps} />);

      expect(screen.getByRole("button", { name: /import/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /export/i })).toBeInTheDocument();
    });

    it("should not show import/export buttons when stopped", () => {
      render(<EnvironmentTab {...defaultProps} isRunning={false} />);

      expect(screen.queryByRole("button", { name: /import/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /export/i })).not.toBeInTheDocument();
    });

    it("should call onImportDb when import button clicked", async () => {
      const user = userEvent.setup();
      const onImportDb = vi.fn();

      render(<EnvironmentTab {...defaultProps} onImportDb={onImportDb} />);

      await user.click(screen.getByRole("button", { name: /import/i }));

      expect(onImportDb).toHaveBeenCalled();
    });

    it("should call onExportDb when export button clicked", async () => {
      const user = userEvent.setup();
      const onExportDb = vi.fn();

      render(<EnvironmentTab {...defaultProps} onExportDb={onExportDb} />);

      await user.click(screen.getByRole("button", { name: /export/i }));

      expect(onExportDb).toHaveBeenCalled();
    });

    it("should disable buttons when operation is pending", () => {
      render(<EnvironmentTab {...defaultProps} isOperationPending={true} />);

      expect(screen.getByRole("button", { name: /import/i })).toBeDisabled();
      expect(screen.getByRole("button", { name: /export/i })).toBeDisabled();
    });

    it("should show loading state on import button", () => {
      render(<EnvironmentTab {...defaultProps} currentOp="import-db" isOperationPending={true} />);

      const importButton = screen.getByRole("button", { name: /import/i });
      expect(importButton.querySelector(".animate-spin")).toBeInTheDocument();
    });

    it("should show loading state on export button", () => {
      render(<EnvironmentTab {...defaultProps} currentOp="export-db" isOperationPending={true} />);

      const exportButton = screen.getByRole("button", { name: /export/i });
      expect(exportButton.querySelector(".animate-spin")).toBeInTheDocument();
    });
  });

  describe("Services section", () => {
    it("should render services when present", () => {
      render(<EnvironmentTab {...defaultProps} />);

      expect(screen.getByText("Services")).toBeInTheDocument();
      expect(screen.getByText("web")).toBeInTheDocument();
      // "db" appears in both database info and services sections
      // Just check the services heading exists and web service is shown
    });

    it("should not render services section when empty", () => {
      const project = createMockProjectDetails({ services: {} });
      render(<EnvironmentTab {...defaultProps} project={project} />);

      expect(screen.queryByText("Services")).not.toBeInTheDocument();
    });

    it("should show running indicator for running services", () => {
      const { container } = render(<EnvironmentTab {...defaultProps} />);

      // Running services should have green indicator
      const greenIndicators = container.querySelectorAll(".bg-green-500");
      expect(greenIndicators.length).toBeGreaterThan(0);
    });
  });

  describe("Location section", () => {
    it("should render project location", () => {
      render(<EnvironmentTab {...defaultProps} />);

      expect(screen.getByText("Location")).toBeInTheDocument();
      expect(screen.getByText(defaultProps.project.approot)).toBeInTheDocument();
    });

    it("should open folder when folder button clicked", async () => {
      const user = userEvent.setup();
      render(<EnvironmentTab {...defaultProps} />);

      await user.click(screen.getByTitle("Open folder"));

      await waitFor(() => {
        expect(invoke).toHaveBeenCalledWith("open_project_folder", {
          path: defaultProps.project.approot,
        });
      });
    });
  });

  describe("Danger zone", () => {
    it("should render danger zone with delete button", () => {
      render(<EnvironmentTab {...defaultProps} />);

      expect(screen.getByText("Danger Zone")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /remove/i })).toBeInTheDocument();
    });

    it("should call onDelete when remove button clicked", async () => {
      const user = userEvent.setup();
      const onDelete = vi.fn();

      render(<EnvironmentTab {...defaultProps} onDelete={onDelete} />);

      await user.click(screen.getByRole("button", { name: /remove/i }));

      expect(onDelete).toHaveBeenCalled();
    });

    it("should disable delete button when operation is pending", () => {
      render(<EnvironmentTab {...defaultProps} isOperationPending={true} />);

      expect(screen.getByRole("button", { name: /remove/i })).toBeDisabled();
    });

    it("should show removing text when delete is in progress", () => {
      render(<EnvironmentTab {...defaultProps} currentOp="delete" isOperationPending={true} />);

      expect(screen.getByRole("button", { name: /removing/i })).toBeInTheDocument();
    });
  });
});
