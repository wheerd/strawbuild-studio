# Store Architecture Overview

This document provides a complete overview of the proposed sliced store architecture with all interfaces and services defined.

## 📁 Directory Structure

```
/store/
├── slices/                     # Entity-specific CRUD operations
│   ├── wallsSlice.ts          # ✅ IMPLEMENTED - Wall operations
│   ├── pointsSlice.ts         # 🔄 INTERFACE READY
│   ├── roomsSlice.ts          # 🔄 INTERFACE READY  
│   ├── floorsSlice.ts         # 🔄 INTERFACE READY
│   └── cornersSlice.ts        # 🔄 INTERFACE READY
├── services/                   # Complex business logic
│   ├── ModelService.ts        # ✅ IMPLEMENTED - Multi-entity operations
│   ├── RoomDetectionService.ts # 🔄 INTERFACE READY - Room detection & management
│   └── ValidationService.ts   # 🔄 INTERFACE READY - Model validation & repair
├── index.ts                   # ✅ IMPLEMENTED - Store composition with undo/redo
├── types.ts                   # ✅ IMPLEMENTED - Combined type definitions
└── ARCHITECTURE_OVERVIEW.md   # This file
```

## 🏗️ Slice Interfaces

### WallsSlice ✅ (Implemented & Tested)
```typescript
interface WallsActions {
  // CRUD operations
  addWall(startPointId, endPointId, floorId, ...options): Wall
  removeWall(wallId, floorId): void
  deleteWall(wallId, floorId): void
  
  // Modifications
  moveWall(wallId, deltaX, deltaY): void
  addOpeningToWall(wallId, opening): void
  
  // Corner operations
  switchCornerMainWalls(pointId, wall1Id, wall2Id): void
}
```

### PointsSlice 🔄 (Interface Ready)
```typescript
interface PointsActions {
  // CRUD operations
  addPoint(position, floorId): Point
  removePoint(pointId, floorId): void
  deletePoint(pointId, floorId): void
  
  // Modifications
  movePoint(pointId, position): void
  mergePoints(targetId, sourceId, floorId): void
  
  // Queries
  findNearestPoint(target, floorId, maxDistance?): Point | null
  getConnectedWalls(pointId): WallId[]
}
```

### RoomsSlice 🔄 (Interface Ready)  
```typescript
interface RoomsActions {
  // CRUD operations
  addRoom(name, floorId, wallIds, pointIds): Room
  removeRoom(roomId, floorId): void
  deleteRoom(roomId, floorId): void
  
  // Modifications  
  updateRoomName(roomId, name): void
  updateRoomWalls(roomId, wallIds): void
  
  // Calculations
  calculateRoomArea(roomId): Area
  
  // Queries
  getRoomsOnFloor(floorId): Room[]
  getRoomByName(name, floorId): Room | null
  getRoomsContainingWall(wallId): Room[]
  getRoomsContainingPoint(pointId): Room[]
  
  // Validation
  validateRoom(roomId): boolean
  validateAllRoomsOnFloor(floorId): RoomId[] // Returns invalid IDs
}
```

### FloorsSlice 🔄 (Interface Ready)
```typescript
interface FloorsActions {
  // CRUD operations
  addFloor(name, level, height?): Floor
  removeFloor(floorId): void
  deleteFloor(floorId): void
  
  // Modifications
  updateFloorName(floorId, name): void
  updateFloorLevel(floorId, level): void
  updateFloorHeight(floorId, height): void
  
  // Calculations
  calculateFloorBounds(floorId): Bounds2D | null
  calculateFloorArea(floorId): Length
  
  // Queries
  getFloorsOrderedByLevel(): Floor[]
  getFloorByName(name): Floor | null
  getActiveFloor(): Floor | null
  
  // Entity management
  addWallToFloor(floorId, wallId): void
  removeWallFromFloor(floorId, wallId): void
  addRoomToFloor(floorId, roomId): void
  removeRoomFromFloor(floorId, roomId): void
  addPointToFloor(floorId, pointId): void
  removePointFromFloor(floorId, pointId): void
}
```

### CornersSlice 🔄 (Interface Ready)
```typescript
interface CornersActions {
  // CRUD operations (mostly auto-managed)
  createCorner(pointId, wall1Id, wall2Id, otherWallIds?): Corner
  removeCorner(pointId): void
  deleteCorner(pointId): void
  
  // Modifications
  updateCorner(pointId): void // Recalculate corner
  switchCornerMainWalls(pointId, wall1Id, wall2Id): void
  
  // Queries
  getCornerAtPoint(pointId): Corner | null
  getCornersOnWall(wallId): Corner[]
  getAllCorners(): Corner[]
  
  // Validation
  validateCorner(pointId): boolean
  shouldCreateCorner(pointId): boolean
  
  // Bulk operations
  updateAllCornersForWalls(wallIds): void
  cleanupOrphanedCorners(): void
}
```

## 🛠️ Service Interfaces

