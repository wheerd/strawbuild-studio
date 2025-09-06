# MoveTool Implementation Plan

## Overview

Implementation of a generic, extensible MoveTool that can handle movement of different entity types with proper constraints, validation, snapping, and visual feedback. The system uses a behavior-based architecture where each entity type has its own movement behavior that fully encapsulates the movement logic.

## ✅ COMPLETED: Delta-based Movement Implementation

**Fixed**: Opening move offset issue by implementing delta-based movement architecture.

### Key Changes Made:

1. **Updated MovementBehavior Interface**:
   - Position data moved to `MovementState` (cleaner immutable context)
   - Added `getEntityPosition()` method for proper entity position initialization
   - Methods now work with `MovementState` instead of individual parameters

2. **Fixed Opening Movement**:
   - Mouse offset properly preserved during movement
   - Opening no longer "jumps" to mouse cursor position
   - Delta-based calculation: `finalEntityPosition = initialEntityPosition + projected_mouseDelta`

3. **MoveTool Updates**:
   - Calculates and tracks mouse delta during movement
   - Initializes proper entity positions using behavior's `getEntityPosition()`
   - Maintains spatial relationship between mouse and entity

### Architecture Benefits:

- **No more jumping**: Entity maintains offset from mouse cursor
- **Cleaner separation**: Context is immutable, state contains all positioning data
- **Consistent UX**: All entity types now have proper offset handling

### Remaining TODOs:

- **Snapping**:
  - Preview with component
  - Reuse snapping context
- **Opening validation**: isOpeningPlacementValid needs to exclude moved opening
- **Complete other behaviors**: Wall segments and corners need full implementation (currently stubbed)

## Architecture

### Core Components

1. **MoveTool** - Generic tool that orchestrates movement but contains no entity-specific logic
2. **MovementBehavior Interface** - Contract for entity-specific movement logic
3. **Movement Behaviors** - Implementations for each entity type
4. **Slice Operations** - Domain logic for validation and data updates

## 1. Movement Behavior Interface

```typescript
// src/components/FloorPlanEditor/Tools/Categories/BasicTools/movement/MovementBehavior.ts

import type { SnapResult } from '@/model/store/services/snapping/types'
import type { Vec2 } from '@/types/geometry'
import type { SelectableId, EntityType } from '@/types/ids'
import type { StoreActions } from '@/model/store/types'
import type { SnappingService } from '@/model/store/services/snapping/SnappingService'

export interface MovementContext {
  entityId: SelectableId
  entityType: EntityType
  parentIds: SelectableId[]
  startPosition: Vec2
  currentPosition: Vec2
  store: StoreActions
  snappingService: SnappingService
}

export interface MovementState {
  snapResult: SnapResult | null
  isValidPosition: boolean
  finalPosition: Vec2 // The position after constraints/snapping
}

export interface MovementBehavior {
  // Apply constraints and snapping - returns final position and snap info
  constrainAndSnap(targetPosition: Vec2, context: MovementContext): MovementState

  // Validate position using slice logic - behavior constructs geometry, slice validates
  validatePosition(finalPosition: Vec2, context: MovementContext): boolean

  // Generate preview with full state
  generatePreview(movementState: MovementState, context: MovementContext): React.ReactNode[]

  // Commit movement using slice operations
  commitMovement(finalPosition: Vec2, context: MovementContext): boolean
}
```

## 2. Hard-coded Entity Type Mapping

```typescript
// src/components/FloorPlanEditor/Tools/Categories/BasicTools/movement/movementBehaviors.ts

import type { EntityType } from '@/types/ids'
import type { MovementBehavior } from './MovementBehavior'
import { OuterWallPolygonMovementBehavior } from './behaviors/OuterWallPolygonMovementBehavior'
import { WallSegmentMovementBehavior } from './behaviors/WallSegmentMovementBehavior'
import { OuterCornerMovementBehavior } from './behaviors/OuterCornerMovementBehavior'
import { OpeningMovementBehavior } from './behaviors/OpeningMovementBehavior'

const MOVEMENT_BEHAVIORS: Record<EntityType, MovementBehavior> = {
  'outer-wall': new OuterWallPolygonMovementBehavior(),
  'wall-segment': new WallSegmentMovementBehavior(),
  'outer-corner': new OuterCornerMovementBehavior(),
  opening: new OpeningMovementBehavior(),
  floor: null // Not implemented yet
}

export function getMovementBehavior(entityType: EntityType): MovementBehavior | null {
  return MOVEMENT_BEHAVIORS[entityType] || null
}
```

## 3. MoveTool Implementation

```typescript
// src/components/FloorPlanEditor/Tools/Categories/BasicTools/MoveTool.ts

export class MoveTool extends BaseTool implements Tool {
  id = 'basic.move'
  name = 'Move'
  icon = '↔'
  hotkey = 'm'
  cursor = 'move'
  category = 'basic'

  private static readonly MOVEMENT_THRESHOLD = 3 // pixels

  private toolState: {
    // Phase 1: Mouse down, waiting to see if user will drag
    isWaitingForMovement: boolean
    downPosition: Vec2 | null

    // Phase 2: Actually moving
    isMoving: boolean
    behavior: MovementBehavior | null
    context: MovementContext | null
    currentMovementState: MovementState | null
  } = {
    isWaitingForMovement: false,
    downPosition: null,
    isMoving: false,
    behavior: null,
    context: null,
    currentMovementState: null
  }

  handleMouseDown(event: CanvasEvent): boolean {
    // Detect entity and get appropriate behavior
    // Set up waiting state with movement threshold
  }

  handleMouseMove(event: CanvasEvent): boolean {
    // Check movement threshold
    // Delegate to behavior for constraints/snapping/validation
    // Update movement state
  }

  handleMouseUp(event: CanvasEvent): boolean {
    // Handle threshold check for click vs drag
    // Delegate to behavior for commit if valid
    // Reset state
  }

  overlayComponent = MoveToolOverlay
}
```

## 4. Movement Behaviors

### OuterWallPolygon Movement

- **Constraints**: None (free translation)
- **Snapping**: To other polygon corners and edges
- **Validation**: Always valid (translation preserves shape)
- **Commit**: Add offset to all boundary points, recalculate geometry

### WallSegment Movement

- **Constraints**: Perpendicular to segment direction only
- **Snapping**: None (constrained movement)
- **Validation**: Construct new boundary points, check for self-intersection using `wouldClosingPolygonSelfIntersect`
- **Commit**: Update boundary points connected to segment, recalculate geometry

### OuterCorner Movement

- **Constraints**: None (free movement)
- **Snapping**: To other points and lines for precision
- **Validation**: Construct new boundary with moved corner, check for self-intersection
- **Commit**: Update boundary point at corner index, recalculate geometry

### Opening Movement

- **Constraints**: Along segment direction only (changes offsetFromStart)
- **Snapping**: None (constrained movement)
- **Validation**: Calculate new offset, use existing `isOpeningPlacementValid`
- **Commit**: Update opening's offsetFromStart using existing `updateOpening`

## 5. Required Slice Operations

Add to `OuterWallsActions` interface:

```typescript
// For polygon translation
moveOuterWallPolygon: (wallId: OuterWallId, offset: Vec2) => boolean

// For segments and corners - updates boundary and recalculates everything
updateOuterWallBoundary: (wallId: OuterWallId, newBoundary: Vec2[]) => boolean

// Opening movement uses existing updateOpening - no new operation needed
```

## 6. Validation Strategy

**Key Insight**: Behaviors construct the new geometry, then delegate to existing validation:

- **Segments & Corners**: Calculate new boundary points → validate using `wouldClosingPolygonSelfIntersect`
- **Polygons**: Simple translation → always valid
- **Openings**: Calculate new offset → validate using existing `isOpeningPlacementValid`

## 7. Preview System

- Each behavior generates preview elements based on `MovementState`
- Preview includes:
  - Entity in new position with validity indication
  - Snap visualization (lines, points) when snapping occurs
  - Constraint visualization (axis lines for segments/openings)
  - Invalid position indicators (red overlay, warning text)

## 8. User Experience Features

### Movement Threshold

- 3-pixel threshold before movement starts
- Prevents accidental moves from simple clicks
- Two-phase approach: `isWaitingForMovement` → `isMoving`

### Real-time Validation

- Validation happens continuously during mouse move
- Immediate visual feedback via preview
- Invalid positions shown with red indicators

### Rich Visual Feedback

- Snap lines/points when snapping occurs
- Constraint visualization for limited movement
- Preview of entity in new position
- Clear invalid state indicators

## 9. Benefits

### Clean Architecture

- **MoveTool**: Generic orchestration, no entity knowledge
- **Behaviors**: Full encapsulation of entity-specific logic
- **Slice**: Domain logic and data integrity
- **Clear contracts**: Well-defined interfaces between components

### Extensibility

- New entity types just implement `MovementBehavior`
- Hard-coded mapping easy to extend
- Reusable validation and geometry functions
- Consistent UX pattern for all entity types

### Maintainability

- Entity logic isolated in behaviors
- Domain logic centralized in slice
- UI logic separated from business logic
- Each component has single responsibility

## 10. Implementation Order

1. Create movement behavior interface and types
2. Add required slice operations (`moveOuterWallPolygon`, `updateOuterWallBoundary`)
3. Implement movement behaviors (start with polygon, then segment, corner, opening)
4. Implement MoveTool with threshold and delegation logic
5. Create preview components and overlay
6. Add constraint and snap visualization components
7. Test with each entity type
8. Add integration tests

## 11. File Structure

```
src/components/FloorPlanEditor/Tools/Categories/BasicTools/
├── MoveTool.ts                    # Main tool implementation
├── movement/
│   ├── MovementBehavior.ts        # Interface and types
│   ├── movementBehaviors.ts       # Hard-coded mapping
│   └── behaviors/
│       ├── OuterWallPolygonMovementBehavior.ts
│       ├── WallSegmentMovementBehavior.ts
│       ├── OuterCornerMovementBehavior.ts
│       └── OpeningMovementBehavior.ts
└── overlays/
    ├── MoveToolOverlay.tsx        # Main overlay component
    └── components/
        ├── PolygonPreview.tsx
        ├── SegmentPreview.tsx
        ├── OpeningPreview.tsx
        ├── SnapVisualization.tsx
        └── ConstraintVisualization.tsx
```

This architecture provides a robust, extensible foundation for entity movement that maintains excellent separation of concerns while delivering a smooth user experience with rich visual feedback and proper validation.
