import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@/test/utils";
import { DatabaseExportDialog } from "./DatabaseExportDialog";

describe("DatabaseExportDialog", () => {
  const defaultProps = {
    isOpen: true,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  it("should render dialog when open", () => {
    render(<DatabaseExportDialog {...defaultProps} />);

    expect(screen.getByText("Export Database")).toBeInTheDocument();
    expect(
      screen.getByText("Configure export options, then choose a destination")
    ).toBeInTheDocument();
  });

  it("should not render content when closed", () => {
    render(<DatabaseExportDialog {...defaultProps} isOpen={false} />);

    expect(screen.queryByText("Export Database")).not.toBeInTheDocument();
  });

  it("should render database name input", () => {
    render(<DatabaseExportDialog {...defaultProps} />);

    expect(screen.getByLabelText("Database name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("db")).toBeInTheDocument();
  });

  it("should render compression options", () => {
    render(<DatabaseExportDialog {...defaultProps} />);

    expect(screen.getByText("Compression")).toBeInTheDocument();
    expect(screen.getByText("gzip")).toBeInTheDocument();
    expect(screen.getByText("bzip2")).toBeInTheDocument();
    expect(screen.getByText("xz")).toBeInTheDocument();
  });

  it("should have gzip selected by default", () => {
    render(<DatabaseExportDialog {...defaultProps} />);

    const gzipButton = screen.getByText("gzip");
    expect(gzipButton).toHaveClass("bg-white");
  });

  it("should call onConfirm with default options", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(<DatabaseExportDialog {...defaultProps} onConfirm={onConfirm} />);

    await user.click(screen.getByText("Choose Destination..."));

    expect(onConfirm).toHaveBeenCalledWith({
      database: undefined,
      compression: "gzip",
    });
  });

  it("should call onConfirm with custom options", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(<DatabaseExportDialog {...defaultProps} onConfirm={onConfirm} />);

    await user.type(screen.getByPlaceholderText("db"), "custom_db");
    await user.click(screen.getByText("bzip2"));
    await user.click(screen.getByText("Choose Destination..."));

    expect(onConfirm).toHaveBeenCalledWith({
      database: "custom_db",
      compression: "bzip2",
    });
  });

  it("should allow selecting xz compression", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(<DatabaseExportDialog {...defaultProps} onConfirm={onConfirm} />);

    await user.click(screen.getByText("xz"));
    await user.click(screen.getByText("Choose Destination..."));

    expect(onConfirm).toHaveBeenCalledWith({
      database: undefined,
      compression: "xz",
    });
  });

  it("should call onCancel when cancel button clicked", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(<DatabaseExportDialog {...defaultProps} onCancel={onCancel} />);

    await user.click(screen.getByText("Cancel"));

    expect(onCancel).toHaveBeenCalled();
  });

  it("should reset state when reopened", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    const { rerender } = render(<DatabaseExportDialog {...defaultProps} onConfirm={onConfirm} />);

    // Type something and change compression
    await user.type(screen.getByPlaceholderText("db"), "test");
    await user.click(screen.getByText("xz"));

    // Close and reopen
    rerender(<DatabaseExportDialog {...defaultProps} isOpen={false} onConfirm={onConfirm} />);
    rerender(<DatabaseExportDialog {...defaultProps} isOpen={true} onConfirm={onConfirm} />);

    // Should be reset
    expect(screen.getByPlaceholderText("db")).toHaveValue("");
    expect(screen.getByText("gzip")).toHaveClass("bg-white");
  });
});
