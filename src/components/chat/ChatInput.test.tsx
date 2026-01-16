import { describe, it, expect, vi } from "vitest";
import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatInput } from "./ChatInput";

describe("ChatInput", () => {
  describe("rendering", () => {
    it("should render an input field", () => {
      render(<ChatInput onSend={vi.fn()} />);
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    it("should render a send button", () => {
      render(<ChatInput onSend={vi.fn()} />);
      expect(screen.getByRole("button", { name: /send/i })).toBeInTheDocument();
    });

    it("should display custom placeholder", () => {
      render(<ChatInput onSend={vi.fn()} placeholder="Custom placeholder" />);
      expect(screen.getByPlaceholderText("Custom placeholder")).toBeInTheDocument();
    });

    it("should use default placeholder", () => {
      render(<ChatInput onSend={vi.fn()} />);
      expect(screen.getByPlaceholderText("Type a message...")).toBeInTheDocument();
    });
  });

  describe("disabled state", () => {
    it("should disable input when disabled prop is true", () => {
      render(<ChatInput onSend={vi.fn()} disabled />);
      expect(screen.getByRole("textbox")).toBeDisabled();
    });

    it("should disable send button when disabled prop is true", () => {
      render(<ChatInput onSend={vi.fn()} disabled />);
      expect(screen.getByRole("button", { name: /send/i })).toBeDisabled();
    });

    it("should disable send button when input is empty", () => {
      render(<ChatInput onSend={vi.fn()} />);
      expect(screen.getByRole("button", { name: /send/i })).toBeDisabled();
    });
  });

  describe("sending messages", () => {
    it("should call onSend when send button is clicked", async () => {
      const onSend = vi.fn();
      const user = userEvent.setup();

      render(<ChatInput onSend={onSend} />);

      await user.type(screen.getByRole("textbox"), "Hello");
      await user.click(screen.getByRole("button", { name: /send/i }));

      expect(onSend).toHaveBeenCalledWith("Hello");
    });

    it("should call onSend when Enter is pressed", async () => {
      const onSend = vi.fn();
      const user = userEvent.setup();

      render(<ChatInput onSend={onSend} />);

      await user.type(screen.getByRole("textbox"), "Hello{enter}");

      expect(onSend).toHaveBeenCalledWith("Hello");
    });

    it("should not call onSend when Shift+Enter is pressed", async () => {
      const onSend = vi.fn();
      const user = userEvent.setup();

      render(<ChatInput onSend={onSend} />);

      await user.type(screen.getByRole("textbox"), "Hello");
      await user.keyboard("{Shift>}{Enter}{/Shift}");

      expect(onSend).not.toHaveBeenCalled();
    });

    it("should clear input after sending", async () => {
      const user = userEvent.setup();

      render(<ChatInput onSend={vi.fn()} />);

      const input = screen.getByRole("textbox");
      await user.type(input, "Hello{enter}");

      expect(input).toHaveValue("");
    });

    it("should trim whitespace from message", async () => {
      const onSend = vi.fn();
      const user = userEvent.setup();

      render(<ChatInput onSend={onSend} />);

      await user.type(screen.getByRole("textbox"), "  Hello  {enter}");

      expect(onSend).toHaveBeenCalledWith("Hello");
    });

    it("should not send empty messages", async () => {
      const onSend = vi.fn();
      const user = userEvent.setup();

      render(<ChatInput onSend={onSend} />);

      await user.type(screen.getByRole("textbox"), "   {enter}");

      expect(onSend).not.toHaveBeenCalled();
    });
  });

  describe("forwardRef", () => {
    it("should forward ref to input element", () => {
      const ref = createRef<HTMLInputElement>();

      render(<ChatInput ref={ref} onSend={vi.fn()} />);

      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });

    it("should allow focusing via ref", () => {
      const ref = createRef<HTMLInputElement>();

      render(<ChatInput ref={ref} onSend={vi.fn()} />);

      ref.current?.focus();

      expect(document.activeElement).toBe(ref.current);
    });
  });
});
