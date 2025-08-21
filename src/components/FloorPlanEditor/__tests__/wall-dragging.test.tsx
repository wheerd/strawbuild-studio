import { render, screen } from '@testing-library/react'
import { describe, test, expect, beforeEach } from 'vitest'
import { FloorPlanEditor } from '@/components/FloorPlanEditor/FloorPlanEditor'
import { useModelStore } from '@/model/store'
import { useEditorStore } from '@/components/FloorPlanEditor/hooks/useEditorStore'
import { createLength, createAbsoluteOffset } from '@/types/geometry'
import type { Point2D } from '@/types/geometry'

describe('Wall Dragging Features', () => {
  let wallId: string

  beforeEach(() => {
    // Reset stores
    useModelStore.getState().reset()
    useEditorStore.getState().reset()

    // Create test model with a wall using store methods
    const modelStore = useModelStore.getState()
    
    // Get the default ground floor created by reset
    const floors = Array.from(modelStore.floors.values())
    const groundFloor = floors[0]

    // Create points for a horizontal wall
    const startPoint = modelStore.addPoint({ 
      x: createAbsoluteOffset(100), 
      y: createAbsoluteOffset(100) 
    } as Point2D, groundFloor.id)
    
    const endPoint = modelStore.addPoint({ 
      x: createAbsoluteOffset(300), 
      y: createAbsoluteOffset(100) 
    } as Point2D, groundFloor.id)

    // Create wall
    const wall = modelStore.addWall(
      startPoint.id,
      endPoint.id,
      groundFloor.id,
      createLength(2700), // height at start
      createLength(2700), // height at end
      createLength(200)   // thickness
    )
    
    wallId = wall.id

    // Set active floor
    useEditorStore.getState().setActiveFloor(groundFloor.id)
  })

  describe('Constrained Parallel Movement', () => {
    test('should move wall only perpendicular to its direction', () => {
      const modelStore = useModelStore.getState()
      const wall = Array.from(modelStore.walls.values())[0]
      
      // Get initial positions
      const initialStartPoint = modelStore.points.get(wall.startPointId)!
      const initialEndPoint = modelStore.points.get(wall.endPointId)!
      
      // Move wall with diagonal delta (should only move perpendicular to wall)
      modelStore.moveWall(wall.id, 50, 50) // Diagonal movement
      
      const updatedModelStore = useModelStore.getState()
      const updatedStartPoint = updatedModelStore.points.get(wall.startPointId)!
      const updatedEndPoint = updatedModelStore.points.get(wall.endPointId)!
      
      // Wall is horizontal, so only Y movement should be applied
      expect(updatedStartPoint.position.x).toBe(initialStartPoint.position.x)
      expect(updatedEndPoint.position.x).toBe(initialEndPoint.position.x)
      
      // Y position should change (perpendicular to horizontal wall)
      expect(updatedStartPoint.position.y).not.toBe(initialStartPoint.position.y)
      expect(updatedEndPoint.position.y).not.toBe(initialEndPoint.position.y)
      
      // Both points should move the same amount
      const deltaY = updatedStartPoint.position.y - initialStartPoint.position.y
      expect(updatedEndPoint.position.y - initialEndPoint.position.y).toBe(deltaY)
    })

    test('should preserve wall length during movement', () => {
      const modelStore = useModelStore.getState()
      const wall = Array.from(modelStore.walls.values())[0]
      
      const initialStartPoint = modelStore.points.get(wall.startPointId)!
      const initialEndPoint = modelStore.points.get(wall.endPointId)!
      
      const initialLength = Math.sqrt(
        Math.pow(initialEndPoint.position.x - initialStartPoint.position.x, 2) +
        Math.pow(initialEndPoint.position.y - initialStartPoint.position.y, 2)
      )
      
      // Move wall
      modelStore.moveWall(wall.id, 30, 40)
      
      const updatedModelStore = useModelStore.getState()
      const updatedStartPoint = updatedModelStore.points.get(wall.startPointId)!
      const updatedEndPoint = updatedModelStore.points.get(wall.endPointId)!
      
      const updatedLength = Math.sqrt(
        Math.pow(updatedEndPoint.position.x - updatedStartPoint.position.x, 2) +
        Math.pow(updatedEndPoint.position.y - updatedStartPoint.position.y, 2)
      )
      
      expect(updatedLength).toBeCloseTo(initialLength, 5)
    })

    test('should handle vertical wall movement correctly', () => {
      // Create a vertical wall for this test
      const modelStore = useModelStore.getState()
      const floors = Array.from(modelStore.floors.values())
      const groundFloor = floors[0]

      const startPoint = modelStore.addPoint({ 
        x: createAbsoluteOffset(150), 
        y: createAbsoluteOffset(100) 
      } as Point2D, groundFloor.id)
      
      const endPoint = modelStore.addPoint({ 
        x: createAbsoluteOffset(150), 
        y: createAbsoluteOffset(300) 
      } as Point2D, groundFloor.id)

      const verticalWall = modelStore.addWall(
        startPoint.id,
        endPoint.id,
        groundFloor.id,
        createLength(2700),
        createLength(2700),
        createLength(200)
      )

      // Get fresh store reference after wall creation
      const freshModelStore = useModelStore.getState()
      const initialStartPoint = freshModelStore.points.get(verticalWall.startPointId)
      const initialEndPoint = freshModelStore.points.get(verticalWall.endPointId)
      
      // Check points exist before proceeding
      expect(initialStartPoint).toBeDefined()
      expect(initialEndPoint).toBeDefined()
      
      // Move vertical wall with diagonal delta (should only move horizontally)
      freshModelStore.moveWall(verticalWall.id, 50, 50)
      
      const updatedModelStore = useModelStore.getState()
      const updatedStartPoint = updatedModelStore.points.get(verticalWall.startPointId)
      const updatedEndPoint = updatedModelStore.points.get(verticalWall.endPointId)
      
      // Check updated points exist
      expect(updatedStartPoint).toBeDefined()
      expect(updatedEndPoint).toBeDefined()
      
      if (initialStartPoint && initialEndPoint && updatedStartPoint && updatedEndPoint) {
        // Wall is vertical, so only X movement should be applied (perpendicular)
        expect(updatedStartPoint.position.y).toBe(initialStartPoint.position.y)
        expect(updatedEndPoint.position.y).toBe(initialEndPoint.position.y)
        
        // X position should change (perpendicular to vertical wall)
        expect(updatedStartPoint.position.x).not.toBe(initialStartPoint.position.x)
        expect(updatedEndPoint.position.x).not.toBe(initialEndPoint.position.x)
      }
    })
  })

  describe('Directional Arrows', () => {
    test('should not show direction arrows when wall is not selected', () => {
      render(<FloorPlanEditor />)
      
      // Ensure no wall is selected
      useEditorStore.getState().clearSelection()
      
      // Check that no direction arrows are rendered
      const arrows = screen.queryAllByTestId('direction-arrow')
      expect(arrows).toHaveLength(0)
    })
  })

  describe('Selection Persistence', () => {
    test('should maintain wall selection after drag operation', () => {
      render(<FloorPlanEditor />)
      
      // Select the wall first (as WallShape handleMouseDown would do)
      useEditorStore.getState().setSelectedEntity(wallId)
      
      // Simulate starting a drag operation
      useEditorStore.getState().startDrag('wall', 
        { x: createAbsoluteOffset(150), y: createAbsoluteOffset(100) }, 
        wallId
      )
      
      // Wall should be selected
      expect(useEditorStore.getState().selectedEntityId).toBe(wallId)
      
      // Simulate ending the drag
      useEditorStore.getState().endDrag()
      
      // Wall should still be selected after drag ends
      expect(useEditorStore.getState().selectedEntityId).toBe(wallId)
    })

    test('should select wall when explicitly set', () => {
      render(<FloorPlanEditor />)
      
      // Initially no selection
      expect(useEditorStore.getState().selectedEntityId).toBeUndefined()
      
      // Select the wall (as WallShape handleMouseDown would do)
      useEditorStore.getState().setSelectedEntity(wallId)
      
      // Wall should be selected
      expect(useEditorStore.getState().selectedEntityId).toBe(wallId)
    })

    test('should not change selection when already selected', () => {
      render(<FloorPlanEditor />)
      
      // Select the wall first
      useEditorStore.getState().setSelectedEntity(wallId)
      expect(useEditorStore.getState().selectedEntityId).toBe(wallId)
      
      // Select the same wall again (should not change)
      useEditorStore.getState().setSelectedEntity(wallId)
      
      // Wall should remain selected
      expect(useEditorStore.getState().selectedEntityId).toBe(wallId)
    })
  })

  describe('Integration Tests', () => {
    test('should maintain selection during complete drag workflow', () => {
      render(<FloorPlanEditor />)
      
      // Select wall (as WallShape handleMouseDown would do)
      useEditorStore.getState().setSelectedEntity(wallId)
      
      // Start drag 
      useEditorStore.getState().startDrag('wall', 
        { x: createAbsoluteOffset(150), y: createAbsoluteOffset(100) }, 
        wallId
      )
      
      // Wall should be selected
      expect(useEditorStore.getState().selectedEntityId).toBe(wallId)
      
      // Perform wall movement
      const modelStore = useModelStore.getState()
      const wall = Array.from(modelStore.walls.values())[0]
      modelStore.moveWall(wall.id, 0, 25) // Move perpendicular to wall
      
      // End drag
      useEditorStore.getState().endDrag()
      
      // Wall should still be selected
      expect(useEditorStore.getState().selectedEntityId).toBe(wallId)
    })
  })
})