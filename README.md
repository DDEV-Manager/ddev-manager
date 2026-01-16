# DDEV Manager

A cross-platform desktop application for managing [DDEV](https://ddev.com/) local development environments. Built with Tauri, React, and TypeScript.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey.svg)
![Built with Tauri](https://img.shields.io/badge/built%20with-Tauri%202.x-blue.svg)

## Overview

DDEV Manager provides a standalone visual interface for managing DDEV projects. Unlike IDE extensions, it works for all developers regardless of their editor choice.

**Key Features:**

- View all DDEV projects with real-time status indicators
- Start, stop, and restart projects with one click
- Create new projects with optional CMS installation (Drupal, Laravel, Shopware, WordPress)
- Auto-detect project type for existing codebases
- View detailed project information (services, URLs, database credentials)
- Real-time terminal output for command execution
- Global status bar showing command progress with cancel support
- Cancel running commands (useful for stuck operations)
- Open project URLs and folders directly from the app
- Database snapshot management
- Add-on management (browse registry, install, remove - works even when project is stopped)
- Dark mode and zoom controls
- Cross-platform support (macOS, Windows, Linux)

## Screenshots

<!-- TODO: Add screenshots -->
*Screenshots coming soon*

## Installation

### Prerequisites

- [DDEV](https://ddev.readthedocs.io/en/stable/users/install/) must be installed and available in your PATH
- Docker must be running

### Download

Download the latest release for your platform from the [Releases](https://github.com/your-username/ddev-manager/releases) page:

- **macOS**: `DDEV Manager_x.x.x_aarch64.dmg` (Apple Silicon) or `DDEV Manager_x.x.x_x64.dmg` (Intel)
- **Windows**: `DDEV Manager_x.x.x_x64-setup.exe`
- **Linux**: `DDEV Manager_x.x.x_amd64.deb` or `DDEV Manager_x.x.x_amd64.AppImage`

### Build from Source

See the [Development](#development) section below.

## Usage

1. Launch DDEV Manager
2. The app will automatically detect all DDEV projects on your system
3. Click on a project to view its details
4. Use the action buttons to start, stop, or restart projects
5. The terminal panel shows real-time output from DDEV commands

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/) 8+
- [Rust](https://rustup.rs/) 1.70+
- [DDEV](https://ddev.readthedocs.io/en/stable/users/install/)

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/ddev-manager.git
   cd ddev-manager
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Start the development server:
   ```bash
   pnpm tauri dev
   ```

### Project Structure

```
ddev-manager/
├── src/                          # React frontend
│   ├── components/               # React components
│   │   ├── layout/              # Layout components (Header, StatusBar)
│   │   ├── projects/            # Project-related components
│   │   ├── terminal/            # Terminal component
│   │   └── ui/                  # Reusable UI components (Toaster)
│   ├── hooks/                   # Custom React hooks
│   │   ├── useDdev.ts           # DDEV command hooks
│   │   └── useCreateProject.ts  # Project creation hooks
│   ├── stores/                  # Zustand stores
│   │   ├── appStore.ts          # App state (selection, filters)
│   │   ├── terminalStore.ts     # Terminal state
│   │   ├── statusStore.ts       # Status bar state
│   │   └── toastStore.ts        # Toast notifications
│   ├── lib/                     # Utility functions
│   ├── types/                   # TypeScript type definitions
│   ├── test/                    # Test utilities and mocks
│   └── App.tsx                  # Main app component
├── src-tauri/                   # Rust backend
│   ├── src/
│   │   └── lib.rs               # Tauri commands (DDEV CLI wrapper)
│   ├── Cargo.toml               # Rust dependencies
│   └── tauri.conf.json          # Tauri configuration
├── package.json
├── vite.config.ts               # Vite configuration
├── vitest.config.ts             # Vitest configuration
└── tsconfig.json
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | [Tauri 2.x](https://tauri.app/) |
| Frontend | [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com/) |
| State Management | [Zustand](https://zustand-demo.pmnd.rs/) |
| Data Fetching | [TanStack Query](https://tanstack.com/query) |
| Icons | [Lucide React](https://lucide.dev/) |
| Backend | Rust |
| Build Tool | [Vite](https://vitejs.dev/) |
| Testing | [Vitest](https://vitest.dev/) + [React Testing Library](https://testing-library.com/react) |

### Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Vite dev server (frontend only) |
| `pnpm tauri dev` | Start Tauri in development mode |
| `pnpm build` | Build frontend for production |
| `pnpm tauri build` | Build distributable app |
| `pnpm test` | Run tests in watch mode |
| `pnpm test:run` | Run all tests once |
| `pnpm test:coverage` | Run tests with coverage report |
| `pnpm test:ui` | Open Vitest UI |
| `pnpm lint` | Run ESLint |
| `pnpm lint:fix` | Fix ESLint issues |
| `pnpm format` | Format code with Prettier |
| `pnpm format:check` | Check code formatting |
| `pnpm lint:rust` | Run Clippy on Rust code |
| `pnpm format:rust` | Format Rust code |
| `pnpm lint:all` | Run all linters |
| `pnpm format:all` | Format all code |

### Testing

The project uses Vitest with React Testing Library. Tests are colocated with source files.

```bash
# Run tests
pnpm test

# Run with coverage
pnpm test:coverage

# Open Vitest UI
pnpm test:ui
```

**Test Structure:**
- `src/**/*.test.ts` - Unit tests
- `src/**/*.test.tsx` - Component tests
- `src/test/` - Test utilities and mocks

**Mocking Tauri APIs:**

Tauri's `invoke()` uses IPC, not HTTP, so we use direct module mocking instead of MSW:

```typescript
import { vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { setupInvokeMock, createMockProjectBasic } from "@/test/mocks";

vi.mock("@tauri-apps/api/core");

beforeEach(() => {
  setupInvokeMock(vi.mocked(invoke), {
    list_projects: [createMockProjectBasic()],
  });
});
```

### Building for Production

```bash
# Build for current platform
pnpm tauri build

# Output locations:
# macOS: src-tauri/target/release/bundle/macos/
# Windows: src-tauri/target/release/bundle/msi/
# Linux: src-tauri/target/release/bundle/deb/
```

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    DDEV Manager App                      │
├─────────────────────────────────────────────────────────┤
│  Frontend (React + TypeScript)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  Components │  │   Hooks     │  │   Stores    │     │
│  │  (UI)       │  │  (useDdev)  │  │  (Zustand)  │     │
│  └──────┬──────┘  └──────┬──────┘  └─────────────┘     │
│         │                │                              │
│         └────────┬───────┘                              │
│                  │ invoke()                             │
├──────────────────┼──────────────────────────────────────┤
│  Backend (Rust)  │                                      │
│                  ▼                                      │
│  ┌─────────────────────────────────────────────┐       │
│  │         Tauri Commands (lib.rs)             │       │
│  │  - list_projects() / describe_project()     │       │
│  │  - start_project() / stop_project()         │       │
│  │  - create_project() with CMS install        │       │
│  │  - delete_project() / poweroff()            │       │
│  │  - create_snapshot() / restore_snapshot()   │       │
│  │  - install_addon() / remove_addon()         │       │
│  └──────────────────┬──────────────────────────┘       │
│                     │                                   │
│                     ▼                                   │
│  ┌─────────────────────────────────────────────┐       │
│  │           DDEV CLI (subprocess)             │       │
│  │  ddev list --json-output                    │       │
│  │  ddev describe <project> --json-output      │       │
│  │  ddev start/stop/restart <project>          │       │
│  └─────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────┘
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests: `pnpm test:run`
5. Commit your changes: `git commit -m "Add my feature"`
6. Push to your fork: `git push origin feature/my-feature`
7. Open a Pull Request

### Code Style

- **ESLint** and **Prettier** enforce code style automatically
- **Clippy** and **rustfmt** handle Rust code
- Pre-commit hooks run linters on staged files
- Run `pnpm lint:fix && pnpm format` to fix issues
- Use TypeScript strict mode
- Write tests for new features

### Reporting Issues

Please use the [GitHub Issues](https://github.com/your-username/ddev-manager/issues) page to report bugs or request features.

When reporting bugs, please include:
- Your operating system and version
- DDEV version (`ddev version`)
- Steps to reproduce the issue
- Expected vs actual behavior

## Roadmap

- [x] Add-on management (browse registry, install, remove)
- [x] Settings (theme toggle, zoom control)
- [x] Project creation wizard with CMS installation
- [x] Global status bar for command progress
- [x] Delete project functionality
- [x] Cancel running commands
- [x] Auto-detect project type for existing folders
- [ ] Log viewer with filtering
- [ ] System tray integration
- [ ] Configuration editor
- [ ] Multiple project selection
- [ ] Performance monitoring (XHGui integration)
- [ ] Auto-update mechanism

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [DDEV](https://ddev.com/) - The amazing local development tool this app manages
- [Tauri](https://tauri.app/) - For the lightweight, secure app framework
- [React](https://react.dev/) - For the UI library
- [Tailwind CSS](https://tailwindcss.com/) - For the utility-first CSS framework

---

**Note:** This project is not officially affiliated with DDEV or Platform.sh. It's an independent, community-driven project.
