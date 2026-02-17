# Agent Guidelines for Strawbaler

## Commands

- `pnpm dev` - Start development server
- `pnpm build` - Build production (runs TypeScript check then Vite build)
- `pnpm lint` - Run ESLint
- `pnpm format:check` - Formats with prettier and fixes all fixable issues with eslint
- `pnpm test -- --pool=threads` - Run all tests with Vitest (thread pool avoids sandbox fork crashes)
- `pnpm preview` - Preview production build
- `pnpm add <package>` - Add dependency
- `pnpm typecheck` - TypeScript check only
- `pnpm audit --audit-level moderate` Security audit
- `pnpm i18n:update` - Update i18n translation files and regenerate TypeScript interfaces
- `pnpm i18n:interface` - Regenerate TypeScript interfaces for i18n (run this after adding new translation keys)

## Runtime

- Node.js 22.x (`.nvmrc` provided)
- pnpm (lockfile committed)

## Directory Structure

```
src/
├── app/          # App shell, entry point, global styling
├── building/     # Building models, store, and management UI
├── construction/ # Construction configuration, materials, plan + 3D viewers
├── editor/       # Canvas tools, services, and status bar
├── shared/       # Reusable components, geometry, hooks, services, theming
└── test/         # Vitest setup helpers and fixtures
```

## Code Style

- **TypeScript**: Use strict mode with all safety checks enabled
- **Imports**: Named imports from React (`import { useState } from 'react'`), default exports for components. Use relative path imports for same directory ('./foo') and absolute imports ('@/foo/bar') when it is in a different part of the file tree.
- **Components**: Function declarations, not arrow functions (`function App() {}`)
- **JSX**: Use React 18+ JSX transform (no need to import React for JSX)
- **File Extensions**: Use `.tsx` for React components, `.ts` for utilities
- **Naming**: PascalCase for components, camelCase for variables/functions

## Testing

- **Framework**: Vitest with React Testing Library and jest-dom matchers
- **Setup**: Tests auto-cleanup, globals enabled, jsdom environment
- **File Naming**: Test files must have the same base name as the code being tested
  - For `operations.ts` → `operations.test.ts` (main tests)
  - For specific functions in `operations.ts` → `operations.functionName.test.ts` (focused tests)
  - For `Component.tsx` → `Component.test.tsx`
- **Test Organization**:
  - Use focused test files for complex functions that need extensive testing
  - Group related functionality tests in the same file when appropriate
  - Always test both success and failure cases
- **Single Test**: `pnpm test ComponentName` or `pnpm test path/to/test`

## Error Handling

- Leverage TypeScript's strict mode for compile-time safety
- Use non-null assertion (`!`) only when certain (like `document.getElementById('root')!`)

## Product Context

- Floor plan editor focused on strawbale construction
- Current capabilities: finished-dimension walls, windows/doors, configurable assemblies, 2D plans, and interactive 3D previews
- Planned additions: material and cost estimation, extended structural support, CAD import/export, irregular building handling
