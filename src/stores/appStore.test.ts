import { describe, it, expect, beforeEach } from "vitest";
import { useAppStore, filterProjects } from "./appStore";
import type { ProjectFilter, SortOption } from "@/types/ddev";

describe("useAppStore", () => {
  // Reset store state before each test
  beforeEach(() => {
    const store = useAppStore.getState();
    store.setSelectedProject(null);
    store.resetFilter();
    store.setSort({ field: "name", direction: "asc" });
    store.setTheme("system");
    // Reset sidebar if it was collapsed
    if (store.sidebarCollapsed) {
      store.toggleSidebar();
    }
  });

  describe("selectedProject", () => {
    it("should start with null selected project", () => {
      const { selectedProject } = useAppStore.getState();
      expect(selectedProject).toBeNull();
    });

    it("should set selected project", () => {
      const { setSelectedProject } = useAppStore.getState();
      setSelectedProject("my-project");
      expect(useAppStore.getState().selectedProject).toBe("my-project");
    });

    it("should clear selected project", () => {
      const { setSelectedProject } = useAppStore.getState();
      setSelectedProject("my-project");
      setSelectedProject(null);
      expect(useAppStore.getState().selectedProject).toBeNull();
    });
  });

  describe("filter", () => {
    it("should have default filter values", () => {
      const { filter } = useAppStore.getState();
      expect(filter).toEqual({
        search: "",
        status: "all",
        type: "all",
      });
    });

    it("should update search filter", () => {
      const { setFilter } = useAppStore.getState();
      setFilter({ search: "test" });
      expect(useAppStore.getState().filter.search).toBe("test");
    });

    it("should update status filter", () => {
      const { setFilter } = useAppStore.getState();
      setFilter({ status: "running" });
      expect(useAppStore.getState().filter.status).toBe("running");
    });

    it("should update type filter", () => {
      const { setFilter } = useAppStore.getState();
      setFilter({ type: "drupal10" });
      expect(useAppStore.getState().filter.type).toBe("drupal10");
    });

    it("should merge partial filter updates", () => {
      const { setFilter } = useAppStore.getState();
      setFilter({ search: "test" });
      setFilter({ status: "running" });
      const { filter } = useAppStore.getState();
      expect(filter.search).toBe("test");
      expect(filter.status).toBe("running");
    });

    it("should reset filter to defaults", () => {
      const { setFilter, resetFilter } = useAppStore.getState();
      setFilter({ search: "test", status: "running", type: "drupal10" });
      resetFilter();
      expect(useAppStore.getState().filter).toEqual({
        search: "",
        status: "all",
        type: "all",
      });
    });
  });

  describe("sort", () => {
    it("should have default sort values", () => {
      const { sort } = useAppStore.getState();
      expect(sort).toEqual({ field: "name", direction: "asc" });
    });

    it("should update sort options", () => {
      const { setSort } = useAppStore.getState();
      setSort({ field: "status", direction: "desc" });
      expect(useAppStore.getState().sort).toEqual({
        field: "status",
        direction: "desc",
      });
    });
  });

  describe("sidebarCollapsed", () => {
    it("should start with sidebar expanded", () => {
      expect(useAppStore.getState().sidebarCollapsed).toBe(false);
    });

    it("should toggle sidebar state", () => {
      const { toggleSidebar } = useAppStore.getState();
      toggleSidebar();
      expect(useAppStore.getState().sidebarCollapsed).toBe(true);
      toggleSidebar();
      expect(useAppStore.getState().sidebarCollapsed).toBe(false);
    });
  });

  describe("theme", () => {
    it("should default to system theme", () => {
      expect(useAppStore.getState().theme).toBe("system");
    });

    it("should set theme", () => {
      const { setTheme } = useAppStore.getState();
      setTheme("dark");
      expect(useAppStore.getState().theme).toBe("dark");
      setTheme("light");
      expect(useAppStore.getState().theme).toBe("light");
    });
  });
});

