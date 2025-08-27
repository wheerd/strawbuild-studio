import { describe, it, expect, beforeEach } from 'vitest'
import {
  createEmptyModelState,
  createFloor,
  createWall,
  createRoom,
  createPoint,
  addFloorToState,
  addWallToFloor,
  addPointToFloor,
  mergePoints,
  updateOrCreateCorner
} from '@/model/operations'
import { createLength, createPoint2D } from '@/types/geometry'
import { createFloorLevel } from '@/types/model'
import type { ModelState } from '@/types/model'
import type { FloorId } from '@/types/ids'

describe('Point Merging', () => {
  let state: ModelState
  let floorId: FloorId

  beforeEach(() => {
    state = createEmptyModelState()
    floorId = Array.from(state.floors.keys())[0]
  })

  describe('mergePoints', () => {
    it('should merge two unconnected points', () => {
      // Create two separate points
      const point1 = createPoint(createPoint2D(0, 0))
      const point2 = createPoint(createPoint2D(100, 100))

      state = addPointToFloor(state, point1, floorId)
      state = addPointToFloor(state, point2, floorId)

      expect(state.points.size).toBe(2)

      // Merge point2 into point1
      const updatedState = mergePoints(state, point1.id, point2.id, floorId)

      // Should have only one point remaining (point1)
      expect(updatedState.points.size).toBe(1)
      expect(updatedState.points.has(point1.id)).toBe(true)
      expect(updatedState.points.has(point2.id)).toBe(false)
    })

    it('should redirect walls from source point to target point', () => {
      // Create three points
      const point1 = createPoint(createPoint2D(0, 0))
      const point2 = createPoint(createPoint2D(100, 0))
      const point3 = createPoint(createPoint2D(200, 0))

      state = addPointToFloor(state, point1, floorId)
      state = addPointToFloor(state, point2, floorId)
      state = addPointToFloor(state, point3, floorId)

      // Create walls connected to point2
      const wall1 = createWall(point1.id, point2.id, createLength(3000), createLength(3000), createLength(200))
      const wall2 = createWall(point2.id, point3.id, createLength(3000), createLength(3000), createLength(200))

      state = addWallToFloor(state, wall1, floorId)
      state = addWallToFloor(state, wall2, floorId)

      expect(state.walls.size).toBe(2)

      // Merge point2 into point1
      const updatedState = mergePoints(state, point1.id, point2.id, floorId)

      // Should only have one wall remaining (wall2 redirected from point2 to point1)
      expect(updatedState.walls.size).toBe(1)
      const remainingWall = Array.from(updatedState.walls.values())[0]
      expect([remainingWall.startPointId, remainingWall.endPointId]).toContain(point1.id)
      expect([remainingWall.startPointId, remainingWall.endPointId]).toContain(point3.id)
    })

    it('should remove degenerate walls (same start and end point)', () => {
      // Create two points
      const point1 = createPoint(createPoint2D(0, 0))
      const point2 = createPoint(createPoint2D(100, 0))

      state = addPointToFloor(state, point1, floorId)
      state = addPointToFloor(state, point2, floorId)

      // Create a wall between the two points
      const wall = createWall(point1.id, point2.id, createLength(3000), createLength(3000), createLength(200))
      state = addWallToFloor(state, wall, floorId)

      expect(state.walls.size).toBe(1)

      // Merge point2 into point1 - this should make the wall degenerate
      const updatedState = mergePoints(state, point1.id, point2.id, floorId)

      // The degenerate wall should be removed
      expect(updatedState.walls.size).toBe(0)
    })

    it('should remove duplicate walls', () => {
      // Create three points in a line
      const point1 = createPoint(createPoint2D(0, 0))
      const point2 = createPoint(createPoint2D(100, 0))
      const point3 = createPoint(createPoint2D(200, 0))

      state = addPointToFloor(state, point1, floorId)
      state = addPointToFloor(state, point2, floorId)
      state = addPointToFloor(state, point3, floorId)

      // Create two walls: one from point1 to point3 directly, and one from point2 to point3
      const wall1 = createWall(point1.id, point3.id, createLength(3000), createLength(3000), createLength(200))
      const wall2 = createWall(point2.id, point3.id, createLength(3000), createLength(3000), createLength(200))

      state = addWallToFloor(state, wall1, floorId)
      state = addWallToFloor(state, wall2, floorId)

      expect(state.walls.size).toBe(2)

      // Merge point2 into point1 - wall2 should become a duplicate of wall1
      const updatedState = mergePoints(state, point1.id, point2.id, floorId)

      // Should remove the duplicate wall
      expect(updatedState.walls.size).toBe(1)
      // The remaining wall should still connect point1 to point3
      const remainingWall = Array.from(updatedState.walls.values())[0]
      expect([remainingWall.startPointId, remainingWall.endPointId]).toContain(point1.id)
      expect([remainingWall.startPointId, remainingWall.endPointId]).toContain(point3.id)
    })

    it('should update corners at the target point', () => {
      // Create an L-shape with point1 at the corner
      const point1 = createPoint(createPoint2D(0, 0))
      const point2 = createPoint(createPoint2D(100, 0))
      const point3 = createPoint(createPoint2D(0, 100))
      const point4 = createPoint(createPoint2D(50, 50)) // Point to merge into point1

      state = addPointToFloor(state, point1, floorId)
      state = addPointToFloor(state, point2, floorId)
      state = addPointToFloor(state, point3, floorId)
      state = addPointToFloor(state, point4, floorId)

      // Create L-shaped walls
      const wall1 = createWall(point1.id, point2.id, createLength(3000), createLength(3000), createLength(200))
      const wall2 = createWall(point1.id, point3.id, createLength(3000), createLength(3000), createLength(200))
      const wall3 = createWall(point4.id, point2.id, createLength(3000), createLength(3000), createLength(200))

      state = addWallToFloor(state, wall1, floorId)
      state = addWallToFloor(state, wall2, floorId)
      state = addWallToFloor(state, wall3, floorId)

      // Create corner at point1
      state = updateOrCreateCorner(state, point1.id)
      expect(state.corners.size).toBe(1)

      // Merge point4 into point1
      const updatedState = mergePoints(state, point1.id, point4.id, floorId)

      // Should still have a corner at point1, now with more walls
      expect(updatedState.corners.size).toBe(1)
      const corner = Array.from(updatedState.corners.values())[0]
      expect(corner.pointId).toBe(point1.id)
      // Could be 'corner' or 'tee' depending on the wall connections after merge
    })

    it('should not merge points on different floors', () => {
      const floor2 = createFloor('Floor 2', createFloorLevel(1), createLength(3000))
      state = addFloorToState(state, floor2)

      const point1 = createPoint(createPoint2D(0, 0))
      const point2 = createPoint(createPoint2D(100, 100))

      // Add points to different floors
      state = addPointToFloor(state, point1, floorId)
      state = addPointToFloor(state, point2, floor2.id)

      const originalState = { ...state }

      // Try to merge points on different floors
      const updatedState = mergePoints(state, point1.id, point2.id, floorId)

      // Should not have changed anything
      expect(updatedState.points.size).toBe(originalState.points.size)
      expect(updatedState.points.has(point1.id)).toBe(true)
      expect(updatedState.points.has(point2.id)).toBe(true)
    })

    it('should not merge a point with itself', () => {
      const point1 = createPoint(createPoint2D(0, 0))
      state = addPointToFloor(state, point1, floorId)

      const originalState = { ...state }

      // Try to merge point with itself
      const updatedState = mergePoints(state, point1.id, point1.id, floorId)

      // Should not have changed anything
      expect(updatedState).toEqual(originalState)
    })
  })
})
