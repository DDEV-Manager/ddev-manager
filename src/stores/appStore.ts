import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ProjectFilter, SortOption } from "@/types/ddev";

interface AppState {
  // Selected project
  selectedProject: string | null;
  setSelectedProject: (name: string | null) => void;

  // Filter state
  filter: ProjectFilter;
  setFilter: (filter: Partial<ProjectFilter>) => void;
  resetFilter: () => void;

  // Sort state
  sort: SortOption;
  setSort: (sort: SortOption) => void;

  // UI state
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  // Theme
  theme: "light" | "dark" | "system";
  setTheme: (theme: "light" | "dark" | "system") => void;
}

const defaultFilter: ProjectFilter = {
  search: "",
  status: "all",
  type: "all",
};

const defaultSort: SortOption = {
  field: "name",
  direction: "asc",
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Selected project
      selectedProject: null,
      setSelectedProject: (name) => set({ selectedProject: name }),

      // Filter state
      filter: defaultFilter,
      setFilter: (newFilter) =>
        set((state) => ({
          filter: { ...state.filter, ...newFilter },
        })),
      resetFilter: () => set({ filter: defaultFilter }),

      // Sort state
      sort: defaultSort,
      setSort: (sort) => set({ sort }),

      // UI state
      sidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      // Theme
      theme: "system",
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: "ddev-manager-storage",
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        sort: state.sort,
      }),
    }
  )
);

// Selector for filtered projects
export function filterProjects<T extends { name: string; status: string; type?: string }>(
  projects: T[],
  filter: ProjectFilter,
  sort: SortOption
): T[] {
  let filtered = [...projects];

  // Apply search filter
  if (filter.search) {
    const search = filter.search.toLowerCase();
    filtered = filtered.filter((p) => p.name.toLowerCase().includes(search));
  }

  // Apply status filter
  if (filter.status !== "all") {
    filtered = filtered.filter((p) => p.status === filter.status);
  }

  // Apply type filter
  if (filter.type !== "all") {
    filtered = filtered.filter((p) => p.type === filter.type);
  }

  // Apply sorting
  filtered.sort((a, b) => {
    let comparison = 0;

    switch (sort.field) {
      case "name":
        comparison = a.name.localeCompare(b.name);
        break;
      case "status":
        comparison = a.status.localeCompare(b.status);
        break;
      case "type":
        comparison = (a.type ?? "").localeCompare(b.type ?? "");
        break;
    }

    return sort.direction === "asc" ? comparison : -comparison;
  });

  return filtered;
}
