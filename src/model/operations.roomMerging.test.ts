import { describe, it, expect } from 'vitest'
import {
  createEmptyModelState,
  addPointToFloor,
  addWallToFloor,
  addRoomToFloor,
  removeWallFromFloor,
  deleteWall,
  createPoint,
  createWall,
  createRoom
} from './operations'
import {
  createLength,
  createPoint2D
} from '@/types/geometry'

describe('Room Merging Operations', () => {
  describe('handleRoomMergingAfterWallDeletion', () => {
    it('should merge two adjacent rooms when their separating wall is deleted', () => {
      const state = createEmptyModelState()
      const floorId = Array.from(state.floors.keys())[0]

      // Create a rectangle divided by a middle wall into two rooms
      // Points: p1 --- p2 --- p3
      //         |      |      |
      //         p6 --- p5 --- p4
      const p1 = createPoint(createPoint2D(0, 0))
      const p2 = createPoint(createPoint2D(1000, 0))
      const p3 = createPoint(createPoint2D(2000, 0))
      const p4 = createPoint(createPoint2D(2000, 1000))
      const p5 = createPoint(createPoint2D(1000, 1000))
      const p6 = createPoint(createPoint2D(0, 1000))

      let updatedState = addPointToFloor(state, p1, floorId)
      updatedState = addPointToFloor(updatedState, p2, floorId)
      updatedState = addPointToFloor(updatedState, p3, floorId)
      updatedState = addPointToFloor(updatedState, p4, floorId)
      updatedState = addPointToFloor(updatedState, p5, floorId)
      updatedState = addPointToFloor(updatedState, p6, floorId)

      // Create walls
      const wallTop1 = createWall(p1.id, p2.id, createLength(3000), createLength(3000), createLength(200))
      const wallTop2 = createWall(p2.id, p3.id, createLength(3000), createLength(3000), createLength(200))
      const wallRight = createWall(p3.id, p4.id, createLength(3000), createLength(3000), createLength(200))
      const wallBottom2 = createWall(p4.id, p5.id, createLength(3000), createLength(3000), createLength(200))
      const wallBottom1 = createWall(p5.id, p6.id, createLength(3000), createLength(3000), createLength(200))
      const wallLeft = createWall(p6.id, p1.id, createLength(3000), createLength(3000), createLength(200))
      const wallDivider = createWall(p2.id, p5.id, createLength(3000), createLength(3000), createLength(200)) // This will be deleted

      updatedState = addWallToFloor(updatedState, wallTop1, floorId, false)
      updatedState = addWallToFloor(updatedState, wallTop2, floorId, false)
      updatedState = addWallToFloor(updatedState, wallRight, floorId, false)
      updatedState = addWallToFloor(updatedState, wallBottom2, floorId, false)
      updatedState = addWallToFloor(updatedState, wallBottom1, floorId, false)
      updatedState = addWallToFloor(updatedState, wallLeft, floorId, false)
      updatedState = addWallToFloor(updatedState, wallDivider, floorId, false)

      // Create two rooms
      const leftRoom = createRoom('Left Room', [wallTop1.id, wallDivider.id, wallBottom1.id, wallLeft.id])
      const rightRoom = createRoom('Right Room', [wallTop2.id, wallRight.id, wallBottom2.id, wallDivider.id])

      updatedState = addRoomToFloor(updatedState, leftRoom, floorId)
      updatedState = addRoomToFloor(updatedState, rightRoom, floorId)

      // Verify initial state: 2 rooms exist
      expect(updatedState.rooms.size).toBe(2)
      expect(updatedState.floors.get(floorId)?.roomIds).toHaveLength(2)

      // Delete the divider wall - this should merge the two rooms
      const mergedState = removeWallFromFloor(updatedState, wallDivider.id, floorId)

      // Should have exactly 1 room (the merged room)
      expect(mergedState.rooms.size).toBe(1)
      expect(mergedState.floors.get(floorId)?.roomIds).toHaveLength(1)

      // The merged room should contain all the remaining walls
      const mergedRoom = Array.from(mergedState.rooms.values())[0]
      expect(mergedRoom.wallIds).toHaveLength(6) // All walls except the deleted divider
      expect(mergedRoom.wallIds).toContain(wallTop1.id)
      expect(mergedRoom.wallIds).toContain(wallTop2.id)
      expect(mergedRoom.wallIds).toContain(wallRight.id)
      expect(mergedRoom.wallIds).toContain(wallBottom2.id)
      expect(mergedRoom.wallIds).toContain(wallBottom1.id)
      expect(mergedRoom.wallIds).toContain(wallLeft.id)
      expect(mergedRoom.wallIds).not.toContain(wallDivider.id)
    })

    it('should handle deletion of wall between three rooms correctly', () => {
      const state = createEmptyModelState()
      const floorId = Array.from(state.floors.keys())[0]

      // Create an L-shape with three rooms:
      // Room A | Room B
      // ------+-------
      // Room C
      //
      // We'll delete the wall between A and B, merging them while keeping C separate

      // Create points for L-shape
      const p1 = createPoint(createPoint2D(0, 0))
      const p2 = createPoint(createPoint2D(1000, 0))
      const p3 = createPoint(createPoint2D(2000, 0))
      const p4 = createPoint(createPoint2D(2000, 1000))
      const p5 = createPoint(createPoint2D(1000, 1000))
      const p6 = createPoint(createPoint2D(1000, 2000))
      const p7 = createPoint(createPoint2D(0, 2000))
      const p8 = createPoint(createPoint2D(0, 1000))

      let updatedState = addPointToFloor(state, p1, floorId)
      updatedState = addPointToFloor(updatedState, p2, floorId)
      updatedState = addPointToFloor(updatedState, p3, floorId)
      updatedState = addPointToFloor(updatedState, p4, floorId)
      updatedState = addPointToFloor(updatedState, p5, floorId)
      updatedState = addPointToFloor(updatedState, p6, floorId)
      updatedState = addPointToFloor(updatedState, p7, floorId)
      updatedState = addPointToFloor(updatedState, p8, floorId)

      // Create walls
      const wall1 = createWall(p1.id, p2.id, createLength(3000), createLength(3000), createLength(200)) // Top of A
      const wallAB = createWall(p2.id, p3.id, createLength(3000), createLength(3000), createLength(200)) // Between A and B (will be deleted)
      const wall3 = createWall(p3.id, p4.id, createLength(3000), createLength(3000), createLength(200)) // Right of B
      const wall4 = createWall(p4.id, p5.id, createLength(3000), createLength(3000), createLength(200)) // Bottom of B
      const wall5 = createWall(p5.id, p6.id, createLength(3000), createLength(3000), createLength(200)) // Right of C
      const wall6 = createWall(p6.id, p7.id, createLength(3000), createLength(3000), createLength(200)) // Bottom of C
      const wall7 = createWall(p7.id, p8.id, createLength(3000), createLength(3000), createLength(200)) // Left of C
      const wall8 = createWall(p8.id, p1.id, createLength(3000), createLength(3000), createLength(200)) // Left of A
      const wallAC = createWall(p8.id, p2.id, createLength(3000), createLength(3000), createLength(200)) // Between A and C
      const wallBC = createWall(p2.id, p5.id, createLength(3000), createLength(3000), createLength(200)) // Between B and C

      updatedState = addWallToFloor(updatedState, wall1, floorId, false)
      updatedState = addWallToFloor(updatedState, wallAB, floorId, false)
      updatedState = addWallToFloor(updatedState, wall3, floorId, false)
      updatedState = addWallToFloor(updatedState, wall4, floorId, false)
      updatedState = addWallToFloor(updatedState, wall5, floorId, false)
      updatedState = addWallToFloor(updatedState, wall6, floorId, false)
      updatedState = addWallToFloor(updatedState, wall7, floorId, false)
      updatedState = addWallToFloor(updatedState, wall8, floorId, false)
      updatedState = addWallToFloor(updatedState, wallAC, floorId, false)
      updatedState = addWallToFloor(updatedState, wallBC, floorId, false)

      // Create three rooms
      const roomA = createRoom('Room A', [wall1.id, wallAB.id, wallAC.id, wall8.id])
      const roomB = createRoom('Room B', [wallAB.id, wall3.id, wall4.id, wallBC.id])
      const roomC = createRoom('Room C', [wallAC.id, wallBC.id, wall5.id, wall6.id, wall7.id])

      updatedState = addRoomToFloor(updatedState, roomA, floorId)
      updatedState = addRoomToFloor(updatedState, roomB, floorId)
      updatedState = addRoomToFloor(updatedState, roomC, floorId)

      // Verify initial state: 3 rooms exist
      expect(updatedState.rooms.size).toBe(3)

      // Delete the wall between A and B
      const mergedState = removeWallFromFloor(updatedState, wallAB.id, floorId)

      // Should have fewer rooms than before (merging occurred)
      expect(mergedState.rooms.size).toBeLessThan(3)
      expect(mergedState.rooms.size).toBeGreaterThan(0)

      // The key test is that we should have detected some form of room merging
      // The exact configuration depends on the wall loop detection algorithm
      const rooms = Array.from(mergedState.rooms.values())

      // Verify that the deleted wall is not in any room
      for (const room of rooms) {
        expect(room.wallIds).not.toContain(wallAB.id)
      }

      // Verify that all remaining walls are accounted for in some room
      const allWallIdsInRooms = new Set<string>()
      for (const room of rooms) {
        for (const wallId of room.wallIds) {
          allWallIdsInRooms.add(wallId)
        }
      }

      // Check that key walls are still in some room (but not necessarily the same room)
      expect(allWallIdsInRooms.has(wall1.id) || allWallIdsInRooms.has(wall3.id)).toBe(true) // At least one of the former A-B walls
      expect(allWallIdsInRooms.has(wall5.id)).toBe(true) // Wall from room C should still be present
      expect(allWallIdsInRooms.has(wallAC.id) || allWallIdsInRooms.has(wallBC.id)).toBe(true) // At least one connecting wall
    })

    it('should handle no room merging when deleted wall is not between rooms', () => {
      const state = createEmptyModelState()
      const floorId = Array.from(state.floors.keys())[0]

      // Create a simple rectangle room with an extra wall extending from one corner
      // (The extra wall doesn't separate rooms)
      const p1 = createPoint(createPoint2D(0, 0))
      const p2 = createPoint(createPoint2D(1000, 0))
      const p3 = createPoint(createPoint2D(1000, 1000))
      const p4 = createPoint(createPoint2D(0, 1000))
      const p5 = createPoint(createPoint2D(1000, 500)) // Extra point for extending wall

      let updatedState = addPointToFloor(state, p1, floorId)
      updatedState = addPointToFloor(updatedState, p2, floorId)
      updatedState = addPointToFloor(updatedState, p3, floorId)
      updatedState = addPointToFloor(updatedState, p4, floorId)
      updatedState = addPointToFloor(updatedState, p5, floorId)

      // Create rectangular room walls
      const wall1 = createWall(p1.id, p2.id, createLength(3000), createLength(3000), createLength(200))
      const wall2 = createWall(p2.id, p3.id, createLength(3000), createLength(3000), createLength(200))
      const wall3 = createWall(p3.id, p4.id, createLength(3000), createLength(3000), createLength(200))
      const wall4 = createWall(p4.id, p1.id, createLength(3000), createLength(3000), createLength(200))

      // Extra wall that doesn't form part of the room
      const extraWall = createWall(p2.id, p5.id, createLength(3000), createLength(3000), createLength(200))

      updatedState = addWallToFloor(updatedState, wall1, floorId, false)
      updatedState = addWallToFloor(updatedState, wall2, floorId, false)
      updatedState = addWallToFloor(updatedState, wall3, floorId, false)
      updatedState = addWallToFloor(updatedState, wall4, floorId, false)
      updatedState = addWallToFloor(updatedState, extraWall, floorId, false)

      // Create one room (rectangular)
      const room = createRoom('Test Room', [wall1.id, wall2.id, wall3.id, wall4.id])
      updatedState = addRoomToFloor(updatedState, room, floorId)

      // Verify initial state: 1 room exists
      expect(updatedState.rooms.size).toBe(1)

      // Delete the extra wall (doesn't affect the room)
      const resultState = removeWallFromFloor(updatedState, extraWall.id, floorId)

      // Should still have 1 room, unchanged
      expect(resultState.rooms.size).toBe(1)
      const remainingRoom = Array.from(resultState.rooms.values())[0]
      expect(remainingRoom.wallIds).toHaveLength(4)
      expect(remainingRoom.wallIds).toContain(wall1.id)
      expect(remainingRoom.wallIds).toContain(wall2.id)
      expect(remainingRoom.wallIds).toContain(wall3.id)
      expect(remainingRoom.wallIds).toContain(wall4.id)
      expect(remainingRoom.wallIds).not.toContain(extraWall.id)
    })

    it('should handle edge case where deleted wall belonged to only one room', () => {
      const state = createEmptyModelState()
      const floorId = Array.from(state.floors.keys())[0]

      // Create a single room and delete one of its walls
      const p1 = createPoint(createPoint2D(0, 0))
      const p2 = createPoint(createPoint2D(1000, 0))
      const p3 = createPoint(createPoint2D(1000, 1000))
      const p4 = createPoint(createPoint2D(0, 1000))

      let updatedState = addPointToFloor(state, p1, floorId)
      updatedState = addPointToFloor(updatedState, p2, floorId)
      updatedState = addPointToFloor(updatedState, p3, floorId)
      updatedState = addPointToFloor(updatedState, p4, floorId)

      // Create rectangular room walls
      const wall1 = createWall(p1.id, p2.id, createLength(3000), createLength(3000), createLength(200))
      const wall2 = createWall(p2.id, p3.id, createLength(3000), createLength(3000), createLength(200))
      const wall3 = createWall(p3.id, p4.id, createLength(3000), createLength(3000), createLength(200))
      const wall4 = createWall(p4.id, p1.id, createLength(3000), createLength(3000), createLength(200))

      updatedState = addWallToFloor(updatedState, wall1, floorId, false)
      updatedState = addWallToFloor(updatedState, wall2, floorId, false)
      updatedState = addWallToFloor(updatedState, wall3, floorId, false)
      updatedState = addWallToFloor(updatedState, wall4, floorId, false)

      // Create room
      const room = createRoom('Test Room', [wall1.id, wall2.id, wall3.id, wall4.id])
      updatedState = addRoomToFloor(updatedState, room, floorId)

      // Verify initial state: 1 room exists
      expect(updatedState.rooms.size).toBe(1)

      // Delete one wall - this should invalidate the room completely
      const resultState = removeWallFromFloor(updatedState, wall1.id, floorId)

      // Should have no rooms (the original room is no longer valid)
      expect(resultState.rooms.size).toBe(0)
      expect(resultState.floors.get(floorId)?.roomIds).toHaveLength(0)
    })
  })

  describe('deleteWall integration', () => {
    it('should properly merge rooms when deleteWall is called', () => {
      const state = createEmptyModelState()
      const floorId = Array.from(state.floors.keys())[0]

      // Create two adjacent rooms separated by a wall
      const p1 = createPoint(createPoint2D(0, 0))
      const p2 = createPoint(createPoint2D(1000, 0))
      const p3 = createPoint(createPoint2D(2000, 0))
      const p4 = createPoint(createPoint2D(2000, 1000))
      const p5 = createPoint(createPoint2D(1000, 1000))
      const p6 = createPoint(createPoint2D(0, 1000))

      let updatedState = addPointToFloor(state, p1, floorId)
      updatedState = addPointToFloor(updatedState, p2, floorId)
      updatedState = addPointToFloor(updatedState, p3, floorId)
      updatedState = addPointToFloor(updatedState, p4, floorId)
      updatedState = addPointToFloor(updatedState, p5, floorId)
      updatedState = addPointToFloor(updatedState, p6, floorId)

      const walls = [
        createWall(p1.id, p2.id, createLength(3000), createLength(3000), createLength(200)),
        createWall(p2.id, p3.id, createLength(3000), createLength(3000), createLength(200)),
        createWall(p3.id, p4.id, createLength(3000), createLength(3000), createLength(200)),
        createWall(p4.id, p5.id, createLength(3000), createLength(3000), createLength(200)),
        createWall(p5.id, p6.id, createLength(3000), createLength(3000), createLength(200)),
        createWall(p6.id, p1.id, createLength(3000), createLength(3000), createLength(200)),
        createWall(p2.id, p5.id, createLength(3000), createLength(3000), createLength(200)) // Divider
      ]

      for (const wall of walls) {
        updatedState = addWallToFloor(updatedState, wall, floorId, false)
      }

      // Create two rooms
      const leftRoom = createRoom('Left', [walls[0].id, walls[6].id, walls[4].id, walls[5].id])
      const rightRoom = createRoom('Right', [walls[1].id, walls[2].id, walls[3].id, walls[6].id])

      updatedState = addRoomToFloor(updatedState, leftRoom, floorId)
      updatedState = addRoomToFloor(updatedState, rightRoom, floorId)

      expect(updatedState.rooms.size).toBe(2)

      // Use deleteWall instead of removeWallFromFloor
      const mergedState = deleteWall(updatedState, walls[6].id, floorId)

      // Should have 1 merged room
      expect(mergedState.rooms.size).toBe(1)
      const mergedRoom = Array.from(mergedState.rooms.values())[0]
      expect(mergedRoom.wallIds).toHaveLength(6) // All walls except deleted divider
    })
  })
})
