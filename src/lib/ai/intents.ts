export type IntentType =
  | "start_project"
  | "stop_project"
  | "stop_all"
  | "restart_project"
  | "list_projects"
  | "describe_project"
  | "open_site"
  | "qa_general"
  | "unknown";

export interface ClassifiedIntent {
  type: IntentType;
  confidence: number;
  projectName: string | null;
  rawMessage: string;
}

/**
 * System prompt for intent classification
 */
export const SYSTEM_PROMPT = `You are a helpful assistant for DDEV Manager, a desktop application for managing DDEV local development environments.

You can help users:
- Start, stop, and restart DDEV projects
- List running and stopped projects
- Get information about projects
- Answer questions about DDEV

Be concise and helpful. When executing commands, confirm what you're doing.`;

/**
 * Prompt template for intent classification
 * The model should respond with JSON containing the classified intent
 */
export const INTENT_CLASSIFICATION_PROMPT = `Classify the user's intent and extract any project name mentioned.

Possible intents:
- start_project: User wants to start a DDEV project (e.g., "start myproject", "run the blog")
- stop_project: User wants to stop a specific project (e.g., "stop myproject", "shutdown blog")
- stop_all: User wants to stop all projects (e.g., "stop all", "stop everything", "poweroff")
- restart_project: User wants to restart a project (e.g., "restart myproject", "reboot blog")
- list_projects: User wants to see projects (e.g., "list projects", "what's running", "show all")
- describe_project: User wants info about a project (e.g., "describe myproject", "info about blog")
- open_site: User wants to open a project's site (e.g., "open myproject", "open site for blog")
- qa_general: User has a general question about DDEV (e.g., "what is ddev?", "how do I add redis?")
- unknown: Cannot determine intent

Respond ONLY with a JSON object in this exact format:
{"intent": "intent_type", "project": "project_name_or_null", "confidence": 0.95}

User message: {message}
Response:`;

/**
 * Keywords for quick intent detection (fallback when model is not available or for optimization)
 */
export const INTENT_KEYWORDS: Record<IntentType, string[]> = {
  start_project: ["start", "run", "boot", "launch", "begin", "spin up"],
  stop_project: ["stop", "shutdown", "halt", "kill", "terminate"],
  stop_all: ["stop all", "stop everything", "poweroff", "power off", "shutdown all"],
  restart_project: ["restart", "reboot", "reload"],
  list_projects: ["list", "show", "what", "which", "running", "projects"],
  describe_project: ["describe", "info", "about", "status", "details"],
  open_site: ["open", "browse", "visit", "site", "url"],
  qa_general: ["what is", "how do", "how to", "why", "explain", "help"],
  unknown: [],
};

/**
 * Quick keyword-based intent classification (fallback)
 * Used when model is not loaded or for quick common commands
 */
export function classifyIntentByKeywords(message: string): ClassifiedIntent {
  const normalized = message.toLowerCase().trim();

  // Check for stop_all first (more specific)
  for (const keyword of INTENT_KEYWORDS.stop_all) {
    if (normalized.includes(keyword)) {
      return {
        type: "stop_all",
        confidence: 0.9,
        projectName: null,
        rawMessage: message,
      };
    }
  }

  // Check other intents
  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    if (intent === "stop_all" || intent === "unknown") continue;

    for (const keyword of keywords) {
      if (normalized.includes(keyword)) {
        // Extract project name for project-specific intents
        let projectName: string | null = null;
        if (
          intent === "start_project" ||
          intent === "stop_project" ||
          intent === "restart_project" ||
          intent === "describe_project" ||
          intent === "open_site"
        ) {
          // Try to extract project name after the keyword
          const afterKeyword = normalized.split(keyword)[1]?.trim();
          if (afterKeyword) {
            // Remove common words
            const cleaned = afterKeyword.replace(/^(the|project|site|for)\s+/i, "").split(/\s+/)[0];
            if (cleaned && cleaned.length > 1) {
              projectName = cleaned;
            }
          }
        }

        return {
          type: intent as IntentType,
          confidence: 0.7,
          projectName,
          rawMessage: message,
        };
      }
    }
  }

  // Default to qa_general for questions, unknown otherwise
  if (normalized.includes("?") || normalized.startsWith("how") || normalized.startsWith("what")) {
    return {
      type: "qa_general",
      confidence: 0.5,
      projectName: null,
      rawMessage: message,
    };
  }

  return {
    type: "unknown",
    confidence: 0.3,
    projectName: null,
    rawMessage: message,
  };
}

/**
 * Response templates for different actions
 */
export const RESPONSE_TEMPLATES = {
  start_success: (name: string) => `Starting **${name}**... Check the terminal for progress.`,
  start_already_running: (name: string) => `**${name}** is already running.`,
  start_not_found: (query: string, suggestions: string[]) =>
    suggestions.length > 0
      ? `I couldn't find a project matching "${query}". Did you mean: ${suggestions.join(", ")}?`
      : `I couldn't find a project matching "${query}".`,

  stop_success: (name: string) => `Stopping **${name}**...`,
  stop_already_stopped: (name: string) => `**${name}** is already stopped.`,
  stop_all_success: (count: number) =>
    count > 0
      ? `Stopping all ${count} running project(s)...`
      : `No projects are currently running.`,

  restart_success: (name: string) => `Restarting **${name}**...`,
  restart_not_running: (name: string) =>
    `**${name}** is not running. Would you like to start it instead?`,

  list_projects: (running: string[], stopped: string[]) => {
    const parts: string[] = [];
    if (running.length > 0) {
      parts.push(`**Running (${running.length}):** ${running.join(", ")}`);
    }
    if (stopped.length > 0) {
      parts.push(`**Stopped (${stopped.length}):** ${stopped.join(", ")}`);
    }
    if (parts.length === 0) {
      return "No DDEV projects found.";
    }
    return parts.join("\n\n");
  },

  open_site_success: (name: string) => `Opening **${name}** in your browser...`,

  need_project_name: (action: string) => `Which project would you like to ${action}?`,

  unknown_intent: () =>
    `I'm not sure what you'd like to do. Try commands like:\n- "start myproject"\n- "stop all"\n- "list projects"\n- "what is DDEV?"`,

  model_loading: () => `Just a moment, I'm loading my brain...`,

  error: (message: string) => `Sorry, something went wrong: ${message}`,
};