describe("filterProjects", () => {
  const mockProjects = [
    { name: "alpha-project", status: "running", type: "drupal10" },
    { name: "beta-project", status: "stopped", type: "wordpress" },
    { name: "gamma-project", status: "running", type: "drupal10" },
    { name: "delta-project", status: "paused", type: "laravel" },
  ];

  const defaultFilter: ProjectFilter = { search: "", status: "all", type: "all" };
  const defaultSort: SortOption = { field: "name", direction: "asc" };

  describe("search filtering", () => {
    it("should filter by search term (case-insensitive)", () => {
      const result = filterProjects(
        mockProjects,
        { ...defaultFilter, search: "alpha" },
        defaultSort
      );
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("alpha-project");
    });

    it("should return all projects when search is empty", () => {
      const result = filterProjects(mockProjects, defaultFilter, defaultSort);
      expect(result).toHaveLength(4);
    });

    it("should handle uppercase search terms", () => {
      const result = filterProjects(
        mockProjects,
        { ...defaultFilter, search: "BETA" },
        defaultSort
      );
      expect(result).toHaveLength(1);
    });

    it("should return empty array when no matches", () => {
      const result = filterProjects(
        mockProjects,
        { ...defaultFilter, search: "nonexistent" },
        defaultSort
      );
      expect(result).toHaveLength(0);
    });
  });

  describe("status filtering", () => {
    it("should filter by running status", () => {
      const result = filterProjects(
        mockProjects,
        { ...defaultFilter, status: "running" },
        defaultSort
      );
      expect(result).toHaveLength(2);
      expect(result.every((p) => p.status === "running")).toBe(true);
    });

    it("should filter by stopped status", () => {
      const result = filterProjects(
        mockProjects,
        { ...defaultFilter, status: "stopped" },
        defaultSort
      );
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("beta-project");
    });

    it("should return all when status is 'all'", () => {
      const result = filterProjects(mockProjects, { ...defaultFilter, status: "all" }, defaultSort);
      expect(result).toHaveLength(4);
    });
  });

  describe("type filtering", () => {
    it("should filter by project type", () => {
      const result = filterProjects(
        mockProjects,
        { ...defaultFilter, type: "drupal10" },
        defaultSort
      );
      expect(result).toHaveLength(2);
      expect(result.every((p) => p.type === "drupal10")).toBe(true);
    });

    it("should return all when type is 'all'", () => {
      const result = filterProjects(mockProjects, { ...defaultFilter, type: "all" }, defaultSort);
      expect(result).toHaveLength(4);
    });
  });

  describe("combined filtering", () => {
    it("should apply multiple filters", () => {
      const result = filterProjects(
        mockProjects,
        { search: "project", status: "running", type: "drupal10" },
        defaultSort
      );
      expect(result).toHaveLength(2);
    });
  });

  describe("sorting", () => {
    it("should sort by name ascending", () => {
      const result = filterProjects(mockProjects, defaultFilter, {
        field: "name",
        direction: "asc",
      });
      expect(result[0].name).toBe("alpha-project");
      expect(result[3].name).toBe("gamma-project");
    });

    it("should sort by name descending", () => {
      const result = filterProjects(mockProjects, defaultFilter, {
        field: "name",
        direction: "desc",
      });
      expect(result[0].name).toBe("gamma-project");
      expect(result[3].name).toBe("alpha-project");
    });

    it("should sort by status", () => {
      const result = filterProjects(mockProjects, defaultFilter, {
        field: "status",
        direction: "asc",
      });
      expect(result[0].status).toBe("paused");
    });

    it("should sort by type", () => {
      const result = filterProjects(mockProjects, defaultFilter, {
        field: "type",
        direction: "asc",
      });
      expect(result[0].type).toBe("drupal10");
    });

    it("should handle undefined type in sorting", () => {
      const projectsWithUndefinedType = [
        ...mockProjects,
        { name: "zeta-project", status: "running", type: undefined },
      ];
      const result = filterProjects(
        projectsWithUndefinedType as typeof mockProjects,
        defaultFilter,
        {
          field: "type",
          direction: "asc",
        }
      );
      expect(result).toHaveLength(5);
    });
  });

  it("should not mutate the original array", () => {
    const original = [...mockProjects];
    filterProjects(mockProjects, defaultFilter, {
      field: "name",
      direction: "desc",
    });
    expect(mockProjects).toEqual(original);
  });
});
