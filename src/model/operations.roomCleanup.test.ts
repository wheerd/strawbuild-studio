import { describe, it, expect } from 'vitest'
import {
  createEmptyModelState,
  addPointToFloor,
  addWallToFloor,
  addRoomToFloor,
  createPoint,
  createWall,
  createRoom,
  cleanupModelConsistency,
  updateRoomsAfterWallChange,
  cleanupInvalidRooms,
  ensureCorrectWallRoomAssignments,
  removeOrphanedReferences,
  isRoomValid,
  determineRoomSideOfWall
} from './operations'
import {
  createLength,
  createPoint2D
} from '@/types/geometry'

describe('Room Cleanup and Validation', () => {
  describe('isRoomValid', () => {
    it('should validate a proper rectangular room', () => {
      const state = createEmptyModelState()
      const floorId = Array.from(state.floors.keys())[0]

      // Create four points for a rectangle
      const point1 = createPoint(createPoint2D(0, 0))
      const point2 = createPoint(createPoint2D(1000, 0))
      const point3 = createPoint(createPoint2D(1000, 1000))
      const point4 = createPoint(createPoint2D(0, 1000))

      let updatedState = addPointToFloor(state, point1, floorId)
      updatedState = addPointToFloor(updatedState, point2, floorId)
      updatedState = addPointToFloor(updatedState, point3, floorId)
      updatedState = addPointToFloor(updatedState, point4, floorId)

      // Create four walls forming a rectangle
      const wall1 = createWall(point1.id, point2.id, createLength(3000), createLength(3000), createLength(200))
      const wall2 = createWall(point2.id, point3.id, createLength(3000), createLength(3000), createLength(200))
      const wall3 = createWall(point3.id, point4.id, createLength(3000), createLength(3000), createLength(200))
      const wall4 = createWall(point4.id, point1.id, createLength(3000), createLength(3000), createLength(200))

      updatedState = addWallToFloor(updatedState, wall1, floorId, false)
      updatedState = addWallToFloor(updatedState, wall2, floorId, false)
      updatedState = addWallToFloor(updatedState, wall3, floorId, false)
      updatedState = addWallToFloor(updatedState, wall4, floorId, false)

      // Create a valid room
      const room = createRoom('Test Room', [wall1.id, wall2.id, wall3.id, wall4.id], [point1.id, point2.id, point3.id, point4.id])

      expect(isRoomValid(room, updatedState)).toBe(true)
    })

    it('should reject rooms with too few walls', () => {
      const state = createEmptyModelState()
      const floorId = Array.from(state.floors.keys())[0]

      const point1 = createPoint(createPoint2D(0, 0))
      const point2 = createPoint(createPoint2D(1000, 0))

      let updatedState = addPointToFloor(state, point1, floorId)
      updatedState = addPointToFloor(updatedState, point2, floorId)

      const wall1 = createWall(point1.id, point2.id, createLength(3000), createLength(3000), createLength(200))
      updatedState = addWallToFloor(updatedState, wall1, floorId, false)

      // Room with only one wall is invalid
      const room = createRoom('Invalid Room', [wall1.id], [point1.id, point2.id])

      expect(isRoomValid(room, updatedState)).toBe(false)
    })

    it('should reject rooms with disconnected walls', () => {
      const state = createEmptyModelState()
      const floorId = Array.from(state.floors.keys())[0]

      // Create points for two separate walls
      const point1 = createPoint(createPoint2D(0, 0))
      const point2 = createPoint(createPoint2D(1000, 0))
      const point3 = createPoint(createPoint2D(2000, 0))
      const point4 = createPoint(createPoint2D(3000, 0))

      let updatedState = addPointToFloor(state, point1, floorId)
      updatedState = addPointToFloor(updatedState, point2, floorId)
      updatedState = addPointToFloor(updatedState, point3, floorId)
      updatedState = addPointToFloor(updatedState, point4, floorId)

      // Create two disconnected walls
      const wall1 = createWall(point1.id, point2.id, createLength(3000), createLength(3000), createLength(200))
      const wall2 = createWall(point3.id, point4.id, createLength(3000), createLength(3000), createLength(200))

      updatedState = addWallToFloor(updatedState, wall1, floorId, false)
      updatedState = addWallToFloor(updatedState, wall2, floorId, false)

      // Room with disconnected walls is invalid
      const room = createRoom('Invalid Room', [wall1.id, wall2.id], [point1.id, point2.id, point3.id, point4.id])

      expect(isRoomValid(room, updatedState)).toBe(false)
    })
  })

  describe('cleanupInvalidRooms', () => {
    it('should remove invalid rooms and clean up all references', () => {
      const state = createEmptyModelState()
      const floorId = Array.from(state.floors.keys())[0]

      // Create a simple room setup
      const point1 = createPoint(createPoint2D(0, 0))
      const point2 = createPoint(createPoint2D(1000, 0))

      let updatedState = addPointToFloor(state, point1, floorId)
      updatedState = addPointToFloor(updatedState, point2, floorId)

      const wall1 = createWall(point1.id, point2.id, createLength(3000), createLength(3000), createLength(200))
      updatedState = addWallToFloor(updatedState, wall1, floorId, false)

      // Create an invalid room (only one wall)
      const invalidRoom = createRoom('Invalid Room', [wall1.id], [point1.id, point2.id])
      updatedState = addRoomToFloor(updatedState, invalidRoom, floorId)

      // Verify room was added
      expect(updatedState.rooms.has(invalidRoom.id)).toBe(true)
      const floor = updatedState.floors.get(floorId)!
      expect(floor.roomIds).toContain(invalidRoom.id)

      // Clean up invalid rooms
      const cleanedState = cleanupInvalidRooms(updatedState, [invalidRoom.id])

      // Verify room was removed
      expect(cleanedState.rooms.has(invalidRoom.id)).toBe(false)
      const cleanedFloor = cleanedState.floors.get(floorId)!
      expect(cleanedFloor.roomIds).not.toContain(invalidRoom.id)

      // Verify wall references were cleaned up
      const cleanedWall = cleanedState.walls.get(wall1.id)!
      expect(cleanedWall.leftRoomId).toBeUndefined()
      expect(cleanedWall.rightRoomId).toBeUndefined()

      // Verify point references were cleaned up
      const cleanedPoint1 = cleanedState.points.get(point1.id)!
      const cleanedPoint2 = cleanedState.points.get(point2.id)!
      expect(cleanedPoint1.roomIds.has(invalidRoom.id)).toBe(false)
      expect(cleanedPoint2.roomIds.has(invalidRoom.id)).toBe(false)
    })
  })

  describe('determineRoomSideOfWall', () => {
    it('should correctly determine room is on left side of wall', () => {
      const state = createEmptyModelState()
      const floorId = Array.from(state.floors.keys())[0]

      // Create a simple L-shaped configuration
      const point1 = createPoint(createPoint2D(0, 0)) // bottom-left
      const point2 = createPoint(createPoint2D(1000, 0)) // bottom-right
      const point3 = createPoint(createPoint2D(1000, 1000)) // top-right

      let updatedState = addPointToFloor(state, point1, floorId)
      updatedState = addPointToFloor(updatedState, point2, floorId)
      updatedState = addPointToFloor(updatedState, point3, floorId)

      // Wall going from left to right (bottom edge)
      const wall = createWall(point1.id, point2.id, createLength(3000), createLength(3000), createLength(200))
      updatedState = addWallToFloor(updatedState, wall, floorId, false)

      // Room above the wall (should be on the left side)
      const room = createRoom('Test Room', [wall.id], [point1.id, point2.id, point3.id])

      const side = determineRoomSideOfWall(room, wall, updatedState)
      expect(side).toBe('left')
    })

    it('should correctly determine room is on right side of wall', () => {
      const state = createEmptyModelState()
      const floorId = Array.from(state.floors.keys())[0]

      // Create a simple L-shaped configuration
      const point1 = createPoint(createPoint2D(0, 0)) // bottom-left
      const point2 = createPoint(createPoint2D(1000, 0)) // bottom-right
      const point3 = createPoint(createPoint2D(1000, -1000)) // bottom-right-down

      let updatedState = addPointToFloor(state, point1, floorId)
      updatedState = addPointToFloor(updatedState, point2, floorId)
      updatedState = addPointToFloor(updatedState, point3, floorId)

      // Wall going from left to right (top edge)
      const wall = createWall(point1.id, point2.id, createLength(3000), createLength(3000), createLength(200))
      updatedState = addWallToFloor(updatedState, wall, floorId, false)

      // Room below the wall (should be on the right side)
      const room = createRoom('Test Room', [wall.id], [point1.id, point2.id, point3.id])

      const side = determineRoomSideOfWall(room, wall, updatedState)
      expect(side).toBe('right')
    })
  })

  describe('ensureCorrectWallRoomAssignments', () => {
    it('should assign single room to correct side based on geometry', () => {
      const state = createEmptyModelState()
      const floorId = Array.from(state.floors.keys())[0]

      // Create a rectangular room
      const point1 = createPoint(createPoint2D(0, 0))
      const point2 = createPoint(createPoint2D(1000, 0))
      const point3 = createPoint(createPoint2D(1000, 1000))
      const point4 = createPoint(createPoint2D(0, 1000))

      let updatedState = addPointToFloor(state, point1, floorId)
      updatedState = addPointToFloor(updatedState, point2, floorId)
      updatedState = addPointToFloor(updatedState, point3, floorId)
      updatedState = addPointToFloor(updatedState, point4, floorId)

      const wall1 = createWall(point1.id, point2.id, createLength(3000), createLength(3000), createLength(200))
      const wall2 = createWall(point2.id, point3.id, createLength(3000), createLength(3000), createLength(200))
      const wall3 = createWall(point3.id, point4.id, createLength(3000), createLength(3000), createLength(200))
      const wall4 = createWall(point4.id, point1.id, createLength(3000), createLength(3000), createLength(200))

      updatedState = addWallToFloor(updatedState, wall1, floorId, false)
      updatedState = addWallToFloor(updatedState, wall2, floorId, false)
      updatedState = addWallToFloor(updatedState, wall3, floorId, false)
      updatedState = addWallToFloor(updatedState, wall4, floorId, false)

      const room = createRoom('Test Room', [wall1.id, wall2.id, wall3.id, wall4.id], [point1.id, point2.id, point3.id, point4.id])
      updatedState = addRoomToFloor(updatedState, room, floorId)

      // Manually mess up wall assignments
      const messedUpWall = { ...wall1, leftRoomId: undefined, rightRoomId: room.id }
      updatedState.walls.set(wall1.id, messedUpWall)

      // Fix assignments
      const fixedState = ensureCorrectWallRoomAssignments(updatedState, floorId)

      // Verify bottom wall (going left to right) has room on the left (above it)
      const fixedWall = fixedState.walls.get(wall1.id)!
      expect(fixedWall.leftRoomId).toBe(room.id)
      expect(fixedWall.rightRoomId).toBeUndefined()
    })

    it('should handle two rooms sharing a wall', () => {
      const state = createEmptyModelState()
      const floorId = Array.from(state.floors.keys())[0]

      // Create two adjacent rectangular rooms with shared wall
      const point1 = createPoint(createPoint2D(0, 0)) // left bottom
      const point2 = createPoint(createPoint2D(500, 0)) // middle bottom
      const point3 = createPoint(createPoint2D(1000, 0)) // right bottom
      const point4 = createPoint(createPoint2D(1000, 1000)) // right top
      const point5 = createPoint(createPoint2D(500, 1000)) // middle top
      const point6 = createPoint(createPoint2D(0, 1000)) // left top

      let updatedState = addPointToFloor(state, point1, floorId)
      updatedState = addPointToFloor(updatedState, point2, floorId)
      updatedState = addPointToFloor(updatedState, point3, floorId)
      updatedState = addPointToFloor(updatedState, point4, floorId)
      updatedState = addPointToFloor(updatedState, point5, floorId)
      updatedState = addPointToFloor(updatedState, point6, floorId)

      // Left room walls
      const leftWall1 = createWall(point1.id, point2.id, createLength(3000), createLength(3000), createLength(200))
      const leftWall2 = createWall(point2.id, point5.id, createLength(3000), createLength(3000), createLength(200)) // shared
      const leftWall3 = createWall(point5.id, point6.id, createLength(3000), createLength(3000), createLength(200))
      const leftWall4 = createWall(point6.id, point1.id, createLength(3000), createLength(3000), createLength(200))

      // Right room walls
      const rightWall1 = createWall(point2.id, point3.id, createLength(3000), createLength(3000), createLength(200))
      const rightWall2 = createWall(point3.id, point4.id, createLength(3000), createLength(3000), createLength(200))
      const rightWall3 = createWall(point4.id, point5.id, createLength(3000), createLength(3000), createLength(200))
      // rightWall4 is the same as leftWall2 (shared wall)

      updatedState = addWallToFloor(updatedState, leftWall1, floorId, false)
      updatedState = addWallToFloor(updatedState, leftWall2, floorId, false)
      updatedState = addWallToFloor(updatedState, leftWall3, floorId, false)
      updatedState = addWallToFloor(updatedState, leftWall4, floorId, false)
      updatedState = addWallToFloor(updatedState, rightWall1, floorId, false)
      updatedState = addWallToFloor(updatedState, rightWall2, floorId, false)
      updatedState = addWallToFloor(updatedState, rightWall3, floorId, false)

      const leftRoom = createRoom('Left Room', [leftWall1.id, leftWall2.id, leftWall3.id, leftWall4.id], [point1.id, point2.id, point5.id, point6.id])
      const rightRoom = createRoom('Right Room', [rightWall1.id, leftWall2.id, rightWall2.id, rightWall3.id], [point2.id, point3.id, point4.id, point5.id])

      updatedState = addRoomToFloor(updatedState, leftRoom, floorId)
      updatedState = addRoomToFloor(updatedState, rightRoom, floorId)

      // Ensure assignments are correct
      const fixedState = ensureCorrectWallRoomAssignments(updatedState, floorId)

      // Check shared wall (vertical, going from bottom to top)
      const sharedWall = fixedState.walls.get(leftWall2.id)!
      // Left room should be on left side, right room on right side
      expect(sharedWall.leftRoomId).toBe(leftRoom.id)
      expect(sharedWall.rightRoomId).toBe(rightRoom.id)
    })
  })

  describe('updateRoomsAfterWallChange', () => {
    it('should remove invalid rooms after wall deletion', () => {
      const state = createEmptyModelState()
      const floorId = Array.from(state.floors.keys())[0]

      // Create a complete rectangular room
      const point1 = createPoint(createPoint2D(0, 0))
      const point2 = createPoint(createPoint2D(1000, 0))
      const point3 = createPoint(createPoint2D(1000, 1000))
      const point4 = createPoint(createPoint2D(0, 1000))

      let updatedState = addPointToFloor(state, point1, floorId)
      updatedState = addPointToFloor(updatedState, point2, floorId)
      updatedState = addPointToFloor(updatedState, point3, floorId)
      updatedState = addPointToFloor(updatedState, point4, floorId)

      const wall1 = createWall(point1.id, point2.id, createLength(3000), createLength(3000), createLength(200))
      const wall2 = createWall(point2.id, point3.id, createLength(3000), createLength(3000), createLength(200))
      const wall3 = createWall(point3.id, point4.id, createLength(3000), createLength(3000), createLength(200))
      const wall4 = createWall(point4.id, point1.id, createLength(3000), createLength(3000), createLength(200))

      updatedState = addWallToFloor(updatedState, wall1, floorId, false)
      updatedState = addWallToFloor(updatedState, wall2, floorId, false)
      updatedState = addWallToFloor(updatedState, wall3, floorId, false)
      updatedState = addWallToFloor(updatedState, wall4, floorId, false)

      const room = createRoom('Test Room', [wall1.id, wall2.id, wall3.id, wall4.id], [point1.id, point2.id, point3.id, point4.id])
      updatedState = addRoomToFloor(updatedState, room, floorId)

      // Verify room was created
      let floor = updatedState.floors.get(floorId)!
      expect(floor.roomIds).toContain(room.id)

      // Delete a wall to make the room invalid
      updatedState = { ...updatedState }
      updatedState.walls = new Map(updatedState.walls)
      updatedState.walls.delete(wall1.id)

      updatedState.floors = new Map(updatedState.floors)
      const updatedFloor = {
        ...floor,
        wallIds: floor.wallIds.filter(id => id !== wall1.id)
      }
      updatedState.floors.set(floorId, updatedFloor)

      // Update the room to reflect wall removal
      updatedState.rooms = new Map(updatedState.rooms)
      const updatedRoom = {
        ...room,
        wallIds: new Set(Array.from(room.wallIds).filter(id => id !== wall1.id))
      }
      updatedState.rooms.set(room.id, updatedRoom)

      // Update rooms after wall change
      const cleanedState = updateRoomsAfterWallChange(updatedState, floorId)

      // Room should be removed because it's no longer valid
      floor = cleanedState.floors.get(floorId)!
      expect(floor.roomIds).not.toContain(room.id)
      expect(cleanedState.rooms.has(room.id)).toBe(false)
    })
  })

  describe('cleanupModelConsistency', () => {
    it('should perform comprehensive cleanup across all floors', () => {
      const state = createEmptyModelState()
      const floorId = Array.from(state.floors.keys())[0]

      // Create a room with mixed up references
      const point1 = createPoint(createPoint2D(0, 0))
      const point2 = createPoint(createPoint2D(1000, 0))

      let updatedState = addPointToFloor(state, point1, floorId)
      updatedState = addPointToFloor(updatedState, point2, floorId)

      const wall1 = createWall(point1.id, point2.id, createLength(3000), createLength(3000), createLength(200))
      updatedState = addWallToFloor(updatedState, wall1, floorId, false)

      // Create an invalid room and manually corrupt references
      const invalidRoom = createRoom('Invalid Room', [wall1.id], [point1.id, point2.id])

      // Add manually without proper validation
      updatedState = { ...updatedState }
      updatedState.rooms = new Map(updatedState.rooms)
      updatedState.rooms.set(invalidRoom.id, invalidRoom)

      updatedState.floors = new Map(updatedState.floors)
      const floor = updatedState.floors.get(floorId)!
      updatedState.floors.set(floorId, {
        ...floor,
        roomIds: [...floor.roomIds, invalidRoom.id]
      })

      // Verify state is corrupted
      expect(updatedState.rooms.has(invalidRoom.id)).toBe(true)

      // Cleanup model
      const cleanedState = cleanupModelConsistency(updatedState)

      // Verify cleanup worked
      expect(cleanedState.rooms.has(invalidRoom.id)).toBe(false)
      const cleanedFloor = cleanedState.floors.get(floorId)!
      expect(cleanedFloor.roomIds).not.toContain(invalidRoom.id)
    })
  })

  describe('removeOrphanedReferences', () => {
    it('should remove wall references to deleted rooms', () => {
      const state = createEmptyModelState()
      const floorId = Array.from(state.floors.keys())[0]

      const point1 = createPoint(createPoint2D(0, 0))
      const point2 = createPoint(createPoint2D(1000, 0))

      let updatedState = addPointToFloor(state, point1, floorId)
      updatedState = addPointToFloor(updatedState, point2, floorId)

      const wall1 = createWall(point1.id, point2.id, createLength(3000), createLength(3000), createLength(200))
      updatedState = addWallToFloor(updatedState, wall1, floorId, false)

      const room = createRoom('Test Room', [wall1.id], [point1.id, point2.id])

      // Manually set up corrupted state - wall references room but room doesn't exist
      updatedState = { ...updatedState }
      updatedState.walls = new Map(updatedState.walls)
      const corruptedWall = { ...wall1, leftRoomId: room.id }
      updatedState.walls.set(wall1.id, corruptedWall)

      // Verify corruption
      const wallBefore = updatedState.walls.get(wall1.id)!
      expect(wallBefore.leftRoomId).toBe(room.id)
      expect(updatedState.rooms.has(room.id)).toBe(false)

      // Clean up orphaned references
      const cleanedState = removeOrphanedReferences(updatedState)

      // Verify cleanup
      const wallAfter = cleanedState.walls.get(wall1.id)!
      expect(wallAfter.leftRoomId).toBeUndefined()
    })

    it('should remove point references to deleted rooms', () => {
      const state = createEmptyModelState()
      const floorId = Array.from(state.floors.keys())[0]

      const point1 = createPoint(createPoint2D(0, 0))
      let updatedState = addPointToFloor(state, point1, floorId)

      const room = createRoom('Test Room', [], [point1.id])

      // Manually corrupt point to reference non-existent room
      updatedState = { ...updatedState }
      updatedState.points = new Map(updatedState.points)
      const corruptedPoint = {
        ...point1,
        roomIds: new Set([room.id])
      }
      updatedState.points.set(point1.id, corruptedPoint)

      // Verify corruption
      const pointBefore = updatedState.points.get(point1.id)!
      expect(pointBefore.roomIds.has(room.id)).toBe(true)
      expect(updatedState.rooms.has(room.id)).toBe(false)

      // Clean up orphaned references
      const cleanedState = removeOrphanedReferences(updatedState)

      // Verify cleanup
      const pointAfter = cleanedState.points.get(point1.id)!
      expect(pointAfter.roomIds.has(room.id)).toBe(false)
      expect(pointAfter.roomIds.size).toBe(0)
    })
  })
})
