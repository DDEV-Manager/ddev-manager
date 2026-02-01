import { useRef, type KeyboardEvent } from "react";
import { Search, Filter, AlertCircle, Loader2 } from "lucide-react";
import { useProjects } from "@/hooks/useDdev";
import { useAppStore, filterProjects } from "@/stores/appStore";
import { ProjectCard } from "./ProjectCard";

export function ProjectList() {
  const { data: projects, isLoading, error } = useProjects();
  const { selectedProject, setSelectedProject, filter, setFilter, sort } = useAppStore();
  const listRef = useRef<HTMLDivElement>(null);
  const projectRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Filter and sort projects
  const filteredProjects = projects ? filterProjects(projects, filter, sort) : [];

  const handleListKeyDown = (e: KeyboardEvent) => {
    if (!filteredProjects.length) return;

    const currentIndex = selectedProject
      ? filteredProjects.findIndex((p) => p.name === selectedProject)
      : -1;

    let newIndex: number | null = null;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        newIndex = currentIndex < filteredProjects.length - 1 ? currentIndex + 1 : 0;
        break;
      case "ArrowUp":
        e.preventDefault();
        newIndex = currentIndex > 0 ? currentIndex - 1 : filteredProjects.length - 1;
        break;
      case "Home":
        e.preventDefault();
        newIndex = 0;
        break;
      case "End":
        e.preventDefault();
        newIndex = filteredProjects.length - 1;
        break;
    }

    if (newIndex !== null) {
      const newProject = filteredProjects[newIndex];
      setSelectedProject(newProject.name);
      // Scroll the selected project into view
      projectRefs.current.get(newProject.name)?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-gray-500 dark:text-gray-400">
        <Loader2 className="mb-2 h-8 w-8 animate-spin" />
        <p className="text-sm">Loading projects...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-4 text-red-500">
        <AlertCircle className="mb-2 h-8 w-8" />
        <p className="text-sm font-medium">Failed to load projects</p>
        <p className="mt-1 text-xs text-gray-500">
          {error instanceof Error ? error.message : "Unknown error"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Search and filter bar */}
      <div className="border-b border-gray-200 p-3 dark:border-gray-800">
        <div className="relative">
          <Search
            className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
            aria-hidden="true"
          />
          <input
            type="text"
            placeholder="Search projects..."
            aria-label="Search projects"
            value={filter.search}
            onChange={(e) => setFilter({ search: e.target.value })}
            autoComplete="off"
            className="focus:ring-primary-500 w-full rounded-lg border-0 bg-gray-100 py-2 pr-4 pl-9 text-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:outline-none dark:bg-gray-800 dark:text-gray-100"
          />
        </div>

        {/* Filter chips */}
        <div className="mt-2 flex items-center gap-2" role="group" aria-label="Status filters">
          <button
            onClick={() => setFilter({ status: filter.status === "running" ? "all" : "running" })}
            aria-pressed={filter.status === "running"}
            className={`rounded-full px-2 py-1 text-xs transition-colors ${
              filter.status === "running"
                ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
            }`}
          >
            Running
          </button>
          <button
            onClick={() => setFilter({ status: filter.status === "stopped" ? "all" : "stopped" })}
            aria-pressed={filter.status === "stopped"}
            className={`rounded-full px-2 py-1 text-xs transition-colors ${
              filter.status === "stopped"
                ? "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
            }`}
          >
            Stopped
          </button>
        </div>
      </div>

      {/* Project list */}
      <div
        ref={listRef}
        role="listbox"
        aria-label="Projects"
        aria-activedescendant={selectedProject ? `project-${selectedProject}` : undefined}
        tabIndex={filteredProjects.length > 0 ? 0 : -1}
        onKeyDown={handleListKeyDown}
        className="focus-visible:ring-primary-500 flex-1 space-y-2 overflow-y-auto p-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset"
      >
        {filteredProjects.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center text-gray-500 dark:text-gray-400">
            <Filter className="mb-2 h-6 w-6 opacity-50" aria-hidden="true" />
            <p className="text-sm">No projects found</p>
            {filter.search && (
              <button
                onClick={() => setFilter({ search: "" })}
                className="text-primary-500 hover:text-primary-600 mt-1 text-xs"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          filteredProjects.map((project) => (
            <ProjectCard
              key={project.name}
              ref={(el) => {
                if (el) projectRefs.current.set(project.name, el);
                else projectRefs.current.delete(project.name);
              }}
              project={project}
              isSelected={selectedProject === project.name}
              onSelect={() => setSelectedProject(project.name)}
            />
          ))
        )}
      </div>

      {/* Stats bar */}
      <div className="border-t border-gray-200 px-3 py-2 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
        {projects?.length ?? 0} projects
        {filter.search || filter.status !== "all" ? ` (${filteredProjects.length} shown)` : ""}
      </div>
    </div>
  );
}
