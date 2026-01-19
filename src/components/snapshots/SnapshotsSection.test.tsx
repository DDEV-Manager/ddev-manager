import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { invoke } from "@tauri-apps/api/core";
import { render } from "@/test/utils";
import { SnapshotsSection } from "./SnapshotsSection";
import { setupInvokeMock } from "@/test/mocks";

vi.mock("@tauri-apps/api/core");

describe("SnapshotsSection", () => {
  const defaultProps = {
    projectName: "my-project",
    approot: "/home/user/projects/my-project",
  };

  const mockSnapshotsResponse = (snapshots: Array<{ Name: string; Created: string }> | null) =>
    JSON.stringify({
      level: "info",
      msg: "snapshot list",
      raw: { "my-project": snapshots },
      time: "2024-01-15T10:00:00Z",
    });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("empty state", () => {
    it("should show empty state when no snapshots exist", async () => {
      setupInvokeMock(vi.mocked(invoke), {
        list_snapshots: mockSnapshotsResponse(null),
      });

      render(<SnapshotsSection {...defaultProps} />);

      await waitFor(() => {
        expect(
          screen.getByText("No snapshots yet. Create one to backup your database.")
        ).toBeInTheDocument();
      });
    });

    it("should not show Clean All button when no snapshots", async () => {
      setupInvokeMock(vi.mocked(invoke), {
        list_snapshots: mockSnapshotsResponse(null),
      });

      render(<SnapshotsSection {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText("Clean All")).not.toBeInTheDocument();
      });
    });
  });

  describe("with snapshots", () => {
    const mockSnapshots = [
      { Name: "snapshot-1", Created: "2024-01-15T10:00:00Z" },
      { Name: "snapshot-2", Created: "2024-01-14T09:00:00Z" },
    ];

    it("should display list of snapshots", async () => {
      setupInvokeMock(vi.mocked(invoke), {
        list_snapshots: mockSnapshotsResponse(mockSnapshots),
      });

      render(<SnapshotsSection {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("snapshot-1")).toBeInTheDocument();
        expect(screen.getByText("snapshot-2")).toBeInTheDocument();
      });
    });

    it("should show Clean All button when snapshots exist", async () => {
      setupInvokeMock(vi.mocked(invoke), {
        list_snapshots: mockSnapshotsResponse(mockSnapshots),
      });

      render(<SnapshotsSection {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Clean All")).toBeInTheDocument();
      });
    });

    it("should show Restore button for each snapshot", async () => {
      setupInvokeMock(vi.mocked(invoke), {
        list_snapshots: mockSnapshotsResponse(mockSnapshots),
      });

      render(<SnapshotsSection {...defaultProps} />);

      await waitFor(() => {
        // Check that snapshot names are displayed (which means restore buttons are also there)
        expect(screen.getByText("snapshot-1")).toBeInTheDocument();
        expect(screen.getByText("snapshot-2")).toBeInTheDocument();
        // Get all buttons with role containing "Restore" text within the list
        const snapshotItems = screen.getAllByText("Restore");
        // Should have 2 restore buttons in the list (dialog buttons are not rendered initially)
        expect(snapshotItems.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe("create snapshot", () => {
    it("should render create snapshot form", async () => {
      setupInvokeMock(vi.mocked(invoke), {
        list_snapshots: mockSnapshotsResponse(null),
      });

      render(<SnapshotsSection {...defaultProps} />);

      expect(screen.getByPlaceholderText("Snapshot name (optional)")).toBeInTheDocument();
      expect(screen.getByText("Create Snapshot")).toBeInTheDocument();
    });

    it("should create snapshot without name", async () => {
      const user = userEvent.setup();

      setupInvokeMock(vi.mocked(invoke), {
        list_snapshots: mockSnapshotsResponse(null),
        create_snapshot: "Created snapshot",
      });

      render(<SnapshotsSection {...defaultProps} />);

      await user.click(screen.getByText("Create Snapshot"));

      await waitFor(() => {
        expect(invoke).toHaveBeenCalledWith("create_snapshot", {
          project: "my-project",
          name: undefined,
        });
      });
    });

    it("should create snapshot with custom name", async () => {
      const user = userEvent.setup();

      setupInvokeMock(vi.mocked(invoke), {
        list_snapshots: mockSnapshotsResponse(null),
        create_snapshot: "Created snapshot",
      });

      render(<SnapshotsSection {...defaultProps} />);

      await user.type(screen.getByPlaceholderText("Snapshot name (optional)"), "my-backup");
      await user.click(screen.getByText("Create Snapshot"));

      await waitFor(() => {
        expect(invoke).toHaveBeenCalledWith("create_snapshot", {
          project: "my-project",
          name: "my-backup",
        });
      });
    });
  });

  describe("restore snapshot", () => {
    const mockSnapshots = [{ Name: "snapshot-1", Created: "2024-01-15T10:00:00Z" }];

    it("should show restore confirmation dialog", async () => {
      const user = userEvent.setup();

      setupInvokeMock(vi.mocked(invoke), {
        list_snapshots: mockSnapshotsResponse(mockSnapshots),
      });

      render(<SnapshotsSection {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("snapshot-1")).toBeInTheDocument();
      });

      // Click the Restore button in the list
      const restoreButtons = screen.getAllByText("Restore");
      await user.click(restoreButtons[0]);

      expect(screen.getByText("Restore Snapshot")).toBeInTheDocument();
      expect(
        screen.getByText(/This will restore the database to "snapshot-1"/)
      ).toBeInTheDocument();
    });

    it("should restore snapshot on confirm", async () => {
      const user = userEvent.setup();

      setupInvokeMock(vi.mocked(invoke), {
        list_snapshots: mockSnapshotsResponse(mockSnapshots),
        restore_snapshot: "Restored",
      });

      render(<SnapshotsSection {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("snapshot-1")).toBeInTheDocument();
      });

      // Click the Restore button in the list
      const listRestoreButtons = screen.getAllByText("Restore");
      await user.click(listRestoreButtons[0]);

      // Now click confirm in dialog (the second Restore button)
      const allRestoreButtons = screen.getAllByRole("button", { name: "Restore" });
      await user.click(allRestoreButtons[allRestoreButtons.length - 1]);

      await waitFor(() => {
        expect(invoke).toHaveBeenCalledWith("restore_snapshot", {
          project: "my-project",
          snapshot: "snapshot-1",
          approot: "/home/user/projects/my-project",
        });
      });
    });

    it("should cancel restore on dialog cancel", async () => {
      const user = userEvent.setup();

      setupInvokeMock(vi.mocked(invoke), {
        list_snapshots: mockSnapshotsResponse(mockSnapshots),
      });

      render(<SnapshotsSection {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("snapshot-1")).toBeInTheDocument();
      });

      // Click the Restore button in the list (first one)
      const restoreButtons = screen.getAllByText("Restore");
      await user.click(restoreButtons[0]);

      // Wait for the dialog to be visible, then click the Cancel button
      await waitFor(() => {
        expect(screen.getByText("Restore Snapshot")).toBeInTheDocument();
      });

      const cancelButtons = screen.getAllByRole("button", { name: "Cancel" });
      await user.click(cancelButtons[0]);

      expect(invoke).not.toHaveBeenCalledWith("restore_snapshot", expect.anything());
    });
  });

  describe("delete snapshot", () => {
    const mockSnapshots = [{ Name: "snapshot-1", Created: "2024-01-15T10:00:00Z" }];

    it("should show delete confirmation dialog", async () => {
      const user = userEvent.setup();

      setupInvokeMock(vi.mocked(invoke), {
        list_snapshots: mockSnapshotsResponse(mockSnapshots),
      });

      render(<SnapshotsSection {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("snapshot-1")).toBeInTheDocument();
      });

      await user.click(screen.getByTitle("Delete snapshot"));

      expect(screen.getByText("Delete Snapshot")).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to delete "snapshot-1"/)).toBeInTheDocument();
    });

    it("should delete snapshot on confirm", async () => {
      const user = userEvent.setup();

      setupInvokeMock(vi.mocked(invoke), {
        list_snapshots: mockSnapshotsResponse(mockSnapshots),
        delete_snapshot: "Deleted",
      });

      render(<SnapshotsSection {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("snapshot-1")).toBeInTheDocument();
      });

      await user.click(screen.getByTitle("Delete snapshot"));
      await user.click(screen.getByRole("button", { name: "Delete" }));

      await waitFor(() => {
        expect(invoke).toHaveBeenCalledWith("delete_snapshot", {
          project: "my-project",
          snapshot: "snapshot-1",
        });
      });
    });
  });

  describe("cleanup all snapshots", () => {
    const mockSnapshots = [
      { Name: "snapshot-1", Created: "2024-01-15T10:00:00Z" },
      { Name: "snapshot-2", Created: "2024-01-14T09:00:00Z" },
    ];

    it("should show cleanup confirmation dialog", async () => {
      const user = userEvent.setup();

      setupInvokeMock(vi.mocked(invoke), {
        list_snapshots: mockSnapshotsResponse(mockSnapshots),
      });

      render(<SnapshotsSection {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Clean All")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Clean All"));

      expect(screen.getByText("Delete All Snapshots")).toBeInTheDocument();
      expect(screen.getByText(/permanently delete all 2 snapshot/)).toBeInTheDocument();
    });

    it("should cleanup all snapshots on confirm", async () => {
      const user = userEvent.setup();

      setupInvokeMock(vi.mocked(invoke), {
        list_snapshots: mockSnapshotsResponse(mockSnapshots),
        cleanup_snapshots: "Cleaned up",
      });

      render(<SnapshotsSection {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Clean All")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Clean All"));
      await user.click(screen.getByRole("button", { name: "Delete All" }));

      await waitFor(() => {
        expect(invoke).toHaveBeenCalledWith("cleanup_snapshots", {
          project: "my-project",
        });
      });
    });
  });

  describe("loading state", () => {
    it("should show loading spinner while fetching snapshots", async () => {
      // Never resolve the mock to keep loading state
      vi.mocked(invoke).mockImplementation(() => new Promise(() => {}));

      render(<SnapshotsSection {...defaultProps} />);

      // Should show loading indicator
      expect(document.querySelector(".animate-spin")).toBeInTheDocument();
    });
  });
});
