import { useCallback } from "react";
import { useChatStore } from "@/stores/chatStore";
import { useModelLoader } from "./useModelLoader";
import {
  useProjects,
  useStartProject,
  useStopProject,
  useRestartProject,
  usePoweroff,
  useOpenUrl,
} from "./useDdev";
import {
  classifyIntentByKeywords,
  RESPONSE_TEMPLATES,
  SYSTEM_PROMPT,
  type ClassifiedIntent,
} from "@/lib/ai/intents";
import { findBestProjectMatch, findAllProjectMatches } from "@/lib/ai/projectMatcher";

export function useAIChat() {
  const { loadModel, generate, isReady } = useModelLoader();
  const { data: projects } = useProjects();
  const { addMessage, setLoading, modelStatus } = useChatStore();

  // DDEV action hooks
  const startProject = useStartProject();
  const stopProject = useStopProject();
  const restartProject = useRestartProject();
  const poweroff = usePoweroff();
  const openUrl = useOpenUrl();

  /**
   * Execute an action based on the classified intent
   */
  const executeAction = useCallback(
    async (intent: ClassifiedIntent): Promise<string> => {
      const projectList = projects || [];

      switch (intent.type) {
        case "start_project": {
          if (!intent.projectName) {
            return RESPONSE_TEMPLATES.need_project_name("start");
          }

          const match = findBestProjectMatch(intent.projectName, projectList);
          if (!match) {
            const suggestions = findAllProjectMatches(intent.projectName, projectList, 0.7)
              .slice(0, 3)
              .map((m) => m.project.name);
            return RESPONSE_TEMPLATES.start_not_found(intent.projectName, suggestions);
          }

          if (match.project.status === "running") {
            return RESPONSE_TEMPLATES.start_already_running(match.project.name);
          }

          startProject.mutate(match.project.name);
          return RESPONSE_TEMPLATES.start_success(match.project.name);
        }

        case "stop_project": {
          if (!intent.projectName) {
            return RESPONSE_TEMPLATES.need_project_name("stop");
          }

          const match = findBestProjectMatch(intent.projectName, projectList);
          if (!match) {
            const suggestions = findAllProjectMatches(intent.projectName, projectList, 0.7)
              .slice(0, 3)
              .map((m) => m.project.name);
            return RESPONSE_TEMPLATES.start_not_found(intent.projectName, suggestions);
          }

          if (match.project.status !== "running") {
            return RESPONSE_TEMPLATES.stop_already_stopped(match.project.name);
          }

          stopProject.mutate(match.project.name);
          return RESPONSE_TEMPLATES.stop_success(match.project.name);
        }

        case "stop_all": {
          const runningProjects = projectList.filter((p) => p.status === "running");
          if (runningProjects.length === 0) {
            return RESPONSE_TEMPLATES.stop_all_success(0);
          }

          poweroff.mutate();
          return RESPONSE_TEMPLATES.stop_all_success(runningProjects.length);
        }

        case "restart_project": {
          if (!intent.projectName) {
            return RESPONSE_TEMPLATES.need_project_name("restart");
          }

          const match = findBestProjectMatch(intent.projectName, projectList);
          if (!match) {
            const suggestions = findAllProjectMatches(intent.projectName, projectList, 0.7)
              .slice(0, 3)
              .map((m) => m.project.name);
            return RESPONSE_TEMPLATES.start_not_found(intent.projectName, suggestions);
          }

          if (match.project.status !== "running") {
            return RESPONSE_TEMPLATES.restart_not_running(match.project.name);
          }

          restartProject.mutate(match.project.name);
          return RESPONSE_TEMPLATES.restart_success(match.project.name);
        }

        case "list_projects": {
          const running = projectList.filter((p) => p.status === "running").map((p) => p.name);
          const stopped = projectList.filter((p) => p.status !== "running").map((p) => p.name);
          return RESPONSE_TEMPLATES.list_projects(running, stopped);
        }

        case "describe_project": {
          if (!intent.projectName) {
            return RESPONSE_TEMPLATES.need_project_name("describe");
          }

          const match = findBestProjectMatch(intent.projectName, projectList);
          if (!match) {
            return RESPONSE_TEMPLATES.start_not_found(intent.projectName, []);
          }

          const p = match.project;
          return `**${p.name}**\n- Status: ${p.status}\n- Type: ${p.type}\n- Path: ${p.approot}`;
        }

        case "open_site": {
          if (!intent.projectName) {
            return RESPONSE_TEMPLATES.need_project_name("open");
          }

          const match = findBestProjectMatch(intent.projectName, projectList);
          if (!match) {
            return RESPONSE_TEMPLATES.start_not_found(intent.projectName, []);
          }

          if (match.project.status !== "running") {
            return `**${match.project.name}** is not running. Start it first to open the site.`;
          }

          // We need the full project details to get the URL
          // For now, construct a likely URL
          const url = `https://${match.project.name}.ddev.site`;
          openUrl.mutate(url);
          return RESPONSE_TEMPLATES.open_site_success(match.project.name);
        }

        case "qa_general": {
          // Use the model for Q&A if available
          if (isReady()) {
            const response = await generate(
              `${SYSTEM_PROMPT}\n\nUser: ${intent.rawMessage}\nAssistant:`,
              100
            );
            if (response) {
              return response;
            }
          }

          // Fallback responses for common questions
          const q = intent.rawMessage.toLowerCase();
          if (q.includes("what is ddev")) {
            return "DDEV is a Docker-based local development environment for PHP projects. It makes it easy to set up and manage local development environments for frameworks like Drupal, WordPress, Laravel, and more.";
          }
          if (q.includes("redis") || q.includes("add-on")) {
            return "You can install add-ons from the Add-ons tab in the project details. For Redis, look for `ddev-redis` in the Browse Registry.";
          }

          return "I can help you manage DDEV projects. Try commands like 'start myproject', 'stop all', or 'list projects'.";
        }

        case "unknown":
        default:
          return RESPONSE_TEMPLATES.unknown_intent();
      }
    },
    [projects, startProject, stopProject, restartProject, poweroff, openUrl, isReady, generate]
  );

  /**
   * Send a message and get a response
   */
  const sendMessage = useCallback(
    async (userMessage: string) => {
      if (!userMessage.trim()) return;

      // Add user message
      addMessage({ role: "user", content: userMessage });
      setLoading(true);

      try {
        // Classify intent using keywords (fast, always available)
        const intent = classifyIntentByKeywords(userMessage);

        // Execute action and get response
        const response = await executeAction(intent);

        // Add assistant response
        addMessage({ role: "assistant", content: response });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        addMessage({
          role: "assistant",
          content: RESPONSE_TEMPLATES.error(errorMessage),
        });
      } finally {
        setLoading(false);
      }
    },
    [addMessage, setLoading, executeAction]
  );

  /**
   * Initialize the chat with a welcome message
   */
  const initializeChat = useCallback(() => {
    const { messages } = useChatStore.getState();
    if (messages.length === 0) {
      addMessage({
        role: "assistant",
        content:
          "Hi! I can help you manage your DDEV projects. Try commands like:\n- **start [project]** - Start a project\n- **stop all** - Stop all projects\n- **list projects** - Show all projects\n\nWhat would you like to do?",
      });
    }
  }, [addMessage]);

  return {
    sendMessage,
    loadModel,
    initializeChat,
    modelStatus,
    isModelReady: isReady(),
  };
}
