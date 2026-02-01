import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@/test/utils";
import { ButtonGroup } from "./ButtonGroup";

describe("ButtonGroup", () => {
  const options = [
    { value: "a", label: "Option A" },
    { value: "b", label: "Option B" },
    { value: "c", label: "Option C" },
  ];

  it("should render all options", () => {
    render(<ButtonGroup options={options} value="a" onChange={() => {}} />);

    expect(screen.getByText("Option A")).toBeInTheDocument();
    expect(screen.getByText("Option B")).toBeInTheDocument();
    expect(screen.getByText("Option C")).toBeInTheDocument();
  });

  it("should highlight selected option", () => {
    render(<ButtonGroup options={options} value="b" onChange={() => {}} />);

    const selectedButton = screen.getByText("Option B");
    expect(selectedButton).toHaveClass("bg-white");
  });

  it("should call onChange when option clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<ButtonGroup options={options} value="a" onChange={onChange} />);

    await user.click(screen.getByText("Option C"));

    expect(onChange).toHaveBeenCalledWith("c");
  });

  it("should not call onChange when disabled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<ButtonGroup options={options} value="a" onChange={onChange} disabled />);

    await user.click(screen.getByText("Option B"));

    expect(onChange).not.toHaveBeenCalled();
  });

  it("should apply size styles", () => {
    const { rerender } = render(
      <ButtonGroup options={options} value="a" onChange={() => {}} size="sm" />
    );

    expect(screen.getByText("Option A")).toHaveClass("text-xs");

    rerender(<ButtonGroup options={options} value="a" onChange={() => {}} size="md" />);

    expect(screen.getByText("Option A")).toHaveClass("text-sm");
  });
});
