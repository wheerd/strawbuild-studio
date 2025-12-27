# 🌾 Strawbaler Online

[![CI](https://github.com/wheerd/strawbaler-online/workflows/CI/badge.svg)](https://github.com/wheerd/strawbaler-online/actions/workflows/ci.yml)
[![Security](https://github.com/wheerd/strawbaler-online/workflows/Security%20&%20Dependencies/badge.svg)](https://github.com/wheerd/strawbaler-online/actions/workflows/security.yml)
[![Netlify Status](https://api.netlify.com/api/v1/badges/0c31f906-f421-426d-b6af-d0f69ae3ea83/deploy-status)](https://app.netlify.com/projects/strawbaler/deploys)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A modern web-based floor plan editor specifically designed for strawbale construction planning.

## ✨ Features

- **Finished-Dimension Floor Plans**: Define perimeter walls with plaster thickness accounted for
- **Openings & Components**: Add windows, doors, and other wall penetrations tailored to strawbale builds
- **Configurable Wall Assemblies**: Switch between infill, strawhenge, and module-based assemblies
- **Plan & Model Generation**: Produce wall and floor build plans with interactive 3D previews
- **Modern Tech Stack**: React 19, TypeScript, Vite, Zustand, and Radix UI
- **CI/CD Pipeline**: Automated testing, linting, security checks, and dependency updates

## 🚀 Quick Start

### Prerequisites

- Node.js 22+
- pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/wheerd/strawbaler-online.git
cd strawbaler-online

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Visit `http://localhost:5173` to see the application.

## 📋 Available Scripts

```bash
# Development
pnpm dev          # Start dev server with hot reload
pnpm preview      # Preview production build locally

# Testing
pnpm test         # Run all tests

# Code Quality
pnpm lint         # Check code style and formatting
pnpm lint:fix     # Auto-fix linting issues
pnpm format       # Auto format with prettier
pnpm format:check # Check formatting with prettier
pnpm typecheck    # Run typescript type check

# Building
pnpm build        # Build for production
```

## 🏗️ Architecture

### Tech Stack

- **Frontend**: React 19 with TypeScript
- **UI**: Radix UI Themes and tailwind
- **Canvas Rendering**: Konva.js with react-konva
- **3D Rendering**: Three.js via react-three
- **State Management**: Zustand with immer, persist and zundo middlewares
- **Geometry**: clipper2-wasm, gl-matrix, manifold-3d
- **IFC**: web-ifc
- **PWA**: with workbox and vite-pwa-plugin
- **Testing**: Vitest + React Testing Library + jsdom, Playwright
- **Build Tool**: Vite
- **Code Style**: neostandard, prettier, eslint

### Project Structure

```
src/
├── app/                # Application shell, entry point, and global styles
├── building/           # Building-level models, store, and management UI
├── construction/       # Construction configuration, materials, and plan/3D viewers
├── editor/             # Canvas editor tools, services, status bar, and hooks
├── shared/             # Reusable UI components, geometry utilities, services, and theming
└── test/               # Shared Vitest setup, helpers, and fixtures
```

## ⚠️ Disclaimer

Strawbaler Online is under active development and provided as-is:

- No guarantees for the precision of calculations, generated plans, or 3D models
- Breaking changes may occur between releases
- Browser storage can be cleared or migrate, which may remove project data
- Always export and back up your work frequently
- This tool does not replace consultation with qualified building professionals

## 💾 Local Storage

The application stores data locally in your browser to:

- Remember whether the welcome information has been acknowledged
- Persist floor plans, projects, and configuration preferences
- Keep usage entirely local—no cookies, tracking, or third-party analytics

## 🔧 Development

### Running Tests

```bash
# Run all tests with coverage
pnpm test

# Run tests in watch mode
pnpm test:watch
```

### Code Style

This project uses prettier and eslint for consistent code formatting:

```bash
# Check code style
pnpm lint
pnpm format:check

# Auto-fix style issues
pnpm lint:fix
pnpm format

# or just
pnpm lint:format
```

## 🚢 Deployment

### Production Build

```bash
pnpm build
```

The `dist/` folder contains the production-ready static files.

### GitHub Actions

This project includes comprehensive CI/CD workflows:

- **CI**: Tests, linting, and builds on every push/PR
- **Security**: Dependency auditing
- **Dependencies**: Automated dependency updates via Dependabot

## 🐛 Known Issues

- Non-right corners are not fully supported

## 🤝 Contributing

We welcome contributions from everyone! Whether you're a developer, strawbale builder, architect, or enthusiast, there are many ways to help:

- 🐛 Report bugs and suggest features
- 💻 Contribute code improvements
- 📚 Improve documentation
- 🏗️ Share your strawbale building expertise
- 🎨 Provide UI/UX feedback
- ✅ Test the application and provide feedback

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines on how to get started.

Please note that this project is released with a [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to abide by its terms.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

This means you are free to use, modify, and distribute this software, even for commercial purposes, as long as you include the original copyright notice.

---

Built with ❤️ for the strawbale building community
