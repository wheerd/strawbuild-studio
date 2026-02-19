# Contributing to StrawBuild Studio

Thank you for your interest in contributing to StrawBuild Studio! 🌾

StrawBuild Studio is a web-based floor plan editor designed specifically for strawbale construction planning. Our mission is to provide free, accessible tools to help the strawbale building community design and plan their projects with confidence.

**We welcome contributions from everyone** - whether you're a developer, strawbale builder, architect, designer, or enthusiast. There are many ways to contribute, and you don't need to be a programmer to help!

## Ways to Contribute

### 💻 Code Contributions

- Implement new features (roof support, material estimation, etc.)
- Fix bugs and improve performance
- Refactor and improve code quality
- Add or improve tests

### 🐛 Bug Reports

- Found something that doesn't work? Let us know!
- Discovered edge cases or unexpected behavior? Report them!
- Experienced crashes or errors? Help us fix them!

### 💡 Feature Requests

- Suggest features based on real-world strawbale building needs
- Propose UI/UX improvements
- Share ideas for better workflows

### 📚 Documentation

- Improve existing documentation
- Write tutorials or guides
- Add code comments
- Create example projects

### 🏗️ Domain Expertise

- Validate calculations and construction logic
- Suggest realistic features based on strawbale building practices
- Review generated plans for accuracy
- Share building code requirements from your region

### 🎨 Design & Usability

- Suggest UI/UX improvements
- Provide feedback on workflows
- Help make the tool more intuitive

### 🌍 Translations (Future)

- When internationalization is implemented, help translate to other languages

### 📝 Test Files & Examples

- Share IFC files for testing import functionality
- Create example projects that showcase features
- Contribute real-world building plans (anonymized if needed)

## Getting Started for Developers

### Prerequisites

- **Node.js 22+** (specified in `.nvmrc`)
- **pnpm** (package manager)
- Basic knowledge of TypeScript and React (helpful but not required)

### Setup Instructions

1. **Fork the repository**
   - Click the "Fork" button on GitHub
   - This creates your own copy of the project

2. **Clone your fork**

   ```bash
   git clone https://github.com/YOUR-USERNAME/strawbuild-studio.git
   cd strawbuild-studio
   ```

3. **Install dependencies**

   ```bash
   pnpm install
   ```

4. **Start the development server**

   ```bash
   pnpm dev
   ```

   The app will be available at `http://localhost:5173`

5. **Explore the codebase**
   - See [README.md](README.md) for project structure
   - See [AGENTS.md](AGENTS.md) for detailed code style guidelines
   - See [docs/codebase-review.md](docs/codebase-review.md) for architecture overview

### Project Structure Overview

```
src/
├── app/          # App shell, entry point, global styling
├── building/     # Building models, store, and management UI
├── construction/ # Construction configuration, materials, plan + 3D viewers
├── editor/       # Canvas tools, services, and status bar
├── shared/       # Reusable components, geometry, hooks, services, theming
└── test/         # Vitest setup helpers and fixtures
```

## Development Workflow

### Creating a Branch

Create a descriptive branch name for your work:

```bash
git checkout -b feature/add-roof-slopes
git checkout -b fix/wall-thickness-calculation
git checkout -b docs/improve-readme
```

### Code Style

**Good news!** We use automated code formatting, so you don't need to worry too much about style:

- **Prettier** handles formatting (spacing, quotes, etc.)
- **ESLint** catches code quality issues
- **TypeScript** ensures type safety

Before committing, run:

```bash
pnpm lint:format
```

This will automatically format your code and fix common issues.

For detailed code style guidelines, see [AGENTS.md](AGENTS.md), which covers:

- TypeScript conventions
- React component patterns
- Import organization
- Testing approaches
- File naming conventions

### Testing

**Tests are recommended but not required** for contributions. We appreciate any tests you can add!

```bash
# Run all tests
pnpm test

# Run tests in watch mode (helpful during development)
pnpm test:watch

# Run type checking
pnpm typecheck
```

Test file naming conventions:

- `Component.tsx` → `Component.test.tsx`
- `utils.ts` → `utils.test.ts`
- Focused tests: `utils.functionName.test.ts`

### Commit Messages

We use casual commit messages - just make them descriptive:

```bash
git commit -m "Add slope calculation for shed roofs"
git commit -m "Fix wall thickness not updating in 3D view"
git commit -m "Update installation instructions in README"
```

**Note:** Maintainers may squash commits when merging, so don't worry about having a perfect commit history.

## Pull Request Process

