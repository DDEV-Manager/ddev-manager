import { useState, useCallback, forwardRef, type KeyboardEvent } from "react";
import { Send } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const ChatInput = forwardRef<HTMLInputElement, ChatInputProps>(function ChatInput(
  { onSend, disabled = false, placeholder = "Type a message..." },
  ref
) {
  const [message, setMessage] = useState("");

  const handleSend = useCallback(() => {
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage("");
    }
  }, [message, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className="flex items-center gap-2 border-t border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
      <input
        ref={ref}
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm transition-colors outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:focus:border-blue-400"
      />
      <button
        onClick={handleSend}
        disabled={disabled || !message.trim()}
        className="rounded-lg bg-blue-600 p-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        title="Send message"
      >
        <Send className="h-4 w-4" />
      </button>
    </div>
  );
});
