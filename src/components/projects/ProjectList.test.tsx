import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { invoke } from "@tauri-apps/api/core";
import { render } from "@/test/utils";
import { ProjectList } from "./ProjectList";
import { setupInvokeMock, createMockProjectBasic } from "@/test/mocks";
import { useAppStore } from "@/stores/appStore";

vi.mock("@tauri-apps/api/core");

describe("ProjectList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.getState().setFilter({ search: "", status: "all" });
    useAppStore.getState().setSelectedProject(null);
  });

  describe("loading state", () => {
    it("should show loading spinner while fetching projects", async () => {
      setupInvokeMock(vi.mocked(invoke), {
        list_projects: new Promise(() => {}), // Never resolves
      });

      render(<ProjectList />);

      expect(screen.getByText("Loading projects...")).toBeInTheDocument();
    });
  });

  describe("error state", () => {
    it("should show error message when fetch fails", async () => {
      setupInvokeMock(vi.mocked(invoke), {
        list_projects: Promise.reject(new Error("Network error")),
      });

      render(<ProjectList />);

      await waitFor(() => {
        expect(screen.getByText("Failed to load projects")).toBeInTheDocument();
      });
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });

    it("should show generic error message for unknown errors", async () => {
      setupInvokeMock(vi.mocked(invoke), {
        list_projects: Promise.reject("Something went wrong"),
      });

      render(<ProjectList />);

      await waitFor(() => {
        expect(screen.getByText("Failed to load projects")).toBeInTheDocument();
      });
      expect(screen.getByText("Unknown error")).toBeInTheDocument();
    });
  });

  describe("project list display", () => {
    it("should render list of projects", async () => {
      const projects = [
        createMockProjectBasic({ name: "project-one", status: "running" }),
        createMockProjectBasic({ name: "project-two", status: "stopped" }),
      ];
      setupInvokeMock(vi.mocked(invoke), { list_projects: projects });

      render(<ProjectList />);

      await waitFor(() => {
        expect(screen.getByText("project-one")).toBeInTheDocument();
      });
      expect(screen.getByText("project-two")).toBeInTheDocument();
    });

    it("should show project count in stats bar", async () => {
      const projects = [
        createMockProjectBasic({ name: "project-one" }),
        createMockProjectBasic({ name: "project-two" }),
        createMockProjectBasic({ name: "project-three" }),
      ];
      setupInvokeMock(vi.mocked(invoke), { list_projects: projects });

      render(<ProjectList />);

      await waitFor(() => {
        expect(screen.getByText("3 projects")).toBeInTheDocument();
      });
    });

    it("should show empty state when no projects exist", async () => {
      setupInvokeMock(vi.mocked(invoke), { list_projects: [] });

      render(<ProjectList />);

      await waitFor(() => {
        expect(screen.getByText("No projects found")).toBeInTheDocument();
      });
    });
  });

  describe("search functionality", () => {
    it("should filter projects by search term", async () => {
      const user = userEvent.setup();
      const projects = [
        createMockProjectBasic({ name: "my-drupal-site" }),
        createMockProjectBasic({ name: "wordpress-blog" }),
      ];
      setupInvokeMock(vi.mocked(invoke), { list_projects: projects });

      render(<ProjectList />);

      await waitFor(() => {
        expect(screen.getByText("my-drupal-site")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search projects...");
      await user.type(searchInput, "drupal");

      expect(screen.getByText("my-drupal-site")).toBeInTheDocument();
      expect(screen.queryByText("wordpress-blog")).not.toBeInTheDocument();
    });

    it("should show filtered count when search is active", async () => {
      const user = userEvent.setup();
      const projects = [
        createMockProjectBasic({ name: "my-drupal-site" }),
        createMockProjectBasic({ name: "wordpress-blog" }),
      ];
      setupInvokeMock(vi.mocked(invoke), { list_projects: projects });

      render(<ProjectList />);

      await waitFor(() => {
        expect(screen.getByText("2 projects")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search projects...");
      await user.type(searchInput, "drupal");

      expect(screen.getByText("2 projects (1 shown)")).toBeInTheDocument();
    });

    it("should show clear search button when search yields no results", async () => {
      const user = userEvent.setup();
      const projects = [createMockProjectBasic({ name: "my-project" })];
      setupInvokeMock(vi.mocked(invoke), { list_projects: projects });

      render(<ProjectList />);

      await waitFor(() => {
        expect(screen.getByText("my-project")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search projects...");
      await user.type(searchInput, "nonexistent");

      expect(screen.getByText("No projects found")).toBeInTheDocument();
      expect(screen.getByText("Clear search")).toBeInTheDocument();
    });

    it("should clear search when clear button is clicked", async () => {
      const user = userEvent.setup();
      const projects = [createMockProjectBasic({ name: "my-project" })];
      setupInvokeMock(vi.mocked(invoke), { list_projects: projects });

      render(<ProjectList />);

      await waitFor(() => {
        expect(screen.getByText("my-project")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search projects...");
      await user.type(searchInput, "nonexistent");
      await user.click(screen.getByText("Clear search"));

      expect(screen.getByText("my-project")).toBeInTheDocument();
    });
  });

  describe("status filter", () => {
    it("should filter by running status", async () => {
      const user = userEvent.setup();
      const projects = [
        createMockProjectBasic({ name: "running-project", status: "running" }),
        createMockProjectBasic({ name: "stopped-project", status: "stopped" }),
      ];
      setupInvokeMock(vi.mocked(invoke), { list_projects: projects });

      render(<ProjectList />);

      await waitFor(() => {
        expect(screen.getByText("running-project")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Running"));

      expect(screen.getByText("running-project")).toBeInTheDocument();
      expect(screen.queryByText("stopped-project")).not.toBeInTheDocument();
    });

    it("should filter by stopped status", async () => {
      const user = userEvent.setup();
      const projects = [
        createMockProjectBasic({ name: "running-project", status: "running" }),
        createMockProjectBasic({ name: "stopped-project", status: "stopped" }),
      ];
      setupInvokeMock(vi.mocked(invoke), { list_projects: projects });

      render(<ProjectList />);

      await waitFor(() => {
        expect(screen.getByText("stopped-project")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Stopped"));

      expect(screen.queryByText("running-project")).not.toBeInTheDocument();
      expect(screen.getByText("stopped-project")).toBeInTheDocument();
    });

    it("should toggle filter off when clicked again", async () => {
      const user = userEvent.setup();
      const projects = [
        createMockProjectBasic({ name: "running-project", status: "running" }),
        createMockProjectBasic({ name: "stopped-project", status: "stopped" }),
      ];
      setupInvokeMock(vi.mocked(invoke), { list_projects: projects });

      render(<ProjectList />);

      await waitFor(() => {
        expect(screen.getByText("running-project")).toBeInTheDocument();
      });

      // Enable filter
      await user.click(screen.getByText("Running"));
      expect(screen.queryByText("stopped-project")).not.toBeInTheDocument();

      // Disable filter
      await user.click(screen.getByText("Running"));
      expect(screen.getByText("running-project")).toBeInTheDocument();
      expect(screen.getByText("stopped-project")).toBeInTheDocument();
    });
  });

  describe("project selection", () => {
    it("should select project when clicked", async () => {
      const user = userEvent.setup();
      const projects = [createMockProjectBasic({ name: "my-project" })];
      setupInvokeMock(vi.mocked(invoke), { list_projects: projects });

      render(<ProjectList />);

      await waitFor(() => {
        expect(screen.getByText("my-project")).toBeInTheDocument();
      });

      await user.click(screen.getByText("my-project"));

      expect(useAppStore.getState().selectedProject).toBe("my-project");
    });
  });
});
