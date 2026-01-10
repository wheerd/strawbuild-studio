# Perimeter Slice Test Strategy

## Overview

The perimeter slice has been refactored to use a normalized data structure with separate collections for each entity type (perimeters, walls, corners, openings, posts). This requires a comprehensive test strategy to ensure data integrity and reference consistency.

## Complete Action Coverage

This strategy covers all **50+ actions** in the perimeter slice:

**Perimeter Operations:**

- `addPerimeter`, `removePerimeter`, `getPerimeterById`, `getPerimetersByStorey`, `getAllPerimeters`
- `setPerimeterReferenceSide`, `movePerimeter`, `updatePerimeterBoundary`

**Wall Operations:**

- `getPerimeterWallById`, `getPerimeterWallsById`, `getWallOpeningsById`
- `updatePerimeterWallAssembly`, `updatePerimeterWallThickness`
- `updateAllPerimeterWallsAssembly`, `updateAllPerimeterWallsThickness`
- `removePerimeterWall`, `canRemovePerimeterWall`, `splitPerimeterWall`

**Ring Beam Operations:**

- `setWallBaseRingBeam`, `setWallTopRingBeam`, `removeWallBaseRingBeam`, `removeWallTopRingBeam`
- `setAllWallsBaseRingBeam`, `setAllWallsTopRingBeam`, `removeAllWallsBaseRingBeam`, `removeAllWallsTopRingBeam`

**Corner Operations:**

- `getPerimeterCornerById`, `getPerimeterCornersById`
- `updatePerimeterCornerConstructedByWall`, `canSwitchCornerConstructedByWall`
- `removePerimeterCorner`, `canRemovePerimeterCorner`

**Opening Operations:**

- `addWallOpening`, `removeWallOpening`, `updateWallOpening`
- `getWallOpeningById`, `getWallEntityById`
- `isWallOpeningPlacementValid`, `findNearestValidWallOpeningPosition`

**Wall Post Operations:**

- `addWallPost`, `removeWallPost`, `updateWallPost`
- `getWallPostById`
- `isWallPostPlacementValid`, `findNearestValidWallPostPosition`

## Key Testing Principles

1. **Reference Consistency**: Verify bidirectional references stay in sync
2. **Cascade Cleanup**: Ensure related entities and geometry are cleaned up on deletion
3. **Geometry Integrity**: Verify geometry is calculated correctly and stays consistent
4. **Error Handling**: Test that operations throw appropriately for invalid state
5. **Edge Cases**: Test boundary conditions (minimum entities, self-intersection, etc.)

## Proposed Test File Structure

```
src/building/store/slices/
├── __tests__/
│   ├── perimeterSlice.test.ts          # Perimeter CRUD + reference management
│   ├── perimeterWallSlice.test.ts      # Wall operations + splitting
│   ├── perimeterCornerSlice.test.ts    # Corner operations + switching
│   ├── openingSlice.test.ts            # Opening CRUD + validation
│   ├── wallPostSlice.test.ts           # Post CRUD + validation
│   ├── perimeterGeometry.test.ts       # Pure geometry calculations
│   └── perimeterIntegration.test.ts    # Cross-entity operations
```

---

## 1. Perimeter Tests (`perimeterSlice.test.ts`)

### Basic CRUD Operations

- ✅ `addPerimeter` creates perimeter with walls and corners
- ✅ `removePerimeter` deletes perimeter and cascades to all children

### Reference Consistency

- ✅ Created walls reference correct perimeter ID
- ✅ Created corners reference correct perimeter ID
- ✅ Walls reference correct start/end corner IDs
- ✅ Corners reference correct previous/next wall IDs
- ✅ `wallIds` and `cornerIds` arrays match created entities

### Cascade Cleanup

- ✅ Removing perimeter removes all walls
- ✅ Removing perimeter removes all corners
- ✅ Removing perimeter removes all openings on walls
- ✅ Removing perimeter removes all wall posts
- ✅ Removing perimeter cleans up all geometry records
  - `_perimeterGeometry[id]`
  - `_perimeterWallGeometry[wallId]` for each wall
  - `_perimeterCornerGeometry[cornerId]` for each corner
  - `_openingGeometry[openingId]` for each opening
  - `_wallPostGeometry[postId]` for each post

### Validation

- ✅ Rejects invalid polygons (< 3 points)
- ✅ Rejects self-intersecting polygons
- ✅ Rejects invalid thickness (<= 0)
- ✅ Normalizes polygon to clockwise

### Bulk Operations

- ✅ `updateAllPerimeterWallsAssembly` updates all walls
- ✅ `updateAllPerimeterWallsThickness` updates all walls and recalculates geometry

### Reference Side

- ✅ `setPerimeterReferenceSide` updates reference side and recalculates geometry
- ✅ Changing to 'outside' flips the reference polygon
- ✅ Geometry is recalculated for all walls and corners

