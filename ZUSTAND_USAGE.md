# Zustand Model Store Usage

The model now uses Zustand for state management with offset-based opening positioning.

## Basic Usage

```tsx
import { 
  useModelStore, 
  useModelActions, 
  useBuilding,
  createOpening,
  getOpeningPosition
} from './src/model';

// Use selective state (optimized - only re-renders when building changes)
function BuildingInfo() {
  const building = useBuilding();
  const actions = useModelActions();
  
  return (
    <div>
      <h1>{building.name}</h1>
      <p>Floors: {building.floors.length}</p>
      <p>Walls: {building.walls.size}</p>
      <button onClick={() => actions.createBuilding('New Project')}>
        Create New Building
      </button>
    </div>
  );
}

// Working with openings (offset-based positioning)
function OpeningEditor({ wallId, building }: { wallId: WallId, building: Building }) {
  const { addOpening } = useModelActions();
  
  const handleAddOpening = () => {
    // Create opening 1000mm from wall start
    const opening = createOpening(
      wallId,
      'door',
      1000,  // offsetFromStart in mm
      800,   // width in mm
      2100   // height in mm
    );
    
    try {
      addOpening(opening);
    } catch (error) {
      alert('Could not add opening: ' + error.message);
    }
  };
  
  // Get absolute position of an opening
  const opening = building.openings.get(openingId);
  if (opening) {
    const absolutePosition = getOpeningPosition(opening, building);
    console.log('Opening is at:', absolutePosition);
  }
  
  return (
    <button onClick={handleAddOpening}>
      Add Door
    </button>
  );
}
```

## Available Hooks

### State Selectors (Optimized)
- `useBuilding()` - Current building
- `useActiveFloor()` - Currently active floor
- `useActiveFloorId()` - Active floor ID
- `useSelectedEntities()` - Selected entity IDs
- `useViewMode()` - Current view mode
- `useGridSettings()` - Grid size and snap settings

### Actions
```tsx
const actions = useModelActions();

// Building operations
actions.createBuilding('My Building');

// Add entities
actions.addWall(wall);
actions.addRoom(room);
actions.addPoint(point);
actions.addOpening(opening);  // Will validate position
actions.addFloor(floor);

// Remove entities
actions.removeWall(wallId);

// View operations
actions.setActiveFloor(floorId);
actions.setSelectedEntities([id1, id2]);
actions.toggleEntitySelection(entityId);
actions.clearSelection();
actions.setViewMode('3d');
actions.setGridSize(25);
actions.setSnapToGrid(true);
```

## Opening Positioning

Openings now use **offset-based positioning** from the wall's start point:

```tsx
import { createOpening, getOpeningPosition, isOpeningValidOnWall } from './src/model';

// Create opening 500mm from wall start
const door = createOpening(
  wallId,
  'door',
  500,    // offsetFromStart: 500mm from wall start point
  900,    // width: 900mm wide
  2100    // height: 2100mm tall
);

// Validate opening placement
if (isOpeningValidOnWall(door, building)) {
  addOpening(door);
} else {
  console.log('Opening would overlap or exceed wall bounds');
}

// Get absolute world coordinates
const absolutePos = getOpeningPosition(door, building);
```

## Key Features

1. **Offset Positioning**: Openings positioned by mm offset from wall start point
2. **Validation**: Automatic overlap and bounds checking
3. **Performance**: Only re-render components using changed data
4. **Type Safety**: Full TypeScript support
5. **DevTools**: Redux DevTools integration
6. **Error Handling**: Clear error messages for invalid operations

## Model Guarantees

- Every model state **always** has a building
- Every building **always** has at least one floor
- The ground floor is initially the active floor
- Opening positions are validated before adding
- No material property on walls
- Rooms have no type or color properties
