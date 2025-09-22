# Agent Guidelines for Strawbaler

## Commands

- `pnpm dev` - Start development server
- `pnpm build` - Build production (runs TypeScript check then Vite build)
- `pnpm lint` - Run ESLint
- `pnpm test` - Run all tests with Vitest
- `pnpm preview` - Preview production build
- `pnpm add <package>` - Add dependency
- `npx tsc --noEmit --skipLibCheck` - TypeScript check only
- `pnpm audit --audit-level moderate` Security audit

## Code Style

- **TypeScript**: Use strict mode with all safety checks enabled
- **Imports**: Named imports from React (`import { useState } from 'react'`), default exports for components
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