### Movement Operations

- ✅ `movePerimeter` translates all corners by offset vector
- ✅ `movePerimeter` recalculates geometry after move
- ✅ `movePerimeter` preserves perimeter shape
- ✅ `movePerimeter` returns false for non-existent perimeter
- ✅ `updatePerimeterBoundary` updates with new boundary points
- ✅ `updatePerimeterBoundary` adjusts number of walls/corners if needed
- ✅ `updatePerimeterBoundary` preserves wall properties where possible
- ✅ `updatePerimeterBoundary` rejects invalid boundaries (< 3 points)
- ✅ `updatePerimeterBoundary` validates new boundary doesn't self-intersect
- ✅ `updatePerimeterBoundary` returns false for non-existent perimeter

### Ring Beam Bulk Operations

- ✅ `setAllWallsBaseRingBeam` sets base ring beam for all walls
- ✅ `setAllWallsTopRingBeam` sets top ring beam for all walls
- ✅ `removeAllWallsBaseRingBeam` removes base ring beam from all walls
- ✅ `removeAllWallsTopRingBeam` removes top ring beam from all walls

---

## 2. Perimeter Wall Tests (`perimeterWallSlice.test.ts`)

### Basic Operations

- ✅ `updatePerimeterWallAssembly` updates single wall
- ✅ `updatePerimeterWallThickness` updates wall and recalculates geometry

### Ring Beam Operations (Individual Wall)

- ✅ `setWallBaseRingBeam` sets base ring beam assembly
- ✅ `setWallTopRingBeam` sets top ring beam assembly
- ✅ `removeWallBaseRingBeam` removes base ring beam
- ✅ `removeWallTopRingBeam` removes top ring beam
- ✅ Ring beam changes don't affect geometry
- ✅ Operations handle non-existent wall gracefully

### Wall Removal

- ✅ `removePerimeterWall` returns false for minimum walls (< 3)
- ✅ `removePerimeterWall` merges adjacent corners correctly
- ✅ `removePerimeterWall` updates perimeter's `wallIds` array
- ✅ `removePerimeterWall` cleans up wall geometry
- ✅ `removePerimeterWall` cascades to openings and posts on wall
- ✅ `canRemovePerimeterWall` returns correct validation result

### Wall Splitting

- ✅ `splitPerimeterWall` creates new wall and corner
- ✅ `splitPerimeterWall` updates perimeter's `wallIds` and `cornerIds`
- ✅ `splitPerimeterWall` preserves wall properties (assembly, thickness, ring beams)
- ✅ `splitPerimeterWall` redistributes openings/posts based on position
- ✅ `splitPerimeterWall` rejects invalid split positions (< 0, > wall length)
- ✅ `splitPerimeterWall` creates geometry for new entities

### Reference Consistency After Operations

- ✅ Wall removal updates adjacent corners' wall references
- ✅ Wall splitting updates corner references correctly
- ✅ Opening/post wall IDs remain valid after split

---

## 3. Perimeter Corner Tests (`perimeterCornerSlice.test.ts`)

### Corner Removal

- ✅ `removePerimeterCorner` returns false for minimum corners (< 3)
- ✅ `removePerimeterCorner` merges adjacent walls correctly
- ✅ `removePerimeterCorner` updates perimeter's `cornerIds` array
- ✅ `removePerimeterCorner` cleans up corner geometry
- ✅ `removePerimeterCorner` rejects removal if causes self-intersection
- ✅ `canRemovePerimeterCorner` returns correct validation result

### Corner Switching

- ✅ `updatePerimeterCornerConstructedByWall` switches construction ownership
- ✅ `updatePerimeterCornerConstructedByWall` recalculates geometry
- ✅ `canSwitchCornerConstructedByWall` returns false when walls have different thicknesses
- ✅ Corner switching preserves references

### Reference Consistency

- ✅ Corner removal updates adjacent walls' corner references
- ✅ Corner references stay consistent after wall operations

---

## 4. Opening Tests (`openingSlice.test.ts`)

### Basic CRUD

- ✅ `addWallOpening` creates opening with correct wall reference
- ✅ `addWallOpening` updates wall's `entityIds` array
- ✅ `addWallOpening` creates geometry
- ✅ `addWallOpening` rejects invalid parameters (width <= 0, etc.)
- ✅ `removeWallOpening` removes opening and updates wall's `entityIds`
- ✅ `removeWallOpening` cleans up geometry
- ✅ `updateWallOpening` updates opening and recalculates geometry

### Validation

- ✅ `isWallOpeningPlacementValid` validates position and overlap
- ✅ `findNearestValidWallOpeningPosition` finds valid position or returns null
- ✅ `addWallOpening` respects validation and returns null for invalid placements

### Reference Consistency

- ✅ Opening maintains correct wall ID
- ✅ Wall's `entityIds` stays in sync with actual openings
- ✅ Openings are cleaned up when wall is removed

---

## 5. Wall Post Tests (`wallPostSlice.test.ts`)

### Basic CRUD

- ✅ `addWallPost` creates post with correct wall reference
- ✅ `addWallPost` updates wall's `entityIds` array
- ✅ `addWallPost` creates geometry
- ✅ `addWallPost` rejects invalid parameters
- ✅ `removeWallPost` removes post and updates wall's `entityIds`
- ✅ `removeWallPost` cleans up geometry
- ✅ `updateWallPost` updates post and recalculates geometry

### Validation

- ✅ `isWallPostPlacementValid` validates position and overlap
- ✅ `findNearestValidWallPostPosition` finds valid position or returns null

### Reference Consistency

- ✅ Post maintains correct wall ID
- ✅ Wall's `entityIds` stays in sync with actual posts
- ✅ Posts are cleaned up when wall is removed

---

## 6. Perimeter Geometry Tests (`perimeterGeometry.test.ts`)

This should test the pure geometry calculation functions in `perimeterGeometry.ts`.

### Corner Geometry

- ✅ `calculateCornerGeometry` computes inside/outside points correctly
- ✅ Handles right angles (90°, 270°)
- ✅ Handles acute angles (< 90°)
- ✅ Handles obtuse angles (> 90°, < 180°)
- ✅ Handles reflex angles (> 180°)
- ✅ Computes interior/exterior angles correctly

### Wall Geometry

- ✅ `calculateWallGeometry` computes wall lines correctly
- ✅ Computes inside/outside lengths
- ✅ Computes wall length (between corner intersection points)
- ✅ Computes direction vectors
- ✅ Computes wall polygon correctly

### Perimeter Geometry

- ✅ `updatePerimeterGeometry` computes inner/outer polygons
- ✅ Handles reference side correctly (inside vs outside)

### Entity Geometry (Opening/Post)

- ✅ `calculateEntityGeometry` positions entities correctly on wall
- ✅ Computes entity polygons
- ✅ Handles edge cases (start/end of wall)

### Edge Cases

- ✅ Handles nearly-collinear corners
- ✅ Handles very thin walls
- ✅ Handles walls with different thicknesses at corners

---

## 7. Integration Tests (`perimeterIntegration.test.ts`)

### Complex Scenarios

- ✅ Add perimeter → add openings → split wall → verify openings redistributed
- ✅ Add perimeter → remove corner → verify walls merged and openings preserved
- ✅ Add perimeter → change all thicknesses → verify all geometry recalculated
- ✅ Add multiple perimeters on same storey → verify independence

### Getter Tests

- ✅ `getPerimeterById` throws for non-existent ID
- ✅ `getPerimeterWallById` throws for non-existent ID
- ✅ `getPerimeterCornerById` throws for non-existent ID
- ✅ `getWallOpeningById` throws for non-existent ID
- ✅ `getWallPostById` throws for non-existent ID
- ✅ `getPerimetersByStorey` returns correct perimeters
- ✅ `getAllPerimeters` returns all perimeters

### Reference Integrity

- ✅ After complex operations, all references are valid
- ✅ No orphaned entities in collections
- ✅ No orphaned geometry records

---

## Test Utilities

Create shared test utilities:

```typescript
// testHelpers.ts

export function createRectangularPerimeter(
  store: PerimetersSlice,
  storeyId: StoreyId,
  width = 10000,
  height = 5000,
  thickness = 420
): PerimeterWithGeometry

export function verifyPerimeterReferences(state: PerimetersState, perimeterId: PerimeterId): void

export function verifyNoOrphanedEntities(state: PerimetersState): void

export function verifyGeometryExists(state: PerimetersState, perimeterId: PerimeterId): void

export function expectThrowsForInvalidId<T>(getter: () => T, expectedMessage?: string): void
```

---

## Migration Considerations

When writing tests, consider:

1. Old test data may still reference old structure
2. Mock geometry calculation functions for unit tests
3. Use integration tests for full geometry validation
4. Test that getters throw instead of return null (breaking change)

---

## Priority Order

1. **High Priority** (Core functionality):
   - Perimeter CRUD + cleanup
   - Wall/Corner removal + reference consistency
   - Opening/Post CRUD + cleanup

2. **Medium Priority** (Advanced features):
   - Wall splitting
   - Corner switching
   - Validation functions
   - Bulk operations (assembly/thickness/ring beams)
   - Movement operations (`movePerimeter`, `updatePerimeterBoundary`)
   - Ring beam operations (individual and bulk)
   - Reference side switching

3. **Low Priority** (Nice to have):
   - Geometry edge cases
   - Complex integration scenarios
   - Performance tests