1. **Make your changes** in your feature branch
2. **Format and check your code:**

   ```bash
   pnpm lint:format  # Format code and fix linting issues
   pnpm typecheck    # Check for TypeScript errors
   pnpm test         # Run tests (if applicable)
   ```

3. **Commit and push** to your fork:

   ```bash
   git add .
   git commit -m "Your descriptive commit message"
   git push origin your-branch-name
   ```

4. **Create a Pull Request**
   - Go to your fork on GitHub
   - Click "Pull Request"
   - Fill out the PR template
   - Describe what you changed and why

5. **Wait for CI checks**
   - Automated tests, linting, and builds will run
   - Fix any issues flagged by CI

6. **Code review**
   - A maintainer will review your PR
   - They may request changes or ask questions
   - Make any requested changes and push to the same branch
   - Be patient - this is a volunteer project!

7. **Merge**
   - Once approved, a maintainer will merge your PR
   - Congratulations! 🎉

### PR Checklist

Before submitting your PR, ensure:

- [ ] Code is formatted (`pnpm lint:format`)
- [ ] TypeScript checks pass (`pnpm typecheck`)
- [ ] Existing tests pass (`pnpm test`)
- [ ] Added tests for new functionality (recommended)
- [ ] Updated documentation if needed
- [ ] PR description explains what and why

## Bug Reports & Feature Requests

### Reporting Bugs

Found a bug? Please open a GitHub Issue using the bug report template.

**Include:**

- Clear description of the problem
- Steps to reproduce the issue
- Expected vs. actual behavior
- Screenshots (if applicable)
- Browser and OS information

### Requesting Features

Have an idea? Please open a GitHub Issue using the feature request template.

**Include:**

- Description of the feature
- Your use case - why would this be useful?
- How you envision it working (optional)
- Any relevant context about strawbale building practices

## For Non-Developers

**Don't code? No problem!** You can still contribute in valuable ways:

### Testing & Feedback

- Use the application for your strawbale building projects
- Report bugs or confusing behavior
- Suggest improvements to the user interface
- Share what features would help you most

### Domain Expertise

- Validate that calculations are correct
- Suggest features based on real-world building needs
- Review generated construction plans for accuracy
- Share building code requirements from your region
- Help us understand strawbale construction better

### Documentation

- Improve clarity of existing docs
- Write tutorials or how-to guides
- Create video tutorials (if you're into that!)
- Share example projects

### How to Report Issues (for Non-Developers)

1. Go to the [Issues page](../../issues)
2. Click "New Issue"
3. Choose "Bug Report" or "Feature Request"
4. Describe what you expected vs. what happened
5. Add screenshots if helpful
6. Submit!

Don't worry about technical details - just describe your experience in your own words. We'll ask follow-up questions if needed.

## Code Quality Standards

### Automated Checks

All pull requests must pass:

- **Tests** - Existing tests must continue to pass
- **Linting** - Code must follow ESLint rules
- **Type checking** - No TypeScript errors
- **Build** - Project must build successfully

These are checked automatically by GitHub Actions.

### Manual Review

Maintainers will review for:

- Code correctness and logic
- Alignment with project architecture
- User experience impact
- Performance considerations

**Don't worry if you're new to open source!** We'll provide constructive feedback and help you improve your contribution.

## Review Process

- All PRs are reviewed by project maintainers
- We aim to provide feedback within a week (but it may take longer)
- Reviews will be constructive and helpful
- We may request changes before merging
- Large features may require more discussion
- This is a volunteer project - please be patient!

## Community Guidelines

We are committed to providing a welcoming and inclusive environment. All contributors are expected to:

- Be respectful and considerate
- Use welcoming and inclusive language
- Accept constructive criticism gracefully
- Focus on what's best for the community
- Show empathy towards others

For details, see our [Code of Conduct](CODE_OF_CONDUCT.md).

## Questions?

- **Found a bug?** Open a [Bug Report](../../issues/new?template=bug_report.md)
- **Have a feature idea?** Open a [Feature Request](../../issues/new?template=feature_request.md)
- **Need help?** Open a [Question Issue](../../issues/new?template=question.md)
- **Want to discuss something?** Start a conversation in Issues

Before opening a new issue, please search existing issues to see if your question has already been answered.

## Recognition

All contributors will be recognized for their contributions. Thank you for helping make StrawBuild Studio better for the strawbale building community! 🌾

---

**Ready to contribute? Pick an issue labeled `good first issue` to get started, or dive into something that interests you!**
