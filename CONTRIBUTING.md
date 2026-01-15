# Contributing to DDEV Manager

Thank you for your interest in contributing to DDEV Manager! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Code Style](#code-style)
- [Project Architecture](#project-architecture)

## Code of Conduct

Please be respectful and constructive in all interactions. We're all here to build something useful for the DDEV community.

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18 or higher
- **pnpm** 8 or higher
- **Rust** 1.70 or higher (install via [rustup](https://rustup.rs/))
- **DDEV** (for testing the app with real projects)
- **Docker** (required by DDEV)

### Platform-Specific Requirements

**macOS:**
- Xcode Command Line Tools: `xcode-select --install`

**Windows:**
- [Microsoft Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
- [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (usually pre-installed on Windows 10/11)

**Linux:**
- Various system libraries depending on your distribution. See [Tauri Prerequisites](https://tauri.app/start/prerequisites/).

## Development Setup

1. **Fork and clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/ddev-manager.git
   cd ddev-manager
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Start the development server:**
   ```bash
   pnpm tauri dev
   ```

   This will:
   - Start the Vite dev server with hot module replacement
   - Compile the Rust backend
   - Launch the app in development mode

4. **Run tests:**
   ```bash
   pnpm test
   ```

## Making Changes

### Branch Naming

Use descriptive branch names:
- `feature/add-log-viewer` - New features
- `fix/terminal-scroll-issue` - Bug fixes
- `docs/update-readme` - Documentation changes
- `refactor/extract-hook` - Code refactoring

### Commit Messages

Write clear, concise commit messages:

```
type: short description

Longer description if needed. Explain what and why,
not how (the code explains how).

Fixes #123
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, missing semicolons, etc.
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### File Organization

When adding new features:

- **React components** go in `src/components/` organized by feature
- **Hooks** go in `src/hooks/`
- **Store logic** goes in `src/stores/`
- **Types** go in `src/types/`
- **Utility functions** go in `src/lib/`
- **Rust commands** go in `src-tauri/src/lib.rs`

## Testing

### Running Tests

```bash
# Run all tests in watch mode
pnpm test

# Run all tests once
pnpm test:run

# Run with coverage report
pnpm test:coverage

# Open Vitest UI
pnpm test:ui
```

### Writing Tests

Tests are colocated with source files:

```
src/
├── components/
│   └── projects/
│       ├── ProjectCard.tsx
│       └── ProjectCard.test.tsx    # Tests next to component
├── hooks/
│   ├── useDdev.ts
│   └── useDdev.test.tsx
└── lib/
    ├── utils.ts
    └── utils.test.ts
```

### Test Guidelines

1. **Test behavior, not implementation** - Focus on what users see and do
2. **Use meaningful descriptions** - Test names should describe expected behavior
3. **Keep tests independent** - Each test should run in isolation
4. **Mock external dependencies** - Use the mocks in `src/test/mocks/`

### Mocking Tauri APIs

Tauri's `invoke()` uses IPC, not HTTP. We mock at the module level:

```typescript
import { vi, beforeEach } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { setupInvokeMock, createMockProjectBasic } from "@/test/mocks";

vi.mock("@tauri-apps/api/core");

beforeEach(() => {
  setupInvokeMock(vi.mocked(invoke), {
    list_projects: [createMockProjectBasic({ name: "test-project" })],
    describe_project: createMockProjectDetails(),
  });
});
```

## Submitting Changes

### Pull Request Process

1. **Ensure tests pass:**
   ```bash
   pnpm test:run
   ```

2. **Update documentation** if needed

3. **Create a Pull Request** with:
   - Clear title describing the change
   - Description of what and why
   - Link to related issue(s) if applicable
   - Screenshots for UI changes

4. **Respond to feedback** - Be open to suggestions and iterate

### PR Checklist

- [ ] Tests pass locally
- [ ] New code has tests (if applicable)
- [ ] Documentation updated (if applicable)
- [ ] Commit messages follow conventions
- [ ] No unrelated changes included

## Code Style

### TypeScript

- Use TypeScript strict mode
- Prefer `interface` over `type` for object shapes
- Use explicit return types for functions
- Avoid `any` - use `unknown` if type is truly unknown

### React

- Use functional components with hooks
- Prefer named exports over default exports
- Keep components focused and composable
- Use `@/` path alias for imports

### Rust

- Follow standard Rust conventions
- Use meaningful error messages
- Document public functions

### Formatting

The project doesn't use Prettier/ESLint yet, but please:
- Use 2-space indentation
- Use double quotes for strings in TypeScript
- Keep lines under 100 characters when possible

## Project Architecture

### Frontend (React)

```
src/
├── components/     # UI components
├── hooks/          # Custom React hooks
│   └── useDdev.ts  # All DDEV-related hooks
├── stores/         # Zustand stores
├── lib/            # Utilities
├── types/          # TypeScript types
└── test/           # Test utilities
```

### Backend (Rust)

```
src-tauri/
├── src/
│   └── lib.rs      # All Tauri commands
└── Cargo.toml      # Dependencies
```

### Data Flow

1. **UI Event** (button click, etc.)
2. **Hook/Mutation** (e.g., `useStartProject`)
3. **Tauri invoke()** (IPC to Rust)
4. **Rust Command** (in `lib.rs`)
5. **DDEV CLI** (subprocess)
6. **Event Emission** (for streaming output)
7. **UI Update** (via React Query or events)

### Key Files

| File | Purpose |
|------|---------|
| `src/hooks/useDdev.ts` | All DDEV command hooks |
| `src/stores/appStore.ts` | App state (selection, filters) |
| `src/stores/terminalStore.ts` | Terminal panel state |
| `src-tauri/src/lib.rs` | Rust backend commands |
| `src/test/mocks/tauri.ts` | Mock factories for tests |

## Questions?

If you have questions about contributing:

1. Check existing issues and discussions
2. Open a new issue with the "question" label
3. Be specific about what you're trying to accomplish

Thank you for contributing to DDEV Manager!
