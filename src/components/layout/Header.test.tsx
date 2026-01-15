import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { invoke } from "@tauri-apps/api/core";
import { render } from "@/test/utils";
import { Header } from "./Header";
import { setupInvokeMock, createMockProjectBasic } from "@/test/mocks";

vi.mock("@tauri-apps/api/core");

describe("Header", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the header with title", async () => {
    setupInvokeMock(vi.mocked(invoke), {
      list_projects: [],
    });

    render(<Header />);

    expect(screen.getByText("DDEV Manager")).toBeInTheDocument();
  });

  it("should show running count badge when projects are running", async () => {
    const mockProjects = [
      createMockProjectBasic({ name: "project-1", status: "running" }),
      createMockProjectBasic({ name: "project-2", status: "running" }),
      createMockProjectBasic({ name: "project-3", status: "stopped" }),
    ];

    setupInvokeMock(vi.mocked(invoke), {
      list_projects: mockProjects,
    });

    render(<Header />);

    await waitFor(() => {
      expect(screen.getByText("2 running")).toBeInTheDocument();
    });
  });

  it("should not show running badge when no projects are running", async () => {
    setupInvokeMock(vi.mocked(invoke), {
      list_projects: [createMockProjectBasic({ status: "stopped" })],
    });

    render(<Header />);

    await waitFor(() => {
      expect(screen.queryByText(/running/)).not.toBeInTheDocument();
    });
  });

  it("should have refresh button", async () => {
    setupInvokeMock(vi.mocked(invoke), {
      list_projects: [],
    });

    render(<Header />);

    const refreshButton = screen.getByTitle("Refresh projects");
    expect(refreshButton).toBeInTheDocument();
  });

  it("should have poweroff button disabled when no running projects", async () => {
    setupInvokeMock(vi.mocked(invoke), {
      list_projects: [createMockProjectBasic({ status: "stopped" })],
    });

    render(<Header />);

    await waitFor(() => {
      const poweroffButton = screen.getByTitle("Power off all projects");
      expect(poweroffButton).toBeDisabled();
    });
  });

  it("should have poweroff button enabled when projects are running", async () => {
    setupInvokeMock(vi.mocked(invoke), {
      list_projects: [createMockProjectBasic({ status: "running" })],
    });

    render(<Header />);

    await waitFor(() => {
      const poweroffButton = screen.getByTitle("Power off all projects");
      expect(poweroffButton).not.toBeDisabled();
    });
  });

  it("should call poweroff when confirmed", async () => {
    const user = userEvent.setup();

    setupInvokeMock(vi.mocked(invoke), {
      list_projects: [createMockProjectBasic({ status: "running" })],
      poweroff: undefined,
    });

    vi.stubGlobal("confirm", vi.fn(() => true));

    render(<Header />);

    await waitFor(() => {
      expect(screen.getByTitle("Power off all projects")).not.toBeDisabled();
    });

    const poweroffButton = screen.getByTitle("Power off all projects");
    await user.click(poweroffButton);

    expect(window.confirm).toHaveBeenCalled();
    expect(invoke).toHaveBeenCalledWith("poweroff");
  });

  it("should not call poweroff when cancelled", async () => {
    const user = userEvent.setup();

    setupInvokeMock(vi.mocked(invoke), {
      list_projects: [createMockProjectBasic({ status: "running" })],
    });

    vi.stubGlobal("confirm", vi.fn(() => false));

    render(<Header />);

    await waitFor(() => {
      expect(screen.getByTitle("Power off all projects")).not.toBeDisabled();
    });

    const poweroffButton = screen.getByTitle("Power off all projects");
    await user.click(poweroffButton);

    expect(window.confirm).toHaveBeenCalled();
    expect(invoke).not.toHaveBeenCalledWith("poweroff");
  });

  it("should have settings button", () => {
    setupInvokeMock(vi.mocked(invoke), {
      list_projects: [],
    });

    render(<Header />);

    expect(screen.getByTitle("Settings")).toBeInTheDocument();
  });
});
