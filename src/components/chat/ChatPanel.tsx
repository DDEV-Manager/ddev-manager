import { useEffect } from "react";
import { X, MessageCircle, Loader2, AlertCircle, Sparkles } from "lucide-react";
import { useChatStore } from "@/stores/chatStore";
import { useAIChat } from "@/hooks/useAIChat";
import { ChatMessages } from "./ChatMessages";
import { ChatInput } from "./ChatInput";
import { cn } from "@/lib/utils";

interface ChatPanelProps {
  enabled?: boolean;
}

export function ChatPanel({ enabled = true }: ChatPanelProps) {
  const { isOpen, toggle, messages, isLoading, modelStatus, modelLoadProgress } = useChatStore();
  const { sendMessage, loadModel, initializeChat } = useAIChat();

  // Initialize chat with welcome message when opened
  useEffect(() => {
    if (isOpen) {
      initializeChat();
    }
  }, [isOpen, initializeChat]);

  // Optionally load model when chat is opened
  useEffect(() => {
    if (isOpen && modelStatus === "idle") {
      // Don't auto-load the model for now to save resources
      // loadModel();
    }
  }, [isOpen, modelStatus, loadModel]);

  if (!enabled) {
    return null;
  }

  // Collapsed state - show toggle button
  if (!isOpen) {
    return (
      <button
        onClick={toggle}
        className="fixed right-4 bottom-16 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-transform hover:scale-105 hover:bg-blue-700"
        title="Open AI Chat (Experimental)"
      >
        <MessageCircle className="h-5 w-5" />
      </button>
    );
  }

  // Expanded state - show chat panel
  return (
    <div
      className={cn(
        "fixed top-0 right-0 z-50 flex h-full w-80 flex-col border-l border-gray-200 bg-white shadow-xl transition-transform dark:border-gray-800 dark:bg-gray-900",
        "animate-in slide-in-from-right duration-200"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-500" />
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">AI Chat</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Experimental</p>
          </div>
        </div>
        <button
          onClick={toggle}
          className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          title="Close chat"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Model status banner */}
      {modelStatus === "loading" && (
        <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading AI model... {modelLoadProgress}%
        </div>
      )}

      {modelStatus === "error" && (
        <div className="flex items-center gap-2 bg-yellow-50 px-4 py-2 text-xs text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300">
          <AlertCircle className="h-3 w-3" />
          AI model failed to load. Using basic mode.
        </div>
      )}

      {/* Messages */}
      <ChatMessages messages={messages} isLoading={isLoading} />

      {/* Input */}
      <ChatInput
        onSend={sendMessage}
        disabled={isLoading}
        placeholder="Try 'start myproject' or 'list projects'"
      />
    </div>
  );
}