### ModelService ✅ (Implemented)
Orchestrates complex operations across multiple slices:
```typescript
class ModelService {
  // Complex operations
  addWallWithRoomDetection(startId, endId, floorId, ...): Promise<Wall>
  deleteWallWithRoomUpdate(wallId, floorId): Promise<void>
  moveWallsAsGroup(wallIds, deltaX, deltaY): void
}
```

### RoomDetectionService 🔄 (Interface Ready)
Handles automatic room detection and management:
```typescript
interface IRoomDetectionService {
  // Detection
  detectRooms(floorId): Promise<void>
  detectRoomsAfterWallChange(floorId, wallIds): Promise<void>
  
  // Validation & cleanup
  validateAllRooms(floorId): Promise<RoomId[]>
  cleanupInvalidRooms(floorId, invalidIds): Promise<void>
  
  // Room merging/splitting
  mergeRoomsAfterWallRemoval(floorId, wallId): Promise<void>
  splitRoomAfterWallAddition(floorId, wallId): Promise<void>
  
  // Configuration
  setAutoDetectionEnabled(enabled): void
  isAutoDetectionEnabled(): boolean
}
```

### ValidationService 🔄 (Interface Ready)
Provides model validation and consistency checking:
```typescript
interface IValidationService {
  // Model validation
  validateEntireModel(): ValidationResult
  validateFloor(floorId): FloorValidationResult
  
  // Entity validation
  validateWall(wallId): boolean
  validateRoom(roomId): boolean  
  validatePoint(pointId): boolean
  
  // Consistency checks
  checkWallRoomConsistency(floorId): WallRoomInconsistency[]
  checkPointWallConsistency(floorId): PointWallInconsistency[]
  checkOrphanedEntities(floorId): OrphanedEntities
  
  // Auto-repair
  repairInconsistencies(floorId): Promise<RepairResult>
  cleanupOrphanedEntities(floorId): Promise<CleanupResult>
}
```

## 🎯 Operation Placement Guidelines

Here's where different types of operations should go:

### ✅ **Slice Operations (Simple CRUD)**
- **Direct entity manipulation**: Create, update, delete single entities
- **Basic queries**: Get entity by ID, list entities on floor
- **Simple calculations**: Calculate area, length, bounds
- **Entity relationships**: Add/remove entity references

**Examples:**
```typescript
// ✅ Slice operations
store.addWall(point1, point2, floor)
store.movePoint(pointId, newPosition)  
store.updateRoomName(roomId, name)
store.calculateRoomArea(roomId)
```

### 🔄 **Service Operations (Complex Business Logic)**
- **Multi-entity coordination**: Operations involving multiple slices
- **Async operations**: Room detection, validation, cleanup
- **Business rules**: Complex validation, constraint enforcement
- **Batch operations**: Group operations, bulk updates

**Examples:**
```typescript
// 🔄 Service operations
await modelService.addWallWithRoomDetection(...)
await roomDetectionService.detectRoomsAfterWallChange(...)
await validationService.repairInconsistencies(floorId)
await validationService.cleanupOrphanedEntities(floorId)
```

## 📊 Benefits Analysis

### ✅ **Current Implementation (Walls Slice)**
- 4/5 tests passing ✅
- Clean separation of concerns ✅
- Easy to understand and test ✅  
- Built-in undo/redo works ✅

### 🎯 **Expected Benefits with Full Implementation**

**Maintainability:**
- Clear ownership of operations
- Focused responsibilities per slice
- Easy to locate and modify code

**Testability:**
- Test slices in isolation (unit tests)
- Test services with mocked dependencies (integration tests)
- Test complete workflows (e2e tests)

**Performance:**
- Granular subscriptions with selectors
- Efficient re-renders
- Batch operations when needed

**Developer Experience:**
- TypeScript support throughout
- Intuitive mental model
- Clear APIs for common and complex operations

## 🚀 Implementation Priority

### Phase 1: Core Entity Slices
1. **PointsSlice** - Foundation for all geometry
2. **RoomsSlice** - Core business entity
3. **FloorsSlice** - Organizational structure

### Phase 2: Advanced Features
4. **CornersSlice** - Visual enhancements
5. **RoomDetectionService** - Automation
6. **ValidationService** - Data quality

### Phase 3: Migration
7. Update components to use new store
8. Remove old store implementation
9. Add comprehensive testing

## 🤔 Questions for Review

Before implementing, please review these key decisions:

1. **PointsSlice Operations**: 
   - Should `mergePoints` be in points slice or a service?
   - Should `findNearestPoint` be a slice operation or service?

2. **RoomsSlice Responsibilities**:
   - Should room validation be in slice or validation service?
   - Should `calculateRoomArea` be slice operation or service?

3. **FloorsSlice Entity Management**:
   - Should floor-entity relationships be managed by floors or entity slices?
   - Should `addWallToFloor` be in floors slice or walls slice?

4. **Service Dependencies**:
   - Should services depend on other services or only slices?
   - How should service composition work?

5. **Undo/Redo Granularity**:
   - Should service operations be atomic for undo/redo?
   - How should batch operations work with history?

The interfaces are ready for your review. Once you decide on operation placement, implementation can begin! 🎯