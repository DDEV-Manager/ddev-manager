import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { invoke } from "@tauri-apps/api/core";
import { render } from "@/test/utils";
import { ProjectCard } from "./ProjectCard";
import { setupInvokeMock, createMockProjectBasic } from "@/test/mocks";

vi.mock("@tauri-apps/api/core");

describe("ProjectCard", () => {
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    setupInvokeMock(vi.mocked(invoke), {
      start_project: undefined,
      stop_project: undefined,
      restart_project: undefined,
      open_project_url: undefined,
      open_project_folder: undefined,
    });
  });

  it("should render project name", () => {
    const project = createMockProjectBasic({ name: "my-awesome-project" });

    render(<ProjectCard project={project} isSelected={false} onSelect={mockOnSelect} />);

    expect(screen.getByText("my-awesome-project")).toBeInTheDocument();
  });

  it("should render formatted project type", () => {
    const project = createMockProjectBasic({ type: "drupal10" });

    render(<ProjectCard project={project} isSelected={false} onSelect={mockOnSelect} />);

    expect(screen.getByText("Drupal 10")).toBeInTheDocument();
  });

  it("should render truncated path", () => {
    const project = createMockProjectBasic({
      shortroot: "~/very/long/path/to/mysite",
    });

    render(<ProjectCard project={project} isSelected={false} onSelect={mockOnSelect} />);

    // Path should be visible (possibly truncated)
    expect(screen.getByText(/mysite/)).toBeInTheDocument();
  });

  it("should call onSelect when clicked", async () => {
    const user = userEvent.setup();
    const project = createMockProjectBasic();

    render(<ProjectCard project={project} isSelected={false} onSelect={mockOnSelect} />);

    await user.click(screen.getByText(project.name));

    expect(mockOnSelect).toHaveBeenCalled();
  });

  it("should apply selected styles when isSelected is true", () => {
    const project = createMockProjectBasic();

    const { container } = render(
      <ProjectCard project={project} isSelected={true} onSelect={mockOnSelect} />
    );

    // Check for selected class (border-primary-500)
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("border-primary-500");
  });

  describe("running project", () => {
    it("should show stop and restart buttons", async () => {
      const project = createMockProjectBasic({ status: "running" });

      render(<ProjectCard project={project} isSelected={false} onSelect={mockOnSelect} />);

      expect(screen.getByTitle("Stop")).toBeInTheDocument();
      expect(screen.getByTitle("Restart")).toBeInTheDocument();
      expect(screen.getByTitle("Open in browser")).toBeInTheDocument();
    });

    it("should call stop_project when stop button clicked", async () => {
      const user = userEvent.setup();
      const project = createMockProjectBasic({
        name: "my-project",
        status: "running",
      });

      render(<ProjectCard project={project} isSelected={false} onSelect={mockOnSelect} />);

      await user.click(screen.getByTitle("Stop"));

      await waitFor(() => {
        expect(invoke).toHaveBeenCalledWith("stop_project", {
          name: "my-project",
        });
      });
    });

    it("should call restart_project when restart button clicked", async () => {
      const user = userEvent.setup();
      const project = createMockProjectBasic({
        name: "my-project",
        status: "running",
      });

      render(<ProjectCard project={project} isSelected={false} onSelect={mockOnSelect} />);

      await user.click(screen.getByTitle("Restart"));

      await waitFor(() => {
        expect(invoke).toHaveBeenCalledWith("restart_project", {
          name: "my-project",
        });
      });
    });

    it("should open URL when browser button clicked", async () => {
      const user = userEvent.setup();
      const project = createMockProjectBasic({
        status: "running",
        primary_url: "https://my-project.ddev.site",
      });

      render(<ProjectCard project={project} isSelected={false} onSelect={mockOnSelect} />);

      await user.click(screen.getByTitle("Open in browser"));

      await waitFor(() => {
        expect(invoke).toHaveBeenCalledWith("open_project_url", {
          url: "https://my-project.ddev.site",
        });
      });
    });
  });

  describe("stopped project", () => {
    it("should show start and folder buttons", () => {
      const project = createMockProjectBasic({ status: "stopped" });

      render(<ProjectCard project={project} isSelected={false} onSelect={mockOnSelect} />);

      expect(screen.getByTitle("Start")).toBeInTheDocument();
      expect(screen.getByTitle("Open folder")).toBeInTheDocument();
    });

    it("should call start_project when start button clicked", async () => {
      const user = userEvent.setup();
      const project = createMockProjectBasic({
        name: "my-project",
        status: "stopped",
      });

      render(<ProjectCard project={project} isSelected={false} onSelect={mockOnSelect} />);

      await user.click(screen.getByTitle("Start"));

      await waitFor(() => {
        expect(invoke).toHaveBeenCalledWith("start_project", {
          name: "my-project",
        });
      });
    });

    it("should open folder when folder button clicked", async () => {
      const user = userEvent.setup();
      const project = createMockProjectBasic({
        status: "stopped",
        approot: "/home/user/project",
      });

      render(<ProjectCard project={project} isSelected={false} onSelect={mockOnSelect} />);

      await user.click(screen.getByTitle("Open folder"));

      await waitFor(() => {
        expect(invoke).toHaveBeenCalledWith("open_project_folder", {
          path: "/home/user/project",
        });
      });
    });
  });

  it("should not trigger onSelect when action buttons are clicked", async () => {
    const user = userEvent.setup();
    const project = createMockProjectBasic({ status: "stopped" });

    render(<ProjectCard project={project} isSelected={false} onSelect={mockOnSelect} />);

    await user.click(screen.getByTitle("Start"));

    // onSelect should not be called because the event propagation is stopped
    expect(mockOnSelect).not.toHaveBeenCalled();
  });
});
