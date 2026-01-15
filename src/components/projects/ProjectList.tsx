import { Search, Filter, AlertCircle, Loader2 } from "lucide-react";
import { useProjects } from "@/hooks/useDdev";
import { useAppStore, filterProjects } from "@/stores/appStore";
import { ProjectCard } from "./ProjectCard";

export function ProjectList() {
  const { data: projects, isLoading, error } = useProjects();
  const {
    selectedProject,
    setSelectedProject,
    filter,
    setFilter,
    sort,
  } = useAppStore();

  // Filter and sort projects
  const filteredProjects = projects
    ? filterProjects(projects, filter, sort)
    : [];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin mb-2" />
        <p className="text-sm">Loading projects...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-red-500 p-4">
        <AlertCircle className="w-8 h-8 mb-2" />
        <p className="text-sm font-medium">Failed to load projects</p>
        <p className="text-xs text-gray-500 mt-1">
          {error instanceof Error ? error.message : "Unknown error"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search and filter bar */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search projects..."
            value={filter.search}
            onChange={(e) => setFilter({ search: e.target.value })}
            className="w-full pl-9 pr-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 placeholder-gray-500"
          />
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={() => setFilter({ status: filter.status === "all" ? "running" : "all" })}
            className={`px-2 py-1 text-xs rounded-full transition-colors ${
              filter.status === "running"
                ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            Running
          </button>
          <button
            onClick={() => setFilter({ status: filter.status === "all" ? "stopped" : "all" })}
            className={`px-2 py-1 text-xs rounded-full transition-colors ${
              filter.status === "stopped"
                ? "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            Stopped
          </button>
        </div>
      </div>

      {/* Project list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500 dark:text-gray-400">
            <Filter className="w-6 h-6 mb-2 opacity-50" />
            <p className="text-sm">No projects found</p>
            {filter.search && (
              <button
                onClick={() => setFilter({ search: "" })}
                className="text-xs text-blue-500 hover:text-blue-600 mt-1"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          filteredProjects.map((project) => (
            <ProjectCard
              key={project.name}
              project={project}
              isSelected={selectedProject === project.name}
              onSelect={() => setSelectedProject(project.name)}
            />
          ))
        )}
      </div>

      {/* Stats bar */}
      <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400">
        {projects?.length ?? 0} projects
        {filter.search || filter.status !== "all"
          ? ` (${filteredProjects.length} shown)`
          : ""}
      </div>
    </div>
  );
}
