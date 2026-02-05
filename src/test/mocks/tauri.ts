import { vi } from "vitest";
import type { DdevProjectBasic, DdevProjectDetails } from "@/types/ddev";

/**
 * Create a mock basic project for testing
 */
export const createMockProjectBasic = (
  overrides: Partial<DdevProjectBasic> = {}
): DdevProjectBasic => ({
  name: "test-project",
  status: "running",
  status_desc: "OK",
  type: "drupal10",
  approot: "/home/user/projects/test-project",
  shortroot: "~/projects/test-project",
  docroot: "web",
  primary_url: "https://test-project.ddev.site",
  httpurl: "http://test-project.ddev.site",
  httpsurl: "https://test-project.ddev.site",
  mailpit_url: "http://test-project.ddev.site:8025",
  mailpit_https_url: "https://test-project.ddev.site:8026",
  xhgui_url: "",
  xhgui_https_url: "",
  router: "traefik",
  router_disabled: false,
  mutagen_enabled: false,
  nodejs_version: "20",
  ...overrides,
});

/**
 * Create a mock detailed project for testing
 */
export const createMockProjectDetails = (
  overrides: Partial<DdevProjectDetails> = {}
): DdevProjectDetails => ({
  ...createMockProjectBasic(),
  hostname: "test-project.ddev.site",
  hostnames: ["test-project.ddev.site"],
  httpURLs: ["http://test-project.ddev.site"],
  httpsURLs: ["https://test-project.ddev.site"],
  urls: ["https://test-project.ddev.site"],
  php_version: "8.2",
  webserver_type: "nginx-fpm",
  database_type: "mariadb",
  database_version: "10.11",
  performance_mode: "mutagen",
  webimg: "ddev/ddev-webserver:v1.23.0",
  dbimg: "ddev/ddev-dbserver-mariadb-10.11:v1.23.0",
  router_http_port: "80",
  router_https_port: "443",
  router_status: "running",
  router_status_log: "",
  ssh_agent_status: "running",
  xdebug_enabled: false,
  xhgui_status: "disabled",
  xhprof_mode: "off",
  fail_on_hook_fail: false,
  dbinfo: {
    database_type: "mariadb",
    database_version: "10.11",
    host: "db",
    dbPort: "3306",
    dbname: "db",
    username: "db",
    password: "db",
    published_port: 32768,
  },
  services: {
    web: {
      short_name: "web",
      full_name: "ddev-test-project-web",
      image: "ddev/ddev-webserver:v1.23.0",
      status: "running",
      exposed_ports: "80,443",
      host_ports: "",
      host_ports_mapping: [],
    },
    db: {
      short_name: "db",
      full_name: "ddev-test-project-db",
      image: "ddev/ddev-dbserver-mariadb-10.11:v1.23.0",
      status: "running",
      exposed_ports: "3306",
      host_ports: "32768",
      host_ports_mapping: [{ exposed_port: "3306", host_port: "32768" }],
    },
  },
  ...overrides,
});

/**
 * Helper to setup invoke mock responses
 */
export function setupInvokeMock(
  invoke: ReturnType<typeof vi.fn>,
  handlers: Record<string, unknown>
) {
  invoke.mockImplementation((command: string, args?: unknown) => {
    if (command in handlers) {
      const handler = handlers[command];
      return typeof handler === "function" ? handler(args) : Promise.resolve(handler);
    }
    return Promise.reject(new Error(`Unhandled invoke command: ${command}`));
  });
}

/**
 * Default mock handlers for common commands
 */
export const defaultInvokeHandlers = {
  check_ddev_installed: true,
  get_ddev_version: "v1.23.0",
  list_projects: [createMockProjectBasic()],
  describe_project: createMockProjectDetails(),
  start_project: undefined,
  stop_project: undefined,
  restart_project: undefined,
  poweroff: undefined,
  open_project_url: undefined,
  open_project_folder: undefined,
  create_snapshot: "snapshot-20240101-120000",
  restore_snapshot: "Snapshot restored successfully",
  list_snapshots: "",
  toggle_service: undefined,
};
