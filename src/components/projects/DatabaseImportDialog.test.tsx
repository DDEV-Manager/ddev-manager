import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@/test/utils";
import { DatabaseImportDialog } from "./DatabaseImportDialog";

describe("DatabaseImportDialog", () => {
  const defaultProps = {
    isOpen: true,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  it("should render dialog when open", () => {
    render(<DatabaseImportDialog {...defaultProps} />);

    expect(screen.getByText("Import Database")).toBeInTheDocument();
    expect(screen.getByText("Configure import options, then select a file")).toBeInTheDocument();
  });

  it("should not render content when closed", () => {
    render(<DatabaseImportDialog {...defaultProps} isOpen={false} />);

    expect(screen.queryByText("Import Database")).not.toBeInTheDocument();
  });

  it("should render database name input", () => {
    render(<DatabaseImportDialog {...defaultProps} />);

    expect(screen.getByLabelText("Database name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("db")).toBeInTheDocument();
  });

  it("should render keep existing data toggle", () => {
    render(<DatabaseImportDialog {...defaultProps} />);

    expect(screen.getByText("Keep existing data")).toBeInTheDocument();
    expect(screen.getByRole("switch")).toBeInTheDocument();
  });

  it("should call onConfirm with options when confirmed", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(<DatabaseImportDialog {...defaultProps} onConfirm={onConfirm} />);

    await user.type(screen.getByPlaceholderText("db"), "custom_db");
    await user.click(screen.getByRole("switch"));
    await user.click(screen.getByText("Select File..."));

    expect(onConfirm).toHaveBeenCalledWith({
      database: "custom_db",
      noDrop: true,
    });
  });

  it("should call onConfirm with undefined database when empty", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(<DatabaseImportDialog {...defaultProps} onConfirm={onConfirm} />);

    await user.click(screen.getByText("Select File..."));

    expect(onConfirm).toHaveBeenCalledWith({
      database: undefined,
      noDrop: undefined,
    });
  });

  it("should call onCancel when cancel button clicked", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(<DatabaseImportDialog {...defaultProps} onCancel={onCancel} />);

    await user.click(screen.getByText("Cancel"));

    expect(onCancel).toHaveBeenCalled();
  });

  it("should reset state when reopened", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    const { rerender } = render(<DatabaseImportDialog {...defaultProps} onConfirm={onConfirm} />);

    // Type something and toggle
    await user.type(screen.getByPlaceholderText("db"), "test");
    await user.click(screen.getByRole("switch"));

    // Close and reopen
    rerender(<DatabaseImportDialog {...defaultProps} isOpen={false} onConfirm={onConfirm} />);
    rerender(<DatabaseImportDialog {...defaultProps} isOpen={true} onConfirm={onConfirm} />);

    // Should be reset
    expect(screen.getByPlaceholderText("db")).toHaveValue("");
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
  });
});
