import { describe, it, expect } from 'vitest'
import { createEmptyModelState, addPointToFloor, addWallToFloor, updateOrCreateCorner, findWallsConnectedToPoint, createPoint, createWall, createFloor, switchCornerMainWalls } from '@/model/operations'
import { createLength, createAbsoluteOffset, radiansToDegrees } from '@/types/geometry'
import { createFloorLevel } from '@/types/model'
import type { ModelState } from '@/types/model'
import type { FloorId } from '@/types/ids'

describe('Corner Management', () => {
  let state: ModelState
  let floorId: FloorId

  beforeEach(() => {
    state = createEmptyModelState()
    const floor = createFloor('Test Floor', createFloorLevel(0), createLength(3000))
    floorId = floor.id
    state.floors.set(floorId, floor)
  })

  describe('findWallsConnectedToPoint', () => {
    it('should find walls connected to a point', () => {
      // Add three points
      const point1 = createPoint({ x: createAbsoluteOffset(0), y: createAbsoluteOffset(0) })
      const point2 = createPoint({ x: createAbsoluteOffset(1000), y: createAbsoluteOffset(0) })
      const point3 = createPoint({ x: createAbsoluteOffset(0), y: createAbsoluteOffset(1000) })

      state = addPointToFloor(state, point1, floorId)
      state = addPointToFloor(state, point2, floorId)
      state = addPointToFloor(state, point3, floorId)

      // Add two walls sharing point1
      const wall1 = createWall(point1.id, point2.id, createLength(3000), createLength(3000), createLength(200))
      const wall2 = createWall(point1.id, point3.id, createLength(3000), createLength(3000), createLength(200))

      state = addWallToFloor(state, wall1, floorId)
      state = addWallToFloor(state, wall2, floorId)

      const connectedWalls = findWallsConnectedToPoint(state, point1.id)

      expect(connectedWalls).toHaveLength(2)
      expect(connectedWalls.map(w => w.id)).toContain(wall1.id)
      expect(connectedWalls.map(w => w.id)).toContain(wall2.id)
    })
  })

  describe('updateOrCreateCorner', () => {
    it('should create a corner when two walls meet', () => {
      // Create an L-shaped configuration
      const point1 = createPoint({ x: createAbsoluteOffset(0), y: createAbsoluteOffset(0) })
      const point2 = createPoint({ x: createAbsoluteOffset(1000), y: createAbsoluteOffset(0) })
      const point3 = createPoint({ x: createAbsoluteOffset(0), y: createAbsoluteOffset(1000) })

      state = addPointToFloor(state, point1, floorId)
      state = addPointToFloor(state, point2, floorId)
      state = addPointToFloor(state, point3, floorId)

      const wall1 = createWall(point1.id, point2.id, createLength(3000), createLength(3000), createLength(200))
      const wall2 = createWall(point1.id, point3.id, createLength(3000), createLength(3000), createLength(200))

      state = addWallToFloor(state, wall1, floorId)
      state = addWallToFloor(state, wall2, floorId)

      // Update corner at point1
      const updatedState = updateOrCreateCorner(state, point1.id)

      expect(updatedState.corners.size).toBe(1)
      const corner = Array.from(updatedState.corners.values())[0]
      expect(corner.pointId).toBe(point1.id)
      expect(corner.type).toBe('corner')
      expect([corner.wall1Id, corner.wall2Id]).toContain(wall1.id)
      expect([corner.wall1Id, corner.wall2Id]).toContain(wall2.id)
    })

    it('should create a corner (not straight) when two walls meet at any significant angle', () => {
      // Create an L-shaped configuration - with the new tolerance, this will be a corner, not straight
      const point1 = createPoint({ x: createAbsoluteOffset(0), y: createAbsoluteOffset(0) })
      const point2 = createPoint({ x: createAbsoluteOffset(500), y: createAbsoluteOffset(0) })
      const point3 = createPoint({ x: createAbsoluteOffset(500), y: createAbsoluteOffset(500) })

      state = addPointToFloor(state, point1, floorId)
      state = addPointToFloor(state, point2, floorId)
      state = addPointToFloor(state, point3, floorId)

      const wall1 = createWall(point1.id, point2.id, createLength(3000), createLength(3000), createLength(200))
      const wall2 = createWall(point2.id, point3.id, createLength(3000), createLength(3000), createLength(200))

      state = addWallToFloor(state, wall1, floorId)
      state = addWallToFloor(state, wall2, floorId)

      // Update corner at point2
      const updatedState = updateOrCreateCorner(state, point2.id)

      expect(updatedState.corners.size).toBe(1)
      const corner = Array.from(updatedState.corners.values())[0]
      expect(corner.pointId).toBe(point2.id)
      expect(corner.type).toBe('corner') // Should be corner, not straight

      // Angle should be 90 degrees
      const angleInDegrees = radiansToDegrees(corner.angle)
      expect(Math.abs(angleInDegrees - 90)).toBeLessThan(1) // Allow for small floating point errors
    })

    it('should create a tee corner when three walls meet', () => {
      // Create a T-shaped configuration - center point where 3 walls meet
      const centerPoint = createPoint({ x: createAbsoluteOffset(500), y: createAbsoluteOffset(500) }) // center of T
      const topPoint = createPoint({ x: createAbsoluteOffset(500), y: createAbsoluteOffset(0) }) // top
      const leftPoint = createPoint({ x: createAbsoluteOffset(0), y: createAbsoluteOffset(500) }) // left
      const rightPoint = createPoint({ x: createAbsoluteOffset(1000), y: createAbsoluteOffset(500) }) // right

      state = addPointToFloor(state, centerPoint, floorId)
      state = addPointToFloor(state, topPoint, floorId)
      state = addPointToFloor(state, leftPoint, floorId)
      state = addPointToFloor(state, rightPoint, floorId)

      // Three walls meeting at the center point
      const wall1 = createWall(centerPoint.id, topPoint.id, createLength(3000), createLength(3000), createLength(200)) // vertical up
      const wall2 = createWall(centerPoint.id, leftPoint.id, createLength(3000), createLength(3000), createLength(200)) // horizontal left
      const wall3 = createWall(centerPoint.id, rightPoint.id, createLength(3000), createLength(3000), createLength(200)) // horizontal right

      state = addWallToFloor(state, wall1, floorId)
      state = addWallToFloor(state, wall2, floorId)
      state = addWallToFloor(state, wall3, floorId)

      // Update corner at center point where three walls meet
      const updatedState = updateOrCreateCorner(state, centerPoint.id)

      expect(updatedState.corners.size).toBe(1)
      const corner = Array.from(updatedState.corners.values())[0]
      expect(corner.pointId).toBe(centerPoint.id)
      expect(corner.type).toBe('tee')
      expect(corner.otherWallIds).toBeDefined()
      expect(corner.otherWallIds).toHaveLength(1)
    })

    it('should update wall references to include corner touches', () => {
      const point1 = createPoint({ x: createAbsoluteOffset(0), y: createAbsoluteOffset(0) })
      const point2 = createPoint({ x: createAbsoluteOffset(1000), y: createAbsoluteOffset(0) })
      const point3 = createPoint({ x: createAbsoluteOffset(0), y: createAbsoluteOffset(1000) })

      state = addPointToFloor(state, point1, floorId)
      state = addPointToFloor(state, point2, floorId)
      state = addPointToFloor(state, point3, floorId)

      const wall1 = createWall(point1.id, point2.id, createLength(3000), createLength(3000), createLength(200))
      const wall2 = createWall(point1.id, point3.id, createLength(3000), createLength(3000), createLength(200))

      state = addWallToFloor(state, wall1, floorId)
      state = addWallToFloor(state, wall2, floorId)

      const updatedState = updateOrCreateCorner(state, point1.id)
      const corner = Array.from(updatedState.corners.values())[0]

      // Check that walls now reference the corner
      const updatedWall1 = updatedState.walls.get(wall1.id)
      const updatedWall2 = updatedState.walls.get(wall2.id)

      expect(updatedWall1).toBeDefined()
      expect(updatedWall2).toBeDefined()
      expect(updatedWall1?.startTouches).toBe(corner.id)
      expect(updatedWall2?.startTouches).toBe(corner.id)
    })

    it('should remove corner when only one wall remains', () => {
      // First create a corner with two walls
      const point1 = createPoint({ x: createAbsoluteOffset(0), y: createAbsoluteOffset(0) })
      const point2 = createPoint({ x: createAbsoluteOffset(1000), y: createAbsoluteOffset(0) })
      const point3 = createPoint({ x: createAbsoluteOffset(0), y: createAbsoluteOffset(1000) })

      state = addPointToFloor(state, point1, floorId)
      state = addPointToFloor(state, point2, floorId)
      state = addPointToFloor(state, point3, floorId)

      const wall1 = createWall(point1.id, point2.id, createLength(3000), createLength(3000), createLength(200))
      const wall2 = createWall(point1.id, point3.id, createLength(3000), createLength(3000), createLength(200))

      state = addWallToFloor(state, wall1, floorId)
      state = addWallToFloor(state, wall2, floorId)
      state = updateOrCreateCorner(state, point1.id)

      expect(state.corners.size).toBe(1)

      // Remove one wall
      const updatedStateMap = new Map(state.walls)
      updatedStateMap.delete(wall2.id)
      const stateAfterRemoval = { ...state, walls: updatedStateMap }

      // Update corner - should be removed since only one wall remains
      const finalState = updateOrCreateCorner(stateAfterRemoval, point1.id)

      expect(finalState.corners.size).toBe(0)
    })
  })

  describe('switchCornerMainWalls', () => {
    it('should switch the main walls of a corner', () => {
      // Create a T-shaped configuration with 3 walls
      const centerPoint = createPoint({ x: createAbsoluteOffset(500), y: createAbsoluteOffset(500) })
      const topPoint = createPoint({ x: createAbsoluteOffset(500), y: createAbsoluteOffset(0) })
      const leftPoint = createPoint({ x: createAbsoluteOffset(0), y: createAbsoluteOffset(500) })
      const rightPoint = createPoint({ x: createAbsoluteOffset(1000), y: createAbsoluteOffset(500) })

      state = addPointToFloor(state, centerPoint, floorId)
      state = addPointToFloor(state, topPoint, floorId)
      state = addPointToFloor(state, leftPoint, floorId)
      state = addPointToFloor(state, rightPoint, floorId)

      const wall1 = createWall(centerPoint.id, topPoint.id, createLength(3000), createLength(3000), createLength(200))
      const wall2 = createWall(centerPoint.id, leftPoint.id, createLength(3000), createLength(3000), createLength(200))
      const wall3 = createWall(centerPoint.id, rightPoint.id, createLength(3000), createLength(3000), createLength(200))

      state = addWallToFloor(state, wall1, floorId)
      state = addWallToFloor(state, wall2, floorId)
      state = addWallToFloor(state, wall3, floorId)

      // Create corner
      state = updateOrCreateCorner(state, centerPoint.id)
      const corner = Array.from(state.corners.values())[0]

      expect(corner.type).toBe('tee')

      // Switch main walls - use wall2 and wall3 as new main walls
      const updatedState = switchCornerMainWalls(state, corner.id, wall2.id, wall3.id)
      const updatedCorner = Array.from(updatedState.corners.values())[0]

      expect(updatedCorner.wall1Id).toBe(wall2.id)
      expect(updatedCorner.wall2Id).toBe(wall3.id)
      expect(updatedCorner.otherWallIds).toContain(wall1.id)
      expect(updatedCorner.type).toBe('tee') // Still a tee
    })

    it('should throw error when switching to non-connected walls', () => {
      // Create a simple corner
      const point1 = createPoint({ x: createAbsoluteOffset(0), y: createAbsoluteOffset(0) })
      const point2 = createPoint({ x: createAbsoluteOffset(1000), y: createAbsoluteOffset(0) })
      const point3 = createPoint({ x: createAbsoluteOffset(0), y: createAbsoluteOffset(1000) })
      const point4 = createPoint({ x: createAbsoluteOffset(2000), y: createAbsoluteOffset(0) }) // Disconnected

      state = addPointToFloor(state, point1, floorId)
      state = addPointToFloor(state, point2, floorId)
      state = addPointToFloor(state, point3, floorId)
      state = addPointToFloor(state, point4, floorId)

      const wall1 = createWall(point1.id, point2.id, createLength(3000), createLength(3000), createLength(200))
      const wall2 = createWall(point1.id, point3.id, createLength(3000), createLength(3000), createLength(200))
      const wall3 = createWall(point2.id, point4.id, createLength(3000), createLength(3000), createLength(200)) // Not connected to point1

      state = addWallToFloor(state, wall1, floorId)
      state = addWallToFloor(state, wall2, floorId)
      state = addWallToFloor(state, wall3, floorId)

      state = updateOrCreateCorner(state, point1.id)
      const corner = Array.from(state.corners.values())[0]

      // Try to switch to wall3 which is not connected to the corner point
      expect(() => {
        switchCornerMainWalls(state, corner.id, wall1.id, wall3.id)
      }).toThrow('New main walls must be connected to the corner point')
    })
  })
})
