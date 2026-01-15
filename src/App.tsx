import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { ProjectList } from "@/components/projects/ProjectList";
import { ProjectDetails } from "@/components/projects/ProjectDetails";
import { Terminal } from "@/components/terminal/Terminal";
import { Toaster } from "@/components/ui/Toaster";
import { useDdevInstalled } from "@/hooks/useDdev";
import { useTerminalStore } from "@/stores/terminalStore";
import { useTheme } from "@/hooks/useTheme";
import { AlertCircle, Loader2 } from "lucide-react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 5, // 5 seconds
      retry: 1,
    },
  },
});

function AppContent() {
  const { data: isInstalled, isLoading } = useDdevInstalled();
  const { isOpen, close, toggle } = useTerminalStore();

  // Initialize theme and zoom settings
  useTheme();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Checking DDEV installation...</p>
        </div>
      </div>
    );
  }

  if (!isInstalled) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="max-w-md p-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
            DDEV Not Found
          </h1>
          <p className="mb-4 text-gray-500 dark:text-gray-400">
            DDEV is not installed or not in your PATH. Please install DDEV to use this application.
          </p>
          <a
            href="https://ddev.readthedocs.io/en/stable/users/install/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
          >
            Install DDEV
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-gray-50 dark:bg-gray-950">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Project List */}
        <aside className="w-80 flex-shrink-0 border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <ProjectList />
        </aside>

        {/* Main content - Project Details */}
        <main className="flex flex-1 flex-col overflow-hidden bg-white dark:bg-gray-900">
          <div className="flex-1 overflow-hidden">
            <ProjectDetails />
          </div>
        </main>
      </div>

      {/* Terminal Panel */}
      <Terminal isOpen={isOpen} onClose={close} onToggle={toggle} />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
