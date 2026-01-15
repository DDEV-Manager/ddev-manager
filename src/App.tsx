import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { ProjectList } from "@/components/projects/ProjectList";
import { ProjectDetails } from "@/components/projects/ProjectDetails";
import { Terminal } from "@/components/terminal/Terminal";
import { useDdevInstalled } from "@/hooks/useDdev";
import { useTerminalStore } from "@/stores/terminalStore";
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Checking DDEV installation...
          </p>
        </div>
      </div>
    );
  }

  if (!isInstalled) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-950">
        <div className="text-center max-w-md p-6">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            DDEV Not Found
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            DDEV is not installed or not in your PATH. Please install DDEV to use this application.
          </p>
          <a
            href="https://ddev.readthedocs.io/en/stable/users/install/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Install DDEV
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Project List */}
        <aside className="w-80 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-shrink-0">
          <ProjectList />
        </aside>

        {/* Main content - Project Details */}
        <main className="flex-1 bg-white dark:bg-gray-900 overflow-hidden flex flex-col">
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
    </QueryClientProvider>
  );
}

export default App;
