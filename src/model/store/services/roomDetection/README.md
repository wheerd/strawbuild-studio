# Room Detection

The room detection system automatically identifies enclosed spaces formed by walls in floor plans. It uses geometric algorithms to find wall loops and convert them into room entities with proper spatial relationships.

## Architecture

The room detection system is built with three main components:

### RoomDetectionEngine
Core geometric algorithms for room detection (`RoomDetectionEngine.ts:16`):
- **Wall Loop Detection**: Finds closed loops of connected walls using minimal face detection algorithms
- **Loop Tracing**: Traces wall sequences in clockwise/counter-clockwise directions for room boundary validation
- **Geometric Validation**: Ensures detected rooms form valid closed polygons with proper connectivity
- **Room Side Determination**: Calculates which side of a wall (left/right) a room occupies using cross-product geometry

### RoomDetectionService  
Service interface for room operations (`RoomDetectionService.ts:43`):
- **Full Room Detection**: Analyzes entire floors to find all possible rooms
- **Incremental Updates**: Handles room changes when walls are added/removed without full recalculation  
- **Room Validation**: Checks consistency of existing rooms and identifies orphaned elements
- **Wall/Point Assignment**: Manages spatial relationships between rooms and geometric elements

### Type System
Comprehensive type definitions (`types.ts`):
- **RoomDefinition**: Specification for rooms before entity creation
- **RoomDetectionResult**: Complete changeset for model updates
- **Validation Results**: Reports on room consistency and orphaned elements
- **Configuration**: Customizable settings for room naming and detection behavior

## Key Algorithms

### Minimal Face Detection
The system finds the smallest possible closed loops of walls using geometric face-finding algorithms:

1. **Adjacency Mapping**: Builds connectivity graph of walls at intersection points
2. **Rightmost Path Selection**: Always takes the most clockwise turn at each junction to find minimal faces
3. **Duplicate Prevention**: Filters out redundant faces representing the same enclosed space
4. **Interior Face Filtering**: Identifies actual room interiors vs. exterior boundaries

### Room Hole Detection
Supports complex room geometries including O-shaped rooms and courtyards:
- **Nested Loop Detection**: Identifies when smaller wall loops are completely inside larger ones
- **Hole Validation**: Ensures inner boundaries are geometrically contained within outer boundaries
- **Multi-Boundary Rooms**: Creates room definitions with outer boundary + multiple holes
- **Area Calculations**: Computes net room area (outer area - hole areas)

### Interior Wall Detection
Handles walls that are completely inside rooms (not part of boundaries):
- **Geometric Containment**: Checks if wall endpoints and midpoint are inside room polygon
- **Hole Awareness**: Ensures interior walls are not inside room holes
- **Dual Assignment**: Interior walls reference the same room on both left and right sides
- **Peninsula Support**: Handles partial dividers, islands, and free-standing walls within rooms

### Loop Validation
Ensures detected loops form valid rooms:
- Each point connects to exactly 2 walls (closed loop requirement)
- All walls form a single connected sequence
- Polygon area calculation for room sizing
- Self-intersection detection to prevent invalid geometries

### Spatial Relationship Management
Determines how rooms relate to walls and points:
- **Wall Sidedness**: Uses cross-product calculations to determine left/right room assignments
- **Point Membership**: Tracks which rooms contain each geometric point
- **Boundary Sharing**: Handles walls shared between adjacent rooms
- **Hole Boundaries**: Manages relationships between outer boundaries and inner holes
- **Interior Wall Assignment**: Assigns same room to both sides of interior walls

## Usage

### Basic Room Detection
```typescript
import { RoomDetectionService } from '@/model/roomDetection'

const service = new RoomDetectionService()
const result = service.detectRooms(modelState, floorId)

// Apply results to model
for (const roomDef of result.roomsToCreate) {
  // roomDef includes:
  // - outerBoundary: { wallIds, pointIds } for the main room boundary
  // - holes: [{ wallIds, pointIds }] for any inner boundaries (courtyards, etc.)
  // - wallIds: all walls (outer + holes combined)
  
  console.log(`Room: ${roomDef.name}`)
  console.log(`Outer boundary: ${roomDef.outerBoundary.pointIds.length} points`)
  console.log(`Holes: ${roomDef.holes.length}`)
}
```

### Rooms with Holes (O-shaped rooms)
```typescript
// The system automatically detects when smaller loops are inside larger ones
const outerWalls = [wall1Id, wall2Id, wall3Id, wall4Id] // Rectangle
const innerWalls = [wall5Id, wall6Id, wall7Id, wall8Id] // Smaller rectangle inside

// Service automatically creates room with hole
const result = service.detectRooms(modelState, floorId)
const roomWithHole = result.roomsToCreate.find(room => room.holes.length > 0)

console.log(`Room has ${roomWithHole.holes.length} holes`)
console.log(`Outer area minus hole areas = net room area`)
```

### Interior Walls (Peninsulas, Islands)
```typescript
// Interior walls are automatically detected and assigned
const result = service.detectRooms(modelState, floorId)
const roomWithInteriorWalls = result.roomsToCreate[0]

console.log(`Boundary walls: ${roomWithInteriorWalls.outerBoundary.wallIds.length}`)
console.log(`Interior walls: ${roomWithInteriorWalls.interiorWallIds.length}`)
console.log(`Total walls: ${roomWithInteriorWalls.wallIds.length}`) // boundary + interior

// Interior walls get both leftRoomId and rightRoomId set to the same room
const interiorWallAssignment = result.wallAssignments.find(
  assignment => roomWithInteriorWalls.interiorWallIds.includes(assignment.wallId)
)
console.log(interiorWallAssignment.leftRoomId === interiorWallAssignment.rightRoomId) // true
```

### Handling Wall Changes
```typescript
// When adding a wall
const result = service.handleWallAddition(modelState, newWallId, floorId)

// When removing a wall  
const result = service.handleWallRemoval(modelState, wallId, floorId)

// Both return changesets for model updates
```

### Room Validation
```typescript
const validation = service.validateRoomConsistency(modelState, floorId)

console.log('Invalid rooms:', validation.invalidRooms)
console.log('Orphaned walls:', validation.orphanedWalls)
```

## Configuration

Customize room detection behavior:

```typescript
const config = {
  roomNamePattern: 'Space {index}' // Custom naming pattern
}

const service = new RoomDetectionService(config)
```

## Testing

The system includes comprehensive tests:
- **Unit Tests**: Core algorithm validation in `RoomDetectionEngine.test.ts`
- **Service Tests**: API behavior validation in `RoomDetectionService.test.ts` 
- **Integration Tests**: End-to-end workflows in `integration.test.ts`

Run tests with: `pnpm test roomDetection`