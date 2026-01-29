# Construction Geometry Store - Final Implementation Plan

## Overview

Zustand store for construction geometry caching with:

- **Cache all 4 model types**: colinear wall, perimeter, storey, building
- **No invalidation logic** - timestamp services detect outdated status
- **Manual regeneration** - users regenerate models when outdated
- **Outdated detection** - each getter returns `{model, isOutdated}`

## Architecture

```
Building Model Store (timestamps already tracked)
Assembly Config Store (timestamps already tracked)
Material Store (timestamps already tracked)
    ↓
BuildingTimestampDependencyService (already exists)
ConfigTimestampDependencyService (already exists)
    ↓
Geometry Cache Store (NEW)
    ├── colinearWalls: Map<wallId, {model, cachedAt}>
    ├── perimeters: Map<perimeterId, {model, cachedAt}>
    ├── storeys: Map<storeyId, {model, cachedAt}>
    └── building: {model, cachedAt} | null
    ↓
Construction functions (already exist)
    ├── constructWall(wallId, includeColinear=true)
    ├── constructPerimeter(perimeter)
    ├── constructStorey(storeyId)
    └── constructModel()
    ↓
Manifold Cache (already exists at src/construction/manifold/cache.ts)
    └── Low-level shape caching (cubes, extrusions, etc.)
```

**Key Insight**: Low-level manifold cache means actual geometry objects ARE shared.
Caching composite models only stores arrangements (transforms, groupings) of cached manifolds.

## Cache Structure

```typescript
interface CacheEntry {
  model: ConstructionModel | null
  cachedAt: number // When this cache entry was created (timestamp in ms)
}

interface ConstructionGeometryState {
  colinearWalls: Record<PerimeterWallId, CacheEntry>
  perimeters: Record<PerimeterId, CacheEntry>
  storeys: Record<StoreyId, CacheEntry>
  building: CacheEntry | null

  // Actions
  getColinearWallGeometry: (wallId: PerimeterWallId) => CacheResult
  getPerimeterGeometry: (perimeterId: PerimeterId) => CacheResult
  getStoreyGeometry: (storeyId: StoreyId) => CacheResult
  getBuildingGeometry: () => CacheResult

  // Regeneration (auto-clears dependents)
  regenerateColinearWall: (wallId: PerimeterWallId) => void
  regeneratePerimeter: (perimeterId: PerimeterId) => void
  regenerateStorey: (storeyId: StoreyId) => void
  regenerateBuilding: () => void

  // Clear actions
  clearAll: () => void
  clearColinearWalls: () => void
  clearPerimeters: () => void
  clearStoreys: () => void
  clearBuilding: () => void
}

interface CacheResult {
  model: ConstructionModel | null
  isOutdated: boolean
}
```

## Key Implementation Details

### 1. Getters with Outdated Detection

```typescript
getColinearWallGeometry(wallId: PerimeterWallId): CacheResult {
  const state = get()
  const cache = state.colinearWalls[wallId]

  if (!cache) {
    // No cache yet, generate immediately
    const model = constructWall(wallId, true)
    set(s => {
      s.colinearWalls[wallId] = {
        model,
        cachedAt: Date.now()
      }
    })
    return { model, isOutdated: false }
  }

  // Check if outdated using timestamp service
  const effectiveTimestamp = getBuildingTimestampDependencyService()
    .getEffectivePerimeterWallTimestamp(wallId)

  const isOutdated = !effectiveTimestamp || effectiveTimestamp > cache.cachedAt

  return { model: cache.model, isOutdated }
}

getPerimeterGeometry(perimeterId: PerimeterId): CacheResult {
  const state = get()
  const cache = state.perimeters[perimeterId]

  if (!cache) {
    const model = constructPerimeter(getModelActions().getPerimeterById(perimeterId))
    set(s => {
      s.perimeters[perimeterId] = {
        model,
        cachedAt: Date.now()
      }
    })
    return { model, isOutdated: false }
  }

  const effectiveTimestamp = getBuildingTimestampDependencyService()
    .getEffectivePerimeterTimestamp(perimeterId)

  const isOutdated = !effectiveTimestamp || effectiveTimestamp > cache.cachedAt

  return { model: cache.model, isOutdated }
}

getStoreyGeometry(storeyId: StoreyId): CacheResult {
  const state = get()
  const cache = state.storeys[storeyId]

  if (!cache) {
    const model = constructStorey(storeyId)
    set(s => {
      s.storeys[storeyId] = {
        model,
        cachedAt: Date.now()
      }
    })
    return { model, isOutdated: false }
  }

  const effectiveTimestamp = getBuildingTimestampDependencyService()
    .getEffectiveStoreyTimestamp(storeyId)

  const isOutdated = !effectiveTimestamp || effectiveTimestamp > cache.cachedAt

  return { model: cache.model, isOutdated }
}

getBuildingGeometry(): CacheResult {
  const state = get()
  const cache = state.building

  if (!cache) {
    const model = constructModel()
    set(s => {
      s.building = {
        model,
        cachedAt: Date.now()
      }
    })
    return { model, isOutdated: false }
  }

  // For building, check all storeys
  const storeys = getModelActions().getAllStoreys()
  const timestamps = storeys.map(s =>
    getBuildingTimestampDependencyService().getEffectiveStoreyTimestamp(s.id)
  )
  const effectiveTimestamp = Math.max(...timestamps.filter((ts): ts is number => ts !== null))

  const isOutdated = !effectiveTimestamp || effectiveTimestamp > cache.cachedAt

  return { model: cache.model, isOutdated }
}
```

### 2. Manual Regeneration Actions (Auto-Clear Dependents)

When a model is regenerated, automatically clear all dependent composite caches:

```typescript
regenerateColinearWall(wallId: PerimeterWallId): void {
  const model = constructWall(wallId, true)
  const wall = getModelActions().getPerimeterWallById(wallId)
  const storeyId = getModelActions().getPerimeterById(wall.perimeterId).storeyId

  set(s => {
    // Regenerate the wall
    s.colinearWalls[wallId] = {
      model,
      cachedAt: Date.now()
    }

    // Clear dependent composites
    delete s.perimeters[wall.perimeterId]
    delete s.storeys[storeyId]
    s.building = null
  })
}

regeneratePerimeter(perimeterId: PerimeterId): void {
  const perimeter = getModelActions().getPerimeterById(perimeterId)
  const model = constructPerimeter(perimeter)

  set(s => {
    // Regenerate the perimeter
    s.perimeters[perimeterId] = {
      model,
      cachedAt: Date.now()
    }

    // Clear dependent composites
    delete s.storeys[perimeter.storeyId]
    s.building = null
  })
}

regenerateStorey(storeyId: StoreyId): void {
  const model = constructStorey(storeyId)

  set(s => {
    // Regenerate the storey
    s.storeys[storeyId] = {
      model,
      cachedAt: Date.now()
    }

    // Clear dependent composites
    s.building = null
  })
}

regenerateBuilding(): void {
  const model = constructModel()

  set(s => {
    s.building = {
      model,
      cachedAt: Date.now()
    }
  })
}
```

### 3. No Assembly Auto-Regeneration

Assembly changes don't trigger auto-regeneration. Users see outdated indicators and choose when to regenerate:

```typescript
// No auto-regeneration functions for assemblies
// Users will see outdated indicators and click regenerate buttons
```

### 4. Clear Actions

```typescript
clearAll(): void {
  set(() => ({
    colinearWalls: {},
    perimeters: {},
    storeys: {},
    building: null
  }))
}

clearColinearWalls(): void {
  set(s => ({ colinearWalls: {} }))
}

clearPerimeters(): void {
  set(s => ({ perimeters: {} }))
}

clearStoreys(): void {
  set(s => ({ storeys: {} }))
}

clearBuilding(): void {
  set(s => ({ building: null }))
}
```

## File Structure

```
src/construction/geometryStore/
├── index.ts              # Main Zustand store with all actions
├── types.ts              # CacheEntry, CacheResult, etc.
└── selectors.ts          # Helper selectors for accessing cache
```

## Integration with Existing Code

### Replace Factory Pattern in Modals

**Before:**

```typescript
<ConstructionPlanModal
  constructionModelFactory={() => Promise.resolve(constructWall(wallId, true))}
/>

<ConstructionViewer3DModal
  constructionModelFactory={async () => {
    const { constructModel } = await import('@/construction/storeys/storey')
    return constructModel()
  }}
/>
```

**After:**

```typescript
<ConstructionPlanModal
  constructionModelFactory={() => Promise.resolve(getGeometryActions().getColinearWallGeometry(wallId).model)}
/>

<ConstructionViewer3DModal
  constructionModelFactory={() => Promise.resolve(getGeometryActions().getBuildingGeometry().model)}
/>
```

### Add Outdated Indicator to UI

```tsx
function ConstructionViewer3DModal({ storeyId }: { storeyId?: StoreyId }) {
  const { model, isOutdated } = useGeometryStore(state =>
    storeyId ? state.getStoreyGeometry(storeyId) : state.getBuildingGeometry()
  )

  return (
    <Modal>
      {isOutdated && (
        <Alert severity="warning" action={<Button onClick={() => regenerateModel(storeyId)}>Regenerate</Button>}>
          This model is outdated. Click regenerate to update.
        </Alert>
      )}
      <Viewer model={model} />
    </Modal>
  )
}
```

## Implementation Phases

### Phase 1: Create Geometry Store

- Create `src/construction/geometryStore/index.ts`
- Create `src/construction/geometryStore/types.ts`
- Implement basic state and getters for all 4 model types
- Implement outdated detection using timestamp services
- Implement manual regeneration actions with auto-clear dependents

### Phase 2: Add Clear Actions

- Implement `clearAll()`, `clearColinearWalls()`, etc.

### Phase 3: Update ConstructionPlanModal (Colinear Wall)

- Replace factory pattern with geometry store access
- Add outdated indicator
- Add regenerate button

### Phase 4: Update ConstructionViewer3DModal (Perimeter/Building)

- Replace factory pattern with geometry store access
- Add outdated indicator
- Add regenerate button

### Phase 5: Update TopDownPlanModal (Storey/Perimeter)

- Replace factory pattern with geometry store access
- Add outdated indicator
- Add regenerate button

### Phase 6: Update ConstructionPartsListModal (Building)

- Replace factory pattern with geometry store access
- Add outdated indicator
- Add regenerate button

### Phase 7: Update IFC Export

- Use geometry store instead of direct construction

### Phase 8: Add Tests

- Test caching behavior
- Test outdated detection
- Test regeneration with auto-clear dependents
- Test composite recomposition from cached children

## Benefits

1. **Caching for all 4 model types** - colinear wall, perimeter, storey, building
2. **Simple architecture** - no invalidation logic, timestamp services handle outdated detection
3. **Fast composite updates** - when wall changes, perimeter/storey just re-compose from caches (cheap!)
4. **User control** - users see outdated indicators and choose when to regenerate
5. **Shared low-level geometry** - manifold cache ensures actual shapes are shared across all models
6. **No auto-regeneration on assembly changes** - users control when to regenerate after config changes

## Trade-offs

1. **Manual regeneration** - users must click "Regenerate" when outdated (not automatic)
2. **No auto-regeneration for assembly changes** - users must regenerate after config changes
3. **Memory usage** - all 4 model types cached (but low-level geometry is shared via manifold cache)
4. **Stale cache risk** - users might work with outdated data until they regenerate (mitigated by indicators)

## How Composite Recomposition Works

When a wall is regenerated:

1. Wall model regenerated (constructs geometry using cached manifolds)
2. Perimeter cache cleared
3. Storey cache cleared
4. Building cache cleared

Next time perimeter is accessed:

- Perimeter model regenerated by fetching wall caches and merging (fast!)

Next time storey is accessed:

- Storey model regenerated by fetching perimeter caches and merging (fast!)

Next time building is accessed:

- Building model regenerated by fetching storey caches and stacking (fast!)

**Result**: Regenerating a wall is the expensive part. Updating composites is cheap (just merging cached results).
