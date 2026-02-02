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
  theme: "light" | "dark" | "high-contrast" | "system";
  setTheme: (theme: "light" | "dark" | "high-contrast" | "system") => void;

  // Zoom (percentage: 50-200)
  zoom: number;
  setZoom: (zoom: number) => void;

  // Auto-update
  autoUpdateEnabled: boolean;
  setAutoUpdateEnabled: (enabled: boolean) => void;
  lastUpdateCheck: number | null;
  setLastUpdateCheck: (timestamp: number | null) => void;
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

      // Zoom
      zoom: 100,
      setZoom: (zoom) => set({ zoom: Math.min(200, Math.max(50, zoom)) }),

      // Auto-update
      autoUpdateEnabled: true,
      setAutoUpdateEnabled: (enabled) => set({ autoUpdateEnabled: enabled }),
      lastUpdateCheck: null,
      setLastUpdateCheck: (timestamp) => set({ lastUpdateCheck: timestamp }),
    }),
    {
      name: "ddev-manager-storage",
      partialize: (state) => ({
        theme: state.theme,
        zoom: state.zoom,
        sidebarCollapsed: state.sidebarCollapsed,
        sort: state.sort,
        autoUpdateEnabled: state.autoUpdateEnabled,
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

  // Apply sorting: always sort by status first (running on top), then by selected field
  filtered.sort((a, b) => {
    // Primary sort: running projects first
    const aRunning = a.status === "running" ? 0 : 1;
    const bRunning = b.status === "running" ? 0 : 1;
    if (aRunning !== bRunning) {
      return aRunning - bRunning;
    }

    // Secondary sort: by selected field
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
