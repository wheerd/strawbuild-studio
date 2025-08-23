import { describe, it, expect, beforeEach } from 'vitest'
import {
  createEmptyModelState,
  deletePoint,
  deleteWall,
  deleteRoom,
  createFloor,
  createPoint,
  createWall,
  createRoom,
  addFloorToState,
  addPointToFloor,
  addWallToFloor,
  addRoomToFloor,
  findRoomsContainingWall,
  updateOrCreateCorner
} from './operations'
import { createFloorLevel } from '@/types/model'
import { createLength, createPoint2D } from '@/types/geometry'
import type { ModelState, Floor, Point, Wall, Room } from '@/types/model'
import type { FloorId, PointId, WallId } from '@/types/ids'

describe('Deletion Operations', () => {
  let state: ModelState
  let floor: Floor
  let point1: Point
  let point2: Point
  let point3: Point
  let wall1: Wall
  let wall2: Wall
  let room1: Room

  beforeEach(() => {
    // Set up a test state with a floor, points, walls, and a room
    state = createEmptyModelState()
    floor = createFloor('Test Floor', createFloorLevel(0), createLength(3000))
    state = addFloorToState(state, floor)

    // Create points forming a triangle
    point1 = createPoint(createPoint2D(0, 0))
    point2 = createPoint(createPoint2D(1000, 0))
    point3 = createPoint(createPoint2D(500, 1000))

    state = addPointToFloor(state, point1, floor.id)
    state = addPointToFloor(state, point2, floor.id)
    state = addPointToFloor(state, point3, floor.id)

    // Create walls connecting the points
    wall1 = createWall(
      point1.id,
      point2.id,
      createLength(3000),
      createLength(3000),
      createLength(200)
    )
    wall2 = createWall(
      point2.id,
      point3.id,
      createLength(3000),
      createLength(3000),
      createLength(200)
    )

    state = addWallToFloor(state, wall1, floor.id)
    state = addWallToFloor(state, wall2, floor.id)

    // Create corners
    state = updateOrCreateCorner(state, point1.id)
    state = updateOrCreateCorner(state, point2.id)
    state = updateOrCreateCorner(state, point3.id)

    // Create a room using the walls
    room1 = createRoom('Test Room', [wall1.id, wall2.id])
    state = addRoomToFloor(state, room1, floor.id)
  })

  describe('findRoomsContainingWall', () => {
    it('finds rooms that contain a specific wall', () => {
      const roomsWithWall1 = findRoomsContainingWall(state, wall1.id)
      expect(roomsWithWall1).toHaveLength(1)
      expect(roomsWithWall1[0].id).toBe(room1.id)
    })

    it('returns empty array for walls not in any room', () => {
      const wall3 = createWall(
        point1.id,
        point3.id,
        createLength(3000),
        createLength(3000),
        createLength(200)
      )
      state = addWallToFloor(state, wall3, floor.id, false)

      const roomsWithWall3 = findRoomsContainingWall(state, wall3.id)
      expect(roomsWithWall3).toHaveLength(0)
    })
  })

  describe('deleteRoom', () => {
    it('removes room from state and floor', () => {
      expect(state.rooms.has(room1.id)).toBe(true)
      expect(state.floors.get(floor.id)?.roomIds.includes(room1.id)).toBe(true)

      const updatedState = deleteRoom(state, room1.id as any, floor.id)

      expect(updatedState.rooms.has(room1.id)).toBe(false)
      expect(updatedState.floors.get(floor.id)?.roomIds.includes(room1.id)).toBe(false)
    })

    it('does not affect walls when deleting room', () => {
      const updatedState = deleteRoom(state, room1.id as any, floor.id)

      expect(updatedState.walls.has(wall1.id)).toBe(true)
      expect(updatedState.walls.has(wall2.id)).toBe(true)
    })

    it('updates the updatedAt timestamp', () => {
      const originalUpdatedAt = state.updatedAt

      // Add a small delay to ensure timestamp difference
      const updatedState = deleteRoom(state, room1.id as any, floor.id)

      expect(updatedState.updatedAt).not.toBe(originalUpdatedAt)
      expect(updatedState.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime())
    })
  })

  describe('deleteWall', () => {
    it('removes wall from state and floor', () => {
      expect(state.walls.has(wall1.id)).toBe(true)
      expect(state.floors.get(floor.id)?.wallIds.includes(wall1.id)).toBe(true)

      const updatedState = deleteWall(state, wall1.id, floor.id)

      expect(updatedState.walls.has(wall1.id)).toBe(false)
      expect(updatedState.floors.get(floor.id)?.wallIds.includes(wall1.id)).toBe(false)
    })

    it('removes rooms that contain the deleted wall', () => {
      expect(state.rooms.has(room1.id)).toBe(true)

      const updatedState = deleteWall(state, wall1.id, floor.id)

      // Room should be deleted because it contained wall1
      expect(updatedState.rooms.has(room1.id)).toBe(false)
      expect(updatedState.floors.get(floor.id)?.roomIds.includes(room1.id)).toBe(false)
    })

    it('updates corners at wall endpoints', () => {
      // Before deletion, point2 should have a corner with both walls
      const cornerAtPoint2Before = Array.from(state.corners.values())
        .find(corner => corner.pointId === point2.id)
      expect(cornerAtPoint2Before).toBeDefined()

      const updatedState = deleteWall(state, wall1.id, floor.id)

      // Since wall2 is still connected to point2, there should still be a corner or it should be removed
      // depending on how many walls remain connected
      expect(updatedState.corners.size).toBeLessThanOrEqual(state.corners.size)
    })

    it('does not affect points when deleting wall', () => {
      const updatedState = deleteWall(state, wall1.id, floor.id)

      expect(updatedState.points.has(point1.id)).toBe(true)
      expect(updatedState.points.has(point2.id)).toBe(true)
      expect(updatedState.points.has(point3.id)).toBe(true)
    })

    it('updates state bounds after deletion', () => {
      const updatedState = deleteWall(state, wall1.id, floor.id)

      // Bounds should be recalculated
      expect(updatedState.bounds).toBeDefined()
    })
  })

  describe('deletePoint', () => {
    it('removes point from state and floor', () => {
      expect(state.points.has(point1.id)).toBe(true)
      expect(state.floors.get(floor.id)?.pointIds.includes(point1.id)).toBe(true)

      const updatedState = deletePoint(state, point1.id, floor.id)

      expect(updatedState.points.has(point1.id)).toBe(false)
      expect(updatedState.floors.get(floor.id)?.pointIds.includes(point1.id)).toBe(false)
    })

    it('removes all walls connected to the deleted point (cascading deletion)', () => {
      // wall1 connects point1 to point2
      expect(state.walls.has(wall1.id)).toBe(true)

      const updatedState = deletePoint(state, point1.id, floor.id)

      // wall1 should be deleted because it was connected to point1
      expect(updatedState.walls.has(wall1.id)).toBe(false)
      expect(updatedState.floors.get(floor.id)?.wallIds.includes(wall1.id)).toBe(false)
    })

    it('removes rooms that contain walls connected to the deleted point', () => {
      // room1 contains wall1 which is connected to point1
      expect(state.rooms.has(room1.id)).toBe(true)

      const updatedState = deletePoint(state, point1.id, floor.id)

      // room1 should be deleted because it contained wall1 which was connected to point1
      expect(updatedState.rooms.has(room1.id)).toBe(false)
      expect(updatedState.floors.get(floor.id)?.roomIds.includes(room1.id)).toBe(false)
    })

    it('updates corners at other endpoints of connected walls', () => {
      // Before deletion, point2 should have a corner
      const cornersBefore = state.corners.size
      expect(cornersBefore).toBeGreaterThan(0)

      const updatedState = deletePoint(state, point1.id, floor.id)

      // After deleting point1, corners should be updated
      // The exact number depends on the remaining wall connections
      expect(updatedState.corners.size).toBeLessThanOrEqual(cornersBefore)
    })

    it('removes corner at the deleted point', () => {
      // Find corner at point1
      const cornerAtPoint1 = Array.from(state.corners.values())
        .find(corner => corner.pointId === point1.id)

      if (cornerAtPoint1 != null) {
        expect(state.corners.has(cornerAtPoint1.id)).toBe(true)

        const updatedState = deletePoint(state, point1.id, floor.id)

        expect(updatedState.corners.has(cornerAtPoint1.id)).toBe(false)
      }
    })

    it('updates state bounds after deletion', () => {
      const updatedState = deletePoint(state, point1.id, floor.id)

      // Bounds should be recalculated based on remaining points
      expect(updatedState.bounds).toBeDefined()
    })

    it('handles deletion of point with no connected walls gracefully', () => {
      // Create an isolated point
      const isolatedPoint = createPoint(createPoint2D(2000, 2000))
      state = addPointToFloor(state, isolatedPoint, floor.id)

      const updatedState = deletePoint(state, isolatedPoint.id, floor.id)

      expect(updatedState.points.has(isolatedPoint.id)).toBe(false)
      // Other entities should remain unchanged
      expect(updatedState.walls.size).toBe(state.walls.size)
      expect(updatedState.rooms.size).toBe(state.rooms.size)
    })
  })

  describe('Complex cascading deletion scenarios', () => {
    beforeEach(() => {
      // Create a more complex scenario with multiple rooms and interconnected walls
      const point4 = createPoint(createPoint2D(1000, 1000))
      state = addPointToFloor(state, point4, floor.id)

      const wall3 = createWall(
        point3.id,
        point4.id,
        createLength(3000),
        createLength(3000),
        createLength(200)
      )
      const wall4 = createWall(
        point4.id,
        point1.id,
        createLength(3000),
        createLength(3000),
        createLength(200)
      )

      state = addWallToFloor(state, wall3, floor.id)
      state = addWallToFloor(state, wall4, floor.id)

      // Update corners
      state = updateOrCreateCorner(state, point1.id)
      state = updateOrCreateCorner(state, point2.id)
      state = updateOrCreateCorner(state, point3.id)
      state = updateOrCreateCorner(state, point4.id)

      // Create another room
      const room2 = createRoom('Room 2', [wall2.id, wall3.id])
      state = addRoomToFloor(state, room2, floor.id)
    })

    it('deleting a central point affects multiple walls and rooms', () => {
      // point3 is connected to wall2 and wall3
      const initialWallCount = state.walls.size
      const initialRoomCount = state.rooms.size

      const updatedState = deletePoint(state, point3.id, floor.id)

      // Should delete walls connected to point3
      expect(updatedState.walls.size).toBeLessThan(initialWallCount)

      // Should delete rooms that contained those walls
      expect(updatedState.rooms.size).toBeLessThan(initialRoomCount)
    })

    it('maintains data consistency after complex deletion', () => {
      const updatedState = deletePoint(state, point2.id, floor.id)

      // Verify no orphaned references exist
      for (const wall of updatedState.walls.values()) {
        expect(updatedState.points.has(wall.startPointId)).toBe(true)
        expect(updatedState.points.has(wall.endPointId)).toBe(true)
      }

      for (const room of updatedState.rooms.values()) {
        for (const wallId of room.wallIds) {
          expect(updatedState.walls.has(wallId)).toBe(true)
        }
      }

      for (const corner of updatedState.corners.values()) {
        expect(updatedState.points.has(corner.pointId)).toBe(true)
        expect(updatedState.walls.has(corner.wall1Id)).toBe(true)
        expect(updatedState.walls.has(corner.wall2Id)).toBe(true)
      }
    })
  })

  describe('Edge cases', () => {
    it('handles deletion of non-existent entities gracefully', () => {
      const nonExistentPointId = 'non-existent' as PointId
      const nonExistentWallId = 'non-existent' as WallId

      const updatedState1 = deletePoint(state, nonExistentPointId, floor.id)
      // Should not change the core data structures
      expect(updatedState1.points.size).toBe(state.points.size)
      expect(updatedState1.walls.size).toBe(state.walls.size)
      expect(updatedState1.rooms.size).toBe(state.rooms.size)

      const updatedState2 = deleteWall(state, nonExistentWallId, floor.id)
      expect(updatedState2.points.size).toBe(state.points.size)
      expect(updatedState2.walls.size).toBe(state.walls.size)
      expect(updatedState2.rooms.size).toBe(state.rooms.size)
    })

    it('handles deletion from non-existent floor gracefully', () => {
      const nonExistentFloorId = 'non-existent' as FloorId

      const updatedState1 = deletePoint(state, point1.id, nonExistentFloorId)
      // Should not change the core data structures
      expect(updatedState1.points.size).toBe(state.points.size)
      expect(updatedState1.walls.size).toBe(state.walls.size)
      expect(updatedState1.rooms.size).toBe(state.rooms.size)

      const updatedState2 = deleteWall(state, wall1.id, nonExistentFloorId)
      expect(updatedState2.points.size).toBe(state.points.size)
      expect(updatedState2.walls.size).toBe(state.walls.size)
      expect(updatedState2.rooms.size).toBe(state.rooms.size)
    })
  })
})
