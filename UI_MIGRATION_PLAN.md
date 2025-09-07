# UI Migration Plan: Radix UI + Tailwind CSS

## Overview

Migrate existing developer-focused UI to professional interface while maintaining all existing functionality. Focus on grouped icon toolbar and improved form controls without modals/SVG features.

## Core Principles

- **No functionality changes** - all existing features work exactly the same
- **Keyboard shortcuts preserved** - existing KeyboardShortcutManager unchanged
- **Layout maintained** - same three-panel structure (toolbar/canvas/properties)
- **Icon-only toolbar** - conserve space with grouped buttons and tooltips
- **Form improvements** - better styling and UX for properties panel

## Phase 1: Foundation Setup (High Priority)

### Task 1: Install Dependencies

```bash
pnpm add @radix-ui/react-toolbar @radix-ui/react-tooltip @radix-ui/react-select @radix-ui/react-radio-group @radix-ui/react-separator
pnpm add -D tailwindcss postcss autoprefixer @tailwindcss/forms
npx tailwindcss init -p
```

### Task 2: Tailwind Configuration

Create `tailwind.config.js` with:

- Professional color palette (grays, blues, accent colors)
- Typography scale for technical interface
- Shadow and spacing system
- Animation presets for subtle interactions

### Task 3: Keyboard Integration Testing

Verify that:

- Document-level keyboard events still work with Radix components
- Tool activation shortcuts (S, W, etc.) function correctly
- Delete/Escape keys work as expected
- No event capture issues with Radix primitives

## Phase 2: Toolbar Migration (Medium Priority)

### Task 4: MainToolbar Redesign

**New Structure**: Single horizontal toolbar with grouped icon buttons

```
[🔍 ↕️ 🔄 📊] | [🏠 📐] | [🚪]
Basic Tools      | Wall Tools | Opening Tools
```

**Implementation**:

- Use `Radix.Toolbar.Root` as container
- Group tools with `Radix.Separator` between categories
- Icon-only buttons with `Radix.Tooltip` showing name + hotkey
- Maintain exact same tool activation logic via existing `handleToolSelect`

**Files to modify**:

- `src/components/FloorPlanEditor/Tools/Toolbar/MainToolbar.tsx`
- Remove tab-based structure, implement grouped buttons

### Task 5: Toolbar Styling

- Replace CSS classes with Tailwind utilities
- Professional button styling with hover/active states
- Proper visual grouping and spacing
- Consistent icon sizing and alignment

## Phase 3: Properties Panel Upgrade (Medium Priority)

### Task 6: Form Component Upgrades

**Replace existing form controls**:

- `<select>` → `Radix.Select` with proper styling
- Radio buttons → `Radix.RadioGroup`
- Input fields → Tailwind-styled with validation states
- Number inputs → Custom component with +/- buttons

**Files to modify**:

- `src/components/FloorPlanEditor/Tools/PropertiesPanel/Inspectors/*.tsx`
- All inspector components for consistent form styling

### Task 7: Properties Panel Layout

- Keep existing three-section structure (Entity/Tool/Actions)
- Improve visual hierarchy with better spacing
- Add proper form validation styling
- Maintain all existing functionality

## Phase 4: CSS Migration (Medium Priority)

### Task 8: Systematic CSS Replacement

**Process per component**:

1. Identify current CSS classes and their purpose
2. Replace with equivalent Tailwind utilities
3. Test functionality remains unchanged
4. Remove unused CSS rules

**Files to migrate**:

- `src/components/FloorPlanEditor/FloorPlanEditor.css` → Tailwind classes
- `src/components/FloorPlanEditor/ToolSystem.css` → Remove completely
- All component-specific styling

### Task 9: Theme Consistency

- Ensure consistent colors across all components
- Standardize spacing and typography
- Maintain existing layout proportions
- Professional shadows and borders

## Phase 5: Testing & Polish (High Priority)

### Task 10: Functionality Verification

**Test all existing features**:

- Tool switching via keyboard and clicks
- Properties panel form interactions
- Canvas interaction (ensure no interference)
- All keyboard shortcuts work correctly

### Task 11: Visual Polish

- Subtle hover animations for buttons
- Loading states for tool switching
- Consistent focus indicators
- Professional spacing and alignment

### Task 12: Build & Deploy Testing

```bash
pnpm lint
pnpm test
pnpm build
```

Ensure no regressions in TypeScript or test suite.

## Technical Considerations

### Keyboard Integration Strategy

- Existing system uses document-level `addEventListener('keydown')`
- Radix components won't interfere as they don't capture keyboard events
- Container maintains `tabIndex={0}` for proper focus management
- Tool activation remains through existing `ToolManager.activateTool()`

### Component Architecture

```
FloorPlanEditor
├── MainToolbar (Radix.Toolbar + grouped buttons)
├── FloorPlanStage (unchanged Konva canvas)
├── PropertiesPanel (improved forms with Radix)
└── GridSizeDisplay (unchanged)
```

### Design System

- **Primary**: Blue (#0ea5e9) for active tools
- **Secondary**: Gray scale for neutral UI
- **Success/Warning/Error**: Standard semantic colors
- **Typography**: System fonts optimized for technical content
- **Spacing**: 4px base unit for consistent rhythm

## Success Metrics

1. All existing functionality works identically
2. Keyboard shortcuts function without changes
3. Professional visual appearance achieved
4. No performance regressions
5. Build and tests pass completely

## Future Considerations (Not In Scope)

- Modal system for settings/export
- SVG construction plan components
- Advanced accessibility features
- Mobile responsive design
- Additional animation and micro-interactions

---

This plan focuses exclusively on migrating existing functionality to a more professional appearance while preserving all current capabilities and interactions.
