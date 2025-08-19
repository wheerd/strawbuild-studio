# 2D Architecture Plan Editor - Implementation Plan

## Overview

Building a 2D architecture plan editor using React-Konva for complex canvas interactions, building on the existing Zustand store and TypeScript model.

## Architecture

### Technology Stack
- **Canvas**: React-Konva for declarative canvas rendering
- **State**: Existing Zustand store + editor-specific state
- **Model**: Existing Building/Wall/Room/ConnectionPoint types
- **Styling**: CSS modules or styled-components
- **Testing**: Vitest + React Testing Library

### Component Structure
```
src/components/FloorPlanEditor/
├── FloorPlanEditor.tsx          # Main container
├── Canvas/
│   ├── FloorPlanStage.tsx       # Konva Stage wrapper
│   ├── GridLayer.tsx            # Background grid layer
│   ├── RoomLayer.tsx            # Room shapes layer
│   ├── WallLayer.tsx            # Wall shapes layer
│   ├── ConnectionPointLayer.tsx # Connection points layer
│   └── SelectionLayer.tsx       # Selection indicators
├── Shapes/
│   ├── WallShape.tsx            # Individual wall component
│   ├── RoomShape.tsx            # Room polygon component
│   └── ConnectionPointShape.tsx # Connection point circle
├── Tools/
│   ├── Toolbar.tsx              # Main toolbar
│   ├── WallTool.tsx             # Wall drawing tool
│   ├── SelectTool.tsx           # Selection tool
│   └── FloorSelector.tsx        # Floor switching UI
└── hooks/
    ├── useEditorStore.ts        # Editor-specific state
    ├── useKonvaTransform.ts     # Stage transform management
    ├── useWallSnapping.ts       # Snap-to-point logic
    ├── useRoomDetection.ts      # Automatic room detection
    └── useShapeSelection.ts     # Selection management
```

### Konva Layer Architecture
```typescript
<Stage>
  <Layer name="grid">           {/* Background grid */}
    <GridPattern />
  </Layer>
  
  <Layer name="rooms">          {/* Room fills */}
    {rooms.map(room => <RoomShape key={room.id} room={room} />)}
  </Layer>
  
  <Layer name="walls">          {/* Wall lines */}
    {walls.map(wall => <WallShape key={wall.id} wall={wall} />)}
  </Layer>
  
  <Layer name="points">         {/* Connection points */}
    {points.map(point => <ConnectionPointShape key={point.id} point={point} />)}
  </Layer>
  
  <Layer name="selection">      {/* Selection indicators */}
    <SelectionBox />
    <SnapPreview />
  </Layer>
</Stage>
```

## Core Features

### 1. Canvas Rendering System
- **Konva Stage**: Main canvas with zoom/pan capabilities
- **Layer Management**: Separate layers for grid, rooms, walls, points, selection
- **Coordinate System**: Real-world millimeters with pixel scaling
- **Viewport Transform**: Pan (offset) + Zoom (scale) transformations

### 2. Wall System
- **Creation**: Click-drag to create walls between connection points
- **Movement**: Drag wall endpoints to move/resize
- **Rendering**: Konva Line shapes with configurable thickness
- **Snapping**: Auto-snap to nearby connection points (configurable threshold)
- **Validation**: Prevent invalid wall configurations

### 3. Room Detection
- **Algorithm**: Find closed polygon cycles in wall graph
- **Real-time**: Automatically detect rooms as walls are added/modified
- **Visualization**: Fill detected rooms with semi-transparent colors using Konva Polygon
- **Performance**: Efficient cycle detection algorithm

### 4. Interaction System
- **Tools**: Select, Wall Drawing, Pan/Zoom
- **Mouse Events**: Click, drag, hover handling via Konva events
- **Selection**: Individual and multi-select with visual feedback
- **Drag & Drop**: Move walls and connection points
- **Hit Testing**: Automatic collision detection for selections

### 5. Zoom & Pan
- **Mouse Wheel**: Zoom in/out at cursor position using Konva Stage
- **Middle Mouse/Space**: Pan viewport
- **Touch**: Pinch-to-zoom and drag gestures
- **Fit to View**: Auto-fit building bounds to viewport

### 6. Floor Management
- **Active Floor**: Only show/edit current floor's entities
- **Floor Selector**: Dropdown/tabs to switch between floors
- **Floor Operations**: Add, rename, delete floors
- **Visual Indication**: Clear indication of active floor

## State Management

### Editor State Extension
```typescript
interface EditorState {
  // View transform
  viewport: {
    zoom: number
    panX: number 
    panY: number
  }
  
  // Interaction state
  activeTool: 'select' | 'wall' | 'room'
  isDrawing: boolean
  dragState: {
    isDragging: boolean
    dragType: 'pan' | 'wall' | 'point'
    startPos: Point2D
    dragEntityId?: string
  }
  
  // Snapping
  snapDistance: number
  showSnapPreview: boolean
  snapPreviewPoint?: Point2D
  
  // UI state
  showGrid: boolean
  gridSize: number
  showRoomLabels: boolean
}
```

## Implementation Phases

### Phase 1: Core Canvas & Dependencies
1. ✅ Add react-konva dependency
2. ✅ Create basic Stage and Layer structure
3. ✅ Implement grid rendering
4. ✅ Basic wall visualization with Konva Lines
5. ✅ Connection point rendering with Konva Circles

### Phase 2: Interaction System  
6. ✅ Mouse event handling via Konva
7. ✅ Hit testing for selection
8. ✅ Basic wall creation tool
9. ✅ Wall movement/resizing with drag events
10. ✅ Selection visual feedback

### Phase 3: Advanced Features
11. ✅ Wall-to-wall snapping system
12. ✅ Automatic room detection algorithm
13. ✅ Room rendering with fills
14. ✅ Zoom and pan implementation
15. ✅ Floor management UI

### Phase 4: Polish & UX
16. ⏳ Keyboard shortcuts
17. ⏳ Undo/redo system  
18. ⏳ Performance optimizations
19. ⏳ Touch support
20. ⏳ Properties panel

## Key Konva Features Used

1. **Stage**: Main canvas container with built-in zoom/pan
2. **Layer**: Render layers for different entity types  
3. **Line**: Wall rendering with thickness and styling
4. **Circle**: Connection points with hover states
5. **Polygon**: Room shapes with fills and strokes
6. **Group**: Grouping related shapes for complex entities
7. **Events**: Click, drag, hover events on individual shapes
8. **Transforms**: Built-in coordinate transformations

## File Naming Conventions

- Components: PascalCase (e.g., `FloorPlanEditor.tsx`)
- Hooks: camelCase with 'use' prefix (e.g., `useWallSnapping.ts`)
- Types: PascalCase interfaces (e.g., `EditorState`)
- Utilities: camelCase (e.g., `canvasUtils.ts`)

## Testing Strategy

- **Unit Tests**: Individual shape components and hooks
- **Integration Tests**: Editor interactions and state updates
- **Visual Tests**: Canvas rendering output validation
- **Performance Tests**: Large building rendering benchmarks

## Performance Considerations

- **Layer Optimization**: Separate layers prevent unnecessary re-renders
- **Shape Memoization**: Memo components to prevent redundant renders  
- **Event Delegation**: Efficient event handling through Konva
- **Viewport Culling**: Only render visible shapes
- **Debounced Updates**: Throttle expensive operations like room detection

## Future Extensibility

The React-Konva architecture provides excellent foundation for:
- Advanced measurement tools
- Dimension annotations
- Complex selection tools
- Animation and transitions
- Multi-user collaboration
- Export to various formats
- 3D visualization integration