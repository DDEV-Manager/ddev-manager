/**
 * DDEV TypeScript Types
 * Based on DDEV CLI JSON output
 */

// Project status types
export type ProjectStatus = "running" | "stopped" | "paused" | "starting" | "stopping";

// Project type (CMS/framework)
export type ProjectType =
  | "drupal"
  | "drupal6"
  | "drupal7"
  | "drupal8"
  | "drupal9"
  | "drupal10"
  | "drupal11"
  | "wordpress"
  | "typo3"
  | "backdrop"
  | "magento"
  | "magento2"
  | "laravel"
  | "shopware6"
  | "php"
  | string;

// Service status
export type ServiceStatus =
  | "running"
  | "stopped"
  | "starting"
  | "stopping"
  | "healthy"
  | "unhealthy";

// Host port mapping
export interface HostPortMapping {
  exposed_port: string;
  host_port: string;
}

// Service information
export interface DdevService {
  short_name: string;
  full_name: string;
  image: string;
  status: ServiceStatus;
  exposed_ports: string;
  host_ports: string;
  host_ports_mapping: HostPortMapping[];
  http_url?: string;
  https_url?: string;
  host_http_url?: string;
  host_https_url?: string;
  virtual_host?: string;
  "describe-info"?: string;
  "describe-url-port"?: string;
}

// Database information
export interface DdevDatabaseInfo {
  database_type: string;
  database_version: string;
  host: string;
  dbPort: string;
  dbname: string;
  username: string;
  password: string;
  published_port: number;
}

// Project from list command (basic info)
export interface DdevProjectBasic {
  name: string;
  status: ProjectStatus;
  status_desc: string;
  type: ProjectType;
  approot: string;
  shortroot: string;
  docroot: string;
  primary_url: string;
  httpurl: string;
  httpsurl: string;
  mailpit_url: string;
  mailpit_https_url: string;
  xhgui_url: string;
  xhgui_https_url: string;
  router: string;
  router_disabled: boolean;
  mutagen_enabled: boolean;
  nodejs_version: string;
}

// Project from describe command (detailed info)
export interface DdevProjectDetails extends DdevProjectBasic {
  hostname: string;
  hostnames: string[];
  httpURLs: string[];
  httpsURLs: string[];
  urls: string[];
  php_version: string;
  webserver_type: string;
  database_type: string;
  database_version: string;
  performance_mode: string;
  webimg: string;
  dbimg: string;
  router_http_port: string;
  router_https_port: string;
  router_status: string;
  router_status_log: string;
  ssh_agent_status: string;
  xdebug_enabled: boolean;
  xhgui_status: string;
  xhprof_mode: string;
  fail_on_hook_fail: boolean;
  dbinfo: DdevDatabaseInfo;
  services: Record<string, DdevService>;
}

// Snapshot information
export interface DdevSnapshot {
  name: string;
  project: string;
  created: string;
  size?: string;
}

// Add-on information
export interface DdevAddon {
  name: string;
  repository: string;
  version?: string;
  installed: boolean;
  description?: string;
}

// DDEV version information
export interface DdevVersionInfo {
  ddev_version: string;
  architecture: string;
  docker: string;
  docker_api: string;
  docker_compose: string;
  docker_platform: string;
  mutagen: string;
  os: string;
  router: string;
  web: string;
  db: string;
}

// JSON response wrapper (DDEV outputs logs with this structure)
export interface DdevJsonResponse<T> {
  level: string;
  msg: string;
  raw: T;
  time: string;
}

// List projects response
export type DdevListResponse = DdevJsonResponse<DdevProjectBasic[]>;

// Describe project response
export type DdevDescribeResponse = DdevJsonResponse<DdevProjectDetails>;

// UI-specific types
export interface ProjectFilter {
  search: string;
  status: ProjectStatus | "all";
  type: ProjectType | "all";
}

export interface SortOption {
  field: "name" | "status" | "type";
  direction: "asc" | "desc";
}
