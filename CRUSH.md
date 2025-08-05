# Strawbaler-Online Code Guidelines

This document outlines the coding standards and conventions for the Strawbaler-Online project.

## Development Scripts

- **Build:** `pnpm run build`
- **Test:** `pnpm test`
- **Lint:** `pnpm run lint`
- **Run a single test:** `pnpm test -- path/to/your/test.spec.js`

## Code Style

- **Formatting:** We use Prettier with the settings defined in `.editorconfig`. Ensure your editor is configured to use these settings.
- **Naming Conventions:**
  - `camelCase` for variables and functions.
  - `PascalCase` for classes and components.
- **Types:** Where possible, use static typing.
- **Error Handling:** Errors should be handled gracefully. Avoid swallowing errors; instead, log them or display a user-friendly message.
- **Imports:**
  - Group and sort imports at the top of the file.
  - Use absolute paths for imports where possible.
- **Comments:** Add comments to explain complex logic or the "why" behind a decision, not the "what."

## General
- For any new feature or bug fix, please provide the corresponding test case.

*This is a living document and is subject to improvements and adaptations over time.*
