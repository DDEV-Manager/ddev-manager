import { create } from "zustand";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export type ModelStatus = "idle" | "loading" | "ready" | "error";

interface ChatState {
  messages: ChatMessage[];
  isOpen: boolean;
  isLoading: boolean;
  modelStatus: ModelStatus;
  modelLoadProgress: number;
  modelError: string | null;

  // Actions
  addMessage: (message: Omit<ChatMessage, "id" | "timestamp">) => void;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  setLoading: (loading: boolean) => void;
  setModelStatus: (status: ModelStatus) => void;
  setModelLoadProgress: (progress: number) => void;
  setModelError: (error: string | null) => void;
  clearMessages: () => void;
}

let messageId = 0;

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isOpen: false,
  isLoading: false,
  modelStatus: "idle",
  modelLoadProgress: 0,
  modelError: null,

  addMessage: (message) => {
    const id = `msg-${++messageId}`;
    set((state) => ({
      messages: [...state.messages, { ...message, id, timestamp: new Date() }],
    }));
  },

  setOpen: (open) => set({ isOpen: open }),

  toggle: () => set((state) => ({ isOpen: !state.isOpen })),

  setLoading: (loading) => set({ isLoading: loading }),

  setModelStatus: (status) => set({ modelStatus: status }),

  setModelLoadProgress: (progress) => set({ modelLoadProgress: progress }),

  setModelError: (error) => set({ modelError: error, modelStatus: error ? "error" : "idle" }),

  clearMessages: () => set({ messages: [] }),
}));
