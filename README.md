# 🌾 Strawbaler Online

[![CI](https://github.com/wheerd/strawbaler-online/workflows/CI/badge.svg)](https://github.com/wheerd/strawbaler-online/actions/workflows/ci.yml)
[![Security](https://github.com/wheerd/strawbaler-online/workflows/Security%20&%20Dependencies/badge.svg)](https://github.com/wheerd/strawbaler-online/actions/workflows/security.yml)
[![Netlify Status](https://api.netlify.com/api/v1/badges/0c31f906-f421-426d-b6af-d0f69ae3ea83/deploy-status)](https://app.netlify.com/projects/strawbaler/deploys)

A modern web-based floor plan editor specifically designed for strawbale construction planning. Built with React, TypeScript, and Konva for high-performance canvas rendering.

## ✨ Features

- **Interactive Floor Plan Editor**: Draw walls, rooms, and connection points
- **Strawbale-Specific Tools**: Optimized for strawbale construction workflows
- **Real-time Preview**: See your floor plan as you build it
- **Modern Tech Stack**: React 19, TypeScript, Vite, and Zustand
- **Comprehensive Testing**: 31+ tests covering core functionality
- **CI/CD Pipeline**: Automated testing, linting, and security checks

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

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

# Building
pnpm build        # Build for production
```

## 🏗️ Architecture

### Tech Stack

- **Frontend**: React 19 with TypeScript
- **Canvas Rendering**: Konva.js with react-konva
- **State Management**: Zustand with immutable updates
- **Testing**: Vitest + React Testing Library + jsdom
- **Build Tool**: Vite
- **Code Style**: neostandard

### Project Structure

```
src/
├── components/
│   └── FloorPlanEditor/    # Main editor components
│       ├── Canvas/         # Konva canvas layers
│       ├── Shapes/         # Drawable elements (walls, points, rooms)
│       ├── Tools/          # UI tools and toolbar
│       └── hooks/          # Editor state management
├── model/                  # Data models and operations
├── types/                  # TypeScript type definitions
└── test/                   # Test utilities and setup
```

## 🔧 Development

### Running Tests

```bash
# Run all tests with coverage
pnpm test

# Run specific test file
pnpm test -- wall-creation.test.tsx

# Run tests in watch mode
pnpm test -- --watch
```

### Code Style

This project uses ts-standard for consistent code formatting:

```bash
# Check code style
pnpm lint

# Auto-fix style issues
pnpm lint:fix
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
- **Security**: Dependency auditing and CodeQL analysis
- **Release**: Automated releases on git tags
- **Dependencies**: Weekly automated dependency updates

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Run tests and linting: `pnpm test && pnpm lint`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🎯 Roadmap

- [ ] Enhanced room editing tools
- [ ] Export functionality (PDF, DXF)
- [ ] Material estimation calculations
- [ ] 3D visualization mode
- [ ] Collaborative editing features
- [ ] Mobile-responsive design

## 🐛 Known Issues

- Some linting rules need cleanup (tracked in CI)
- Bundle size optimization needed for production

---

Built with ❤️ for the strawbale building community
