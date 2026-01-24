# Construction Geometry Store Implementation Plan

## Overview

Introduce a Zustand store for construction geometry with:

- Full hierarchical caching (wall → perimeter → storey → building)
- Lazy regeneration based on timestamp comparison
- Intelligent invalidation cascading up the hierarchy
- Memory-only caching (no persistence complexity)

## Architecture

```
Building Model Store (add timestamps)
    ↓
Assembly Config Store (add timestamps)
    ↓
Geometry Store (NEW) - Full hierarchy, lazy regeneration, memory-only
    ↓
Replace factory pattern in existing modals
```

## Hierarchy Levels

```
Building (constructModel)
  └─ Storey (constructStorey)
      ├─ Perimeter (constructPerimeter)
      │   ├─ Wall (constructWall)
      │   ├─ Base Ring Beam
      │   └─ Top Ring Beam
      ├─ Floor
      │   ├─ Floor Construction
      │   ├─ Floor Layers
      │   └─ Ceiling Layers
      └─ Roof (constructRoof)
          ├─ Roof Sides
          ├─ Purlins (for purlin type)
          └─ Various layers
```

## Key Design Decisions

### 1. Timestamp-Based Invalidation

- All entities get `updatedAt: number` timestamp
- Assembly configs get `updatedAt: number` timestamp
- Geometry store tracks dependencies with captured timestamps
- Lazy regeneration: regenerate on access if dependencies changed

### 2. Cross-Slice Access Challenge

**Challenge**: Store slices don't have typing access to each other.

**Solution**: Don't cascade timestamps in the building store itself. Instead:

- Update only the modified entity's timestamp
- Geometry store checks ALL dependencies (not just parent's timestamp)
- Example: When wall changes, update `wall.updatedAt`. When geometry store checks perimeter dependencies, it sees `wall.updatedAt > cachedWallTimestamp` and regenerates.

**Why this works**:

- The geometry store's `shouldRegenerate()` checks ALL dependency timestamps
- It doesn't rely on parent timestamps being updated
- Cleaner separation of concerns, no cross-slice coupling needed

### 3. Memory-Only Caching

- No persistence to localStorage
- Geometry regenerated on page load from base shapes
- Simplifies implementation (no serialization of clipped manifolds)
- Trade-off: slower initial page load, but fast subsequent operations

### 4. Dependency Tracking

Each geometry cache entry stores:

- `building`: Map of entity ID → timestamp (e.g., 'wall-xxx': 1234567890)
- `assemblies`: Map of assembly ID → timestamp (e.g., 'wallAssembly-aaa': 1234567890)

On regeneration, collect current timestamps and compare.

## Implementation Phases

### Phase 1: Add Timestamps to Building Model Store

**Files to modify**:

- `src/building/model.ts` - Add `updatedAt` to all entity interfaces
- `src/building/store/slices/storeysSlice.ts` - Update all mutations
- `src/building/store/slices/perimeterSlice.ts` - Update all mutations
- `src/building/store/slices/floorsSlice.ts` - Update all mutations
- `src/building/store/slices/roofsSlice.ts` - Update all mutations

**Entities to update**:

- Storey, Perimeter, PerimeterWall, PerimeterCorner, Opening, WallPost
- FloorArea, FloorOpening, Roof, RoofOverhang

**Pattern**:

```typescript
// Before:
updateStoreyFloorHeight: (storeyId: StoreyId, floorHeight: Length) => {
  set(({ storeys }) => {
    if (storeyId in storeys) {
      storeys[storeyId].floorHeight = floorHeight
    }
  })
}

// After:
updateStoreyFloorHeight: (storeyId: StoreyId, floorHeight: Length) => {
  set(({ storeys }) => {
    if (storeyId in storeys) {
      storeys[storeyId].floorHeight = floorHeight
      storeys[storeyId].updatedAt = Date.now()
    }
  })
}
```

**Important**: Don't try to update parent entity timestamps in other slices. The geometry store will handle dependency checking.

---

### Phase 2: Add Timestamps to Assembly Config Store

**Files to modify**:

- `src/construction/config/types.ts` - Add `updatedAt` to all assembly config interfaces
- `src/construction/config/store/slices/walls.ts` - Update all mutations
- `src/construction/config/store/slices/floors.ts` - Update all mutations
- `src/construction/config/store/slices/roofs.ts` - Update all mutations
- `src/construction/config/store/slices/ringBeams.ts` - Update all mutations
- `src/construction/config/store/slices/openings.ts` - Update all mutations

**Pattern**:

```typescript
// Before:
addWallAssembly: (name: string, config: WallConfig) => {
  const id = createWallAssemblyId()
  const assembly = { ...config, id, name }
  set(state => ({ ...state, wallAssemblyConfigs: { ...state.wallAssemblyConfigs, [id]: assembly } }))
  return assembly
}

// After:
addWallAssembly: (name: string, config: WallConfig) => {
  const id = createWallAssemblyId()
  const assembly = { ...config, id, name, updatedAt: Date.now() }
  set(state => ({ ...state, wallAssemblyConfigs: { ...state.wallAssemblyConfigs, [id]: assembly } }))
  return assembly
}
```

---

### Phase 3: Create Geometry Store

**New files**:

- `src/construction/geometryStore/types.ts` - State and action interfaces
- `src/construction/geometryStore/intelligence.ts` - Timestamp comparison and dependency collection
- `src/construction/geometryStore/helpers.ts` - Helper functions
- `src/construction/geometryStore/index.ts` - Main store with Zustand

**Key interfaces**:

```typescript
interface Dependencies {
  building: { [entityKey: string]: number }
  assemblies: { [assemblyKey: string]: number }
}

interface GeometryCacheEntry {
  model: ConstructionModel | null
  timestamp: number
  dependencies: Dependencies
}

interface ConstructionGeometryState {
  walls: Record<PerimeterWallId, GeometryCacheEntry>
  roofs: Record<RoofId, GeometryCacheEntry>
  perimeters: Record<PerimeterId, GeometryCacheEntry>
  storeys: Record<StoreyId, GeometryCacheEntry>
  building: GeometryCacheEntry | null
}
```

**Key functions**:

1. `shouldRegenerate(cache, currentDependencies): boolean`
   - Compare cached timestamps with current timestamps
   - Return true if any dependency changed

2. `collectWallDependencies(wallId): Dependencies`
   - Collect wall, perimeter, wallAssembly, opening, openingAssembly timestamps

3. `collectRoofDependencies(roofId): Dependencies`
   - Collect roof, storey, roofAssembly, all perimeters in storey timestamps

4. `collectPerimeterDependencies(perimeterId): Dependencies`
   - Collect perimeter, storey, ringBeamAssemblies, all walls in perimeter timestamps

5. `collectStoreyDependencies(storeyId): Dependencies`
   - Collect storey, floorAssembly, all perimeters, all roofs, all floor openings timestamps

6. `collectBuildingDependencies(): Dependencies`
   - Collect all storeys and their floor/ceiling assembly timestamps

**Lazy regeneration pattern**:

```typescript
getWallGeometry: (wallId: PerimeterWallId) => {
  const state = get()
  const cache = state.walls[wallId]
  const currentDependencies = collectWallDependencies(wallId)

  if (!cache || shouldRegenerate(cache, currentDependencies)) {
    const model = constructWall(wallId)
    set(state => {
      state.walls[wallId] = {
        model,
        timestamp: Date.now(),
        dependencies: currentDependencies
      }
    })
    // Invalidate parent levels
    state.actions.invalidatePerimeter(wall.perimeterId)
    return model
  }

  return cache.model
}
```

**Cascading invalidation**:

```typescript
invalidateWall: (wallId: PerimeterWallId) => {
  const wall = getModelActions().getPerimeterWallById(wallId)
  set(state => {
    delete state.walls[wallId]
    delete state.perimeters[wall.perimeterId]
    delete state.storeys[wall.storeyId]
    state.building = null
  })
}
```

**Assembly invalidation**:

```typescript
invalidateAssembly: (assemblyId: string, type) => {
  const modelActions = getModelActions()
  set(state => {
    if (type === 'wall') {
      const walls = modelActions.getAllPerimeterWalls()
      const wallsUsingAssembly = walls.filter(w => w.assemblyId === assemblyId)

      for (const wall of wallsUsingAssembly) {
        delete state.walls[wall.id]
      }

      // Invalidate perimeters containing these walls
      const perimeterIds = new Set(wallsUsingAssembly.map(w => w.perimeterId))
      for (const perimeterId of perimeterIds) {
        delete state.perimeters[perimeterId]
      }

      // Invalidate storeys containing these perimeters
      const storeyIds = new Set(Array.from(perimeterIds).map(pid => modelActions.getPerimeterById(pid).storeyId))
      for (const storeyId of storeyIds) {
        delete state.storeys[storeyId]
      }

      state.building = null
    }
    // Similar for other assembly types
  })
}
```

---

### Phase 4: Extract Wall Construction Helper

**New file**: `src/construction/walls/construction.ts`

Need to extract wall construction logic so it can be called independently from perimeter construction. Currently `constructPerimeter()` calls `wallAssembly.construct()` directly. Need a function like:

```typescript
export function constructWall(wallId: PerimeterWallId): ConstructionModel | null
```

---

### Phase 5: Integrate with Existing Modals

**Files to modify**:

- `src/construction/components/ConstructionPlanModal.tsx`
- `src/construction/viewer3d/ConstructionViewer3DModal.tsx`

**Changes**:

- Replace `constructionModelFactory` prop with geometry store access
- Use `getGeometryActions().getBuildingGeometry()` instead of `constructModel()`

---

### Phase 6: Add Tests

**New files**:

- `src/construction/geometryStore/intelligence.test.ts`
- `src/construction/geometryStore/index.test.ts`

**Test coverage**:

- Timestamp comparison logic
- Dependency collection for each level
- Cache invalidation
- Cascading invalidation
- Assembly change invalidation
- Lazy regeneration behavior

---

## Final File Structure

```
src/
├── building/
│   ├── model.ts (add updatedAt fields)
│   └── store/
│       └── slices/
│           ├── storeysSlice.ts (update mutations)
│           ├── perimeterSlice.ts (update mutations)
│           ├── floorsSlice.ts (update mutations)
│           └── roofsSlice.ts (update mutations)
├── construction/
│   ├── config/
│   │   ├── store/
│   │   │   └── slices/
│   │   │       ├── walls.ts (update mutations)
│   │   │       ├── floors.ts (update mutations)
│   │   │       ├── roofs.ts (update mutations)
│   │   │       ├── ringBeams.ts (update mutations)
│   │   │       └── openings.ts (update mutations)
│   │   └── types.ts (add updatedAt fields)
│   ├── geometryStore/ (NEW)
│   │   ├── index.ts (main store)
│   │   ├── types.ts (interfaces)
│   │   ├── intelligence.ts (regeneration logic)
│   │   ├── helpers.ts (helper functions)
│   │   ├── index.test.ts
│   │   └── intelligence.test.ts
│   ├── walls/
│   │   └── construction.ts (NEW - extract wall construction)
│   ├── components/
│   │   ├── ConstructionPlanModal.tsx (update to use store)
│   └── viewer3d/
│       └── ConstructionViewer3DModal.tsx (update to use store)
└── docs/
    └── CONSTRUCTION_GEOMETRY_STORE.md (this file)
```

## Benefits

1. **Efficient caching**: Only regenerate what changed
2. **Granular control**: Access geometry at any level (wall, perimeter, storey, building)
3. **Clean separation**: No cross-slice coupling in building store
4. **Lazy evaluation**: Regenerate only when needed, not proactively
5. **Simple persistence**: Memory-only, no complex serialization

## Trade-offs

1. **Slower page loads**: Geometry regenerated from scratch on load
2. **Memory usage**: Cached geometry stored in memory (mitigated by lazy invalidation)
3. **Initial complexity**: Need to add timestamps throughout codebase
