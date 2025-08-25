# Store Architecture

This directory contains the new sliced store architecture that provides better separation of concerns, testability, and built-in undo/redo functionality.

## Structure

```
/store/
├── slices/           # Domain-specific CRUD operations
│   └── wallsSlice.ts # Wall entity operations
├── services/         # Complex business logic that spans multiple slices  
│   └── ModelService.ts # Orchestrates multi-entity operations
├── index.ts          # Main store composition with undo/redo
├── types.ts          # Store-specific types
└── README.md         # This file
```

## Design Principles

### 1. **Slices for CRUD Operations**
- Each slice handles one entity type (walls, rooms, points, etc.)
- Simple, focused operations that update state
- Easy to test in isolation
- Clear responsibilities

### 2. **Services for Business Logic**
- Complex operations that involve multiple entities
- Orchestrate multiple slice operations
- Handle async operations and side effects
- Testable with mocked dependencies

### 3. **Automatic Undo/Redo**
- Built-in with Zustand + Zundo middleware
- Configurable granularity
- Only saves significant state changes
- Zero additional complexity for simple operations

## Example Usage

### Simple Operations (Use Slices Directly)
```typescript
import { useModelStore } from './store'

function WallEditor() {
  const addWall = useModelStore(state => state.addWall)
  const removeWall = useModelStore(state => state.removeWall)
  
  // Direct slice operations
  const wall = addWall(point1Id, point2Id, floorId)
  removeWall(wall.id, floorId)
}
```

### Complex Operations (Use Services)
```typescript
import { modelService } from './store'

function ComplexWallEditor() {
  // Service orchestrates multiple operations
  const wall = await modelService.addWallWithRoomDetection(
    point1Id, point2Id, floorId
  )
}
```

### Undo/Redo
```typescript
import { useUndo, useRedo, useCanUndo, useCanRedo } from './store'

function UndoRedoButtons() {
  const undo = useUndo()
  const redo = useRedo()
  const canUndo = useCanUndo()
  const canRedo = useCanRedo()
  
  return (
    <>
      <button disabled={!canUndo} onClick={undo}>Undo</button>
      <button disabled={!canRedo} onClick={redo}>Redo</button>
    </>
  )
}
```

## Testing Strategy

### Slice Testing (Unit Tests)
```typescript
// Test individual slice operations
describe('WallsSlice', () => {
  it('should add wall correctly', () => {
    const wall = store.addWall(point1, point2, floor)
    expect(store.walls.has(wall.id)).toBe(true)
  })
})
```

### Service Testing (Integration Tests)
```typescript
// Test business logic with mocked slices
describe('ModelService', () => {
  it('should add wall and detect rooms', async () => {
    await service.addWallWithRoomDetection(...)
    // Verify multiple slices updated correctly
  })
})
```

### Store Testing (E2E Tests)
```typescript
// Test complete workflows
describe('ModelStore Integration', () => {
  it('should handle complex building scenario', () => {
    // Test realistic user workflows
  })
})
```

## Benefits

### ✅ **Maintainability**
- Clear separation of concerns
- Focused responsibilities
- Easy to understand and modify

### ✅ **Testability**
- Test slices, services, and store independently
- Mock dependencies easily
- Fast, focused tests

### ✅ **Undo/Redo**
- Built-in with zero additional complexity
- Configurable granularity
- Automatic state management

### ✅ **Performance**
- Granular subscriptions with selectors
- Efficient re-renders
- Batch operations when needed

### ✅ **Developer Experience**  
- TypeScript support throughout
- Clear APIs for common and complex operations
- Intuitive mental model

## Migration Path

1. ✅ **Phase 1**: Extract walls slice (completed)
2. **Phase 2**: Extract points slice
3. **Phase 3**: Extract rooms slice  
4. **Phase 4**: Extract remaining entities (floors, corners, etc.)
5. **Phase 5**: Move remaining operations to services
6. **Phase 6**: Update components to use new store

## Current Status

- ✅ Walls slice implemented and tested
- ✅ Service layer structure created
- ✅ Undo/redo middleware integrated
- ✅ Testing strategy demonstrated
- ⏳ Other slices pending extraction

The walls slice demonstrates that this architecture works well and provides the benefits we were looking for. The remaining slices can be extracted following the same pattern.