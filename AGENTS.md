# Agent Guidelines for Strawbaler

## Commands
- `npm run dev` - Start development server
- `npm run build` - Build production (runs TypeScript check then Vite build)
- `npm run lint` - Run ESLint
- `npm run test` - Run all tests with Vitest
- `npm run preview` - Preview production build

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
- **Single Test**: `npm run test -- ComponentName` or `npm run test -- path/to/test`

## Error Handling
- Leverage TypeScript's strict mode for compile-time safety
- Use non-null assertion (`!`) only when certain (like `document.getElementById('root')!`)