# Store Slice Interfaces - Ready for Review

## 🎯 Status Overview

| Component | Status | Files | Notes |
|-----------|--------|--------|-------|
| **WallsSlice** | ✅ **IMPLEMENTED** | `wallsSlice.ts`, `wallsSlice.test.ts` | 4/5 tests passing |
| **PointsSlice** | 🔄 **INTERFACE READY** | `pointsSlice.ts` | Ready for implementation |
| **RoomsSlice** | 🔄 **INTERFACE READY** | `roomsSlice.ts` | Ready for implementation |
| **FloorsSlice** | 🔄 **INTERFACE READY** | `floorsSlice.ts` | Ready for implementation |
| **CornersSlice** | 🔄 **INTERFACE READY** | `cornersSlice.ts` | Ready for implementation |
| **ModelService** | ✅ **IMPLEMENTED** | `services/ModelService.ts` | Orchestration layer |
| **RoomDetectionService** | 🔄 **INTERFACE READY** | `services/RoomDetectionService.ts` | Room automation |
| **ValidationService** | 🔄 **INTERFACE READY** | `services/ValidationService.ts` | Data quality |
| **Store Composition** | ✅ **IMPLEMENTED** | `index.ts`, `types.ts` | With undo/redo |

## 🤔 Key Design Questions for Your Review

### 1. **Operation Placement - Where Should These Go?**

#### **Points Operations**
```typescript
// Current placement → Your preference?
mergePoints(target, source, floor)        // 🔄 PointsSlice → ❓ Service?  
findNearestPoint(target, floor, maxDist)  // 🔄 PointsSlice → ❓ Service?
movePoint(pointId, position)              // 🔄 PointsSlice ✅
getConnectedWalls(pointId)                // 🔄 PointsSlice ✅
```

#### **Room Operations**  
```typescript
// Current placement → Your preference?
calculateRoomArea(roomId)                 // 🔄 RoomsSlice → ❓ Service?
validateRoom(roomId)                      // 🔄 RoomsSlice → ❓ ValidationService?  
getRoomsContainingWall(wallId)           // 🔄 RoomsSlice ✅
updateRoomWalls(roomId, wallIds)         // 🔄 RoomsSlice → ❓ Service?
```

#### **Floor Operations**
```typescript
// Current placement → Your preference?  
addWallToFloor(floorId, wallId)          // 🔄 FloorsSlice → ❓ WallsSlice?
calculateFloorBounds(floorId)            // 🔄 FloorsSlice → ❓ Service?
getFloorsOrderedByLevel()                // 🔄 FloorsSlice ✅
```

#### **Corner Operations**
```typescript
// Current placement → Your preference?
updateCorner(pointId)                     // 🔄 CornersSlice ✅  
updateAllCornersForWalls(wallIds)        // 🔄 CornersSlice → ❓ Service?
cleanupOrphanedCorners()                 // 🔄 CornersSlice → ❓ ValidationService?
```

### 2. **Service Composition**
```typescript
// Should services depend on each other?
class RoomDetectionService {
  constructor(
    getState: () => ModelState,
    actions: StoreActions,
    validationService?: ValidationService  // ❓ Service dependency?
  ) {}
}
```

### 3. **Undo/Redo Behavior**
```typescript
// Should complex operations be atomic for undo/redo?
await modelService.addWallWithRoomDetection(...)
// ^ Should this be ONE undo operation or multiple?

// Should services coordinate undo/redo?
await roomDetectionService.detectRooms(floorId)
// ^ Should this save its own undo snapshot?
```

### 4. **Query Operations**
```typescript
// Should these be slice operations or separate query service?
getRoomsOnFloor(floorId)                  // 🔄 RoomsSlice ✅
getPointsOnFloor(floorId)                 // 🔄 PointsSlice ✅  
getCornersOnWall(wallId)                  // 🔄 CornersSlice ✅

// Or should there be a QueryService?
class QueryService {
  getRoomsOnFloor(floorId): Room[]
  getPointsOnFloor(floorId): Point[]
  // ...
}
```

## 💡 Recommended Operation Placement

Based on the Walls slice implementation, here are my suggestions:

### ✅ **Keep in Slices** (Simple, focused operations)
```typescript
// Direct entity manipulation
addPoint(), removePoint(), movePoint()
addRoom(), updateRoomName(), deleteRoom()  
addFloor(), updateFloorLevel()
createCorner(), switchCornerMainWalls()

// Simple queries
getRoom(id), getPoint(id), getFloor(id)
getRoomsOnFloor(), getPointsOnFloor()

// Basic calculations  
calculateRoomArea(), calculateFloorBounds()
```

### 🔄 **Move to Services** (Complex, cross-cutting operations)  
```typescript
// Multi-entity operations
mergePoints() → PointManagementService
updateRoomWalls() → RoomManagementService  
updateAllCornersForWalls() → CornerManagementService

// Validation operations
validateRoom() → ValidationService
cleanupOrphanedCorners() → ValidationService

// Complex queries
findNearestPoint() → SpatialQueryService
```

### 🎯 **Service Structure**
```typescript
// Core services
ModelService              // Multi-entity orchestration
RoomDetectionService     // Automatic room management  
ValidationService        // Data quality & consistency
SpatialQueryService      // Complex spatial queries

// Optional specialized services  
PointManagementService   // Complex point operations
RoomManagementService    // Complex room operations
CornerManagementService  // Complex corner operations
```

## 🚀 Next Steps

1. **Review operation placement** - Confirm where each operation should live
2. **Decide on service dependencies** - How services should interact  
3. **Clarify undo/redo behavior** - Granularity for complex operations
4. **Choose implementation order** - Which slices to implement first

The interfaces are comprehensive and ready for implementation once you confirm the operation placement! 🎯

## 📋 Interface Summary

All interfaces compile successfully and provide:

- **Complete type safety** for all operations
- **Clear separation of concerns** between slices and services  
- **Comprehensive operation coverage** for all current functionality
- **Built-in undo/redo support** with configurable granularity
- **Testable architecture** with dependency injection
- **Gradual migration path** from existing store

The architecture is ready - just need your preferences on operation placement! 🚀