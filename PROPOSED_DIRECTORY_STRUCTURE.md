# Proposed Semantic Directory Structure

## Overview

This document outlines a proposed reorganization of the strawbaler-online codebase from a **technical organization** (components/, types/, utils/) to a **semantic organization** based on domain concepts that reflect the strawbale construction workflow.

## Current vs Proposed Structure

### Current (Technical Organization)

```
src/
├── components/FloorPlanEditor/    # All UI mixed together
├── model/                         # Data models
├── construction/                  # Construction logic
├── types/                         # All types mixed
├── utils/                         # All utilities mixed
├── config/                        # Actually construction config
└── theme/
```

### Proposed (Semantic Organization)

```
src/
├── app/                          # Application shell
├── editor/                       # Floor plan editing domain
├── building/                     # Building model domain
├── construction/                 # Construction planning domain
├── shared/                       # Truly shared utilities & types
└── test/                         # Test utilities
```

## Detailed Proposed Structure

```
src/
├── app/                                          # Application shell
│   ├── App.tsx                                   # Main app component
│   ├── App.test.tsx                              # App tests
│   ├── main.tsx                                  # Application entry point
│   └── index.css                                 # Global styles
│
├── editor/                                       # Floor plan editing domain
│   │
│   ├── canvas/                                   # Canvas rendering & layers (Konva-based)
│   │   ├── layers/
│   │   │   ├── GridLayer.tsx                     # FROM: components/FloorPlanEditor/Canvas/
│   │   │   ├── GridLayer.test.tsx
│   │   │   ├── PerimeterLayer.tsx
│   │   │   ├── PerimeterLayer.test.tsx
│   │   │   ├── SelectionOverlay.tsx
│   │   │   ├── SelectionOverlay.test.tsx
│   │   │   └── ToolOverlayLayer.tsx
│   │   │
│   │   ├── shapes/                               # Visual representations
│   │   │   ├── PerimeterShape.tsx                # FROM: components/FloorPlanEditor/Shapes/
│   │   │   ├── PerimeterShape.test.tsx
│   │   │   ├── PerimeterCornerShape.tsx
│   │   │   ├── PerimeterWallShape.tsx
│   │   │   ├── CuboidShape.tsx
│   │   │   ├── CuboidShape.test.tsx
│   │   │   ├── CutCuboidShape.tsx
│   │   │   ├── CutCuboidShape.test.tsx
│   │   │   ├── ConstructionElementShape.tsx
│   │   │   ├── ConstructionElementShape.test.tsx
│   │   │   ├── OpeningShape.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── services/                             # Canvas-specific services
│   │   │   ├── EntityHitTestService.ts           # FROM: components/FloorPlanEditor/services/
│   │   │   ├── EntityHitTestService.test.ts
│   │   │   └── StageReference.ts
│   │   │
│   │   └── FloorPlanStage.tsx                    # FROM: components/FloorPlanEditor/Canvas/
│   │
│   ├── tools/                                    # Tools organized by group
│   │   │
│   │   ├── basic/                                # Basic editing tools
│   │   │   ├── movement/
│   │   │   │   ├── MovementTool.ts               # FROM: components/FloorPlanEditor/Tools/Categories/BasicTools/movement/
│   │   │   │   ├── MovementTool.test.ts
│   │   │   │   ├── MovementToolInspector.tsx     # Tool-specific inspector
│   │   │   │   └── MovementToolOverlay.tsx       # Tool-specific overlay
│   │   │   │
│   │   │   ├── selection/
│   │   │   │   ├── SelectionTool.ts
│   │   │   │   ├── SelectionTool.test.ts
│   │   │   │   ├── SelectionToolInspector.tsx
│   │   │   │   └── SelectionToolOverlay.tsx
│   │   │   │
│   │   │   ├── fit-to-view/
│   │   │   │   ├── FitToViewTool.ts              # FROM: components/FloorPlanEditor/Tools/Categories/BasicTools/
│   │   │   │   └── FitToViewTool.test.ts
│   │   │   │
│   │   │   └── [other basic tools]/
│   │   │
│   │   ├── perimeter/                            # Perimeter-specific tools
│   │   │   ├── add-opening/
│   │   │   │   ├── AddOpeningTool.ts             # FROM: components/FloorPlanEditor/Tools/Categories/PerimeterTools/
│   │   │   │   ├── AddOpeningTool.test.ts
│   │   │   │   ├── AddOpeningToolInspector.tsx   # FROM: components/FloorPlanEditor/Tools/PropertiesPanel/ToolInspectors/
│   │   │   │   └── AddOpeningToolOverlay.tsx
│   │   │   │
│   │   │   ├── preset/
│   │   │   │   ├── PerimeterPresetTool.ts
│   │   │   │   ├── PerimeterPresetTool.test.ts
│   │   │   │   ├── PerimeterPresetToolInspector.tsx
│   │   │   │   ├── PerimeterPresetToolOverlay.tsx
│   │   │   │   └── presets/                      # FROM: components/FloorPlanEditor/Tools/Categories/PerimeterTools/presets/
│   │   │   │       ├── [preset files]
│   │   │   │
│   │   │   └── [other perimeter tools]/
│   │   │
│   │   └── system/                               # Tool framework
│   │       ├── BaseTool.ts                       # FROM: components/FloorPlanEditor/Tools/ToolSystem/
│   │       ├── ToolManager.ts
│   │       ├── ToolContext.tsx
│   │       ├── KeyboardShortcutManager.ts
│   │       ├── types.ts
│   │       │
│   │       ├── hooks/
│   │       │   └── useReactiveTool.ts            # FROM: components/FloorPlanEditor/Tools/hooks/
│   │       │
│   │       └── events/
│   │           └── CanvasEventDispatcher.ts      # FROM: components/FloorPlanEditor/Tools/EventHandlers/
│   │
│   ├── services/                                 # Editor-specific services
│   │   └── snapping/                             # Editor/tools specific
│   │       ├── SnappingService.ts                # FROM: model/store/services/snapping/
│   │       ├── SnappingService.test.ts
│   │       ├── types.ts
│   │       └── index.ts
│   │
│   ├── overlays/                                 # Editor overlays
│   │   ├── GridSizeDisplay.tsx                   # FROM: components/FloorPlanEditor/
│   │   ├── GridSizeDisplay.test.tsx
│   │   ├── StoreySelector.tsx                    # FROM: components/FloorPlanEditor/
│   │   ├── StoreySelector.test.tsx
│   │   ├── LengthIndicator.tsx                   # FROM: components/FloorPlanEditor/components/
│   │   ├── LengthIndicator.test.tsx
│   │   ├── SelectionOutline.tsx                  # FROM: components/FloorPlanEditor/components/
│   │   ├── SelectionOutline.test.tsx
│   │   └── SnappingLines.tsx                     # FROM: components/FloorPlanEditor/components/
│   │
│   ├── toolbar/                                  # Main toolbar
│   │   └── MainToolbar.tsx                       # FROM: components/FloorPlanEditor/Tools/Toolbar/
│   │
│   ├── properties/                               # Properties panel (editor UI)
│   │   └── PropertiesPanel.tsx                   # FROM: components/FloorPlanEditor/Tools/PropertiesPanel/
│   │
│   ├── hooks/                                    # Editor-specific hooks
│   │   ├── useEditorStore.ts                     # FROM: components/FloorPlanEditor/hooks/
│   │   ├── useSelectionStore.ts                  # FROM: components/FloorPlanEditor/hooks/
│   │   └── useViewportStore.ts                   # FROM: components/FloorPlanEditor/hooks/
│   │
│   └── FloorPlanEditor.tsx                       # FROM: components/FloorPlanEditor/
│
├── building/                                     # Building model domain
│   │
│   ├── model/                                    # Core building entities
│   │   ├── storey.ts                             # EXTRACTED FROM: types/model.ts
│   │   ├── perimeter.ts                          # EXTRACTED FROM: types/model.ts
│   │   ├── wall.ts                               # EXTRACTED FROM: types/model.ts
│   │   └── opening.ts                            # EXTRACTED FROM: types/model.ts
│   │
│   ├── store/                                    # Building state management
│   │   ├── slices/
│   │   │   ├── perimeterSlice.ts                 # FROM: model/store/slices/
│   │   │   ├── perimeterSlice.test.ts
│   │   │   ├── storeysSlice.ts                   # FROM: model/store/slices/
│   │   │   └── storeysSlice.test.ts
│   │   │
│   │   ├── services/
│   │   │   ├── StoreyManagementService.ts        # FROM: model/store/services/
│   │   │   └── StoreyManagementService.test.ts
│   │   │
│   │   ├── index.ts                              # FROM: model/store/
│   │   └── types.ts                              # FROM: model/store/
│   │
│   ├── components/                               # Building entity inspectors & management
│   │   ├── inspectors/                           # Entity property panels
│   │   │   ├── OpeningInspector.tsx              # FROM: components/FloorPlanEditor/Tools/PropertiesPanel/Inspectors/
│   │   │   ├── PerimeterInspector.tsx            # FROM: components/FloorPlanEditor/Tools/PropertiesPanel/Inspectors/
│   │   │   ├── StoreyInspector.tsx               # FROM: components/FloorPlanEditor/Tools/PropertiesPanel/Inspectors/
│   │   │   ├── WallInspector.tsx                 # FROM: components/FloorPlanEditor/Tools/PropertiesPanel/Inspectors/
│   │   │   └── index.ts                          # FROM: components/FloorPlanEditor/Tools/PropertiesPanel/Inspectors/
│   │   │
│   │   ├── StoreyListItem.tsx                    # FROM: components/FloorPlanEditor/
│   │   └── StoreyManagementModal.tsx             # FROM: components/FloorPlanEditor/
│   │
│   └── hooks/                                    # Building-specific hooks
│       └── usePropertiesPanel.ts                 # FROM: hooks/
│
├── construction/                                 # Construction planning domain
│   │
│   ├── walls/                                    # Wall construction methods
│   │   ├── infill/
│   │   │   ├── infill.ts                         # FROM: construction/
│   │   │   ├── infill.test.ts
│   │   │   └── infill.constructInfillWall.test.ts
│   │   │
│   │   ├── strawhenge/
│   │   │   ├── strawhenge.ts                     # FROM: construction/
│   │   │   └── strawhenge.test.ts                # INFERRED
│   │   │
│   │   ├── corners/                              # Part of wall construction
│   │   │   ├── corners.ts                        # FROM: construction/
│   │   │   └── corners.test.ts
│   │   │
│   │   ├── base.ts                               # FROM: construction/
│   │   ├── base.test.ts
│   │   └── index.ts                              # FROM: construction/
│   │
│   ├── ringBeams/                                # Separate domain - not materials
│   │   ├── ringBeams.ts                          # FROM: construction/
│   │   └── ringBeams.test.ts
│   │
│   ├── materials/                                # Material calculations
│   │   ├── straw.ts                              # FROM: construction/
│   │   ├── straw.test.ts
│   │   ├── posts.ts                              # FROM: construction/
│   │   ├── posts.test.ts
│   │   └── material.ts                           # FROM: construction/
│   │
│   ├── measurements/                             # Measurement & estimation
│   │   ├── measurements.ts                       # FROM: construction/
│   │   ├── measurements.test.ts
│   │   └── measurements.integration.test.ts
│   │
│   ├── openings/                                 # Opening-specific construction
│   │   ├── openings.ts                           # FROM: construction/
│   │   └── openings.test.ts
│   │
│   ├── config/                                   # Construction configuration
│   │   ├── store.ts                              # FROM: config/ (construction-specific config)
│   │   ├── store.test.ts
│   │   └── index.ts                              # FROM: config/
│   │
│   └── components/                               # Construction UI (SVG-based)
│       ├── RingBeamConstructionModal.tsx         # FROM: components/FloorPlanEditor/
│       ├── RingBeamConstructionModal.test.tsx
│       ├── WallConstructionPlan.tsx              # FROM: components/FloorPlanEditor/
│       └── SvgMeasurementIndicator.tsx           # FROM: components/FloorPlanEditor/components/ (SVG for construction plans)
│
├── shared/                                       # Shared utilities & types
│   │
│   ├── geometry/                                 # Geometric calculations (directly under shared)
│   │   ├── basic.ts                              # FROM: types/geometry/
│   │   ├── line.ts                               # FROM: types/geometry/
│   │   ├── polygon.ts                            # FROM: types/geometry/
│   │   ├── geometry.test.ts                      # FROM: types/geometry/
│   │   └── index.ts                              # FROM: types/geometry/
│   │
│   ├── types/                                    # Core type definitions
│   │   ├── ids.ts                                # FROM: types/
│   │   ├── config.ts                             # FROM: types/
│   │   ├── model.ts                              # FROM: types/ (reduced, entities moved to building/)
│   │   └── index.ts                              # FROM: types/
│   │
│   ├── utils/                                    # General utilities
│   │   ├── formatLength.ts                       # FROM: utils/
│   │   ├── formatLength.test.ts
│   │   ├── entityDisplay.ts                      # FROM: utils/
│   │   ├── constructionCoordinates.ts            # FROM: utils/
│   │   └── constructionCoordinates.test.ts
│   │
│   ├── hooks/                                    # General shared hooks
│   │   ├── useElementSize.ts                     # FROM: hooks/
│   │   └── useDebouncedInput.ts                  # FROM: components/FloorPlanEditor/hooks/ (general shared hook)
│   │
│   ├── components/                               # Generic UI components
│   │   ├── Loading.tsx                           # FROM: components/
│   │   ├── Logo.tsx                              # FROM: components/
│   │   ├── SVGViewport.tsx                       # FROM: components/FloorPlanEditor/components/ (SVG-related, for construction plans)
│   │   └── SVGViewport.test.tsx
│   │
│   └── theme/                                    # Theme & styling
│       └── colors.ts                             # FROM: theme/
│
└── test/                                         # Test utilities
    └── setup.ts                                  # FROM: test/
```

## Migration Benefits

### 1. Domain-Driven Organization

- Each top-level folder represents a clear business domain
- Related functionality is grouped together regardless of technical implementation

### 2. Tool-Centric Structure

- Tools, their inspectors, overlays, and tests are co-located
- Easy to find everything related to a specific tool
- Scalable pattern for adding new tools

### 3. Clear Boundaries

- **Editor**: Konva/Canvas-based floor plan editing
- **Building**: Core building entities and their management
- **Construction**: SVG-based construction planning and calculations
- **Shared**: Truly reusable utilities and types

### 4. Reduced Coupling

- Clear separation between editor (Konva) and construction (SVG) UI
- Geometry utilities properly shared across domains
- Construction config co-located with construction logic

## Migration Strategy

### Phase 1: Shared Domain (LOW RISK)

1. Move geometry types to `shared/geometry/`
2. Move general hooks to `shared/hooks/`
3. Update imports across codebase

### Phase 2: Construction Domain (LOW-MEDIUM RISK)

1. Reorganize construction methods into `walls/`
2. Move construction config to `construction/config/`
3. Group construction components

### Phase 3: Editor Domain (MEDIUM RISK)

1. Extract tool system and reorganize by tool groups
2. Move editor services (snapping)
3. Reorganize canvas layers and shapes

### Phase 4: Building Domain (MEDIUM RISK)

1. Extract building entities from types
2. Move building store and services
3. Move entity inspectors

### Phase 5: Cleanup (LOW RISK)

1. Remove empty directories
2. Update path mapping in tsconfig.json
3. Update documentation

## Risk Assessment

**Overall Risk: LOW-MEDIUM**

- Primarily involves moving files and updating imports
- TypeScript will catch any broken imports during migration
- Comprehensive test suite will verify functionality remains intact
- Can be done incrementally with git to track changes

## Testing Strategy

1. Run full test suite after each phase
2. Verify TypeScript compilation at each step
3. Test application functionality manually
4. Use git to track and potentially rollback changes

## Path Mapping Recommendation

Add to `tsconfig.json` for cleaner imports:

```json
{
  "compilerOptions": {
    "paths": {
      "@/editor/*": ["./src/editor/*"],
      "@/building/*": ["./src/building/*"],
      "@/construction/*": ["./src/construction/*"],
      "@/shared/*": ["./src/shared/*"]
    }
  }
}
```

## Expected Outcomes

1. **Improved Developer Experience**: Easier to navigate and understand codebase
2. **Better Maintainability**: Related code is co-located
3. **Clearer Architecture**: Domain boundaries are explicit
4. **Easier Testing**: Test files are co-located with implementation
5. **Simplified Onboarding**: New developers can understand the structure quickly

This semantic organization will make the strawbaler-online codebase much more maintainable and easier to work with as it continues to grow.
