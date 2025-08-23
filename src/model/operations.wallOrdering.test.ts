import { describe, it, expect } from 'vitest'
import {
  createEmptyModelState,
  addPointToFloor,
  addWallToFloor,
  addRoomToFloor,
  createPoint,
  createWall,
  createRoomFromWallsAndPoints,
  deleteWallWithRoomMerging,
  createOrderedMergedRoom,
  createOrderedRoomFromLoop
} from './operations'

import {
  createLength,
  createPoint2D
} from '@/types/geometry'

describe('Wall and Point Ordering in Rooms', () => {
  describe('createOrderedMergedRoom', () => {
    it('should create properly ordered walls and points when merging two rectangular rooms', () => {
      const state = createEmptyModelState()
      const floorId = Array.from(state.floors.keys())[0]

      // Create two rectangular rooms side by side:
      // Left room: p1-p2-p5-p6-p1
      // Right room: p2-p3-p4-p5-p2  
      // Shared wall: p2-p5

      const p1 = createPoint(createPoint2D(0, 0))
      const p2 = createPoint(createPoint2D(1000, 0))  // shared
      const p3 = createPoint(createPoint2D(2000, 0))
      const p4 = createPoint(createPoint2D(2000, 1000))
      const p5 = createPoint(createPoint2D(1000, 1000))  // shared
      const p6 = createPoint(createPoint2D(0, 1000))

      let updatedState = addPointToFloor(state, p1, floorId)
      updatedState = addPointToFloor(updatedState, p2, floorId)
      updatedState = addPointToFloor(updatedState, p3, floorId)
      updatedState = addPointToFloor(updatedState, p4, floorId)
      updatedState = addPointToFloor(updatedState, p5, floorId)
      updatedState = addPointToFloor(updatedState, p6, floorId)

      // Left room walls (clockwise: p1->p2->p5->p6->p1)
      const w1 = createWall(p1.id, p2.id, createLength(3000), createLength(3000), createLength(200)) // bottom
      const wShared = createWall(p2.id, p5.id, createLength(3000), createLength(3000), createLength(200)) // shared wall
      const w3 = createWall(p5.id, p6.id, createLength(3000), createLength(3000), createLength(200)) // top
      const w4 = createWall(p6.id, p1.id, createLength(3000), createLength(3000), createLength(200)) // left

      // Right room walls (clockwise: p2->p3->p4->p5->p2)
      const w5 = createWall(p2.id, p3.id, createLength(3000), createLength(3000), createLength(200)) // bottom
      const w6 = createWall(p3.id, p4.id, createLength(3000), createLength(3000), createLength(200)) // right
      const w7 = createWall(p4.id, p5.id, createLength(3000), createLength(3000), createLength(200)) // top

      updatedState = addWallToFloor(updatedState, w1, floorId, false)
      updatedState = addWallToFloor(updatedState, wShared, floorId, false)
      updatedState = addWallToFloor(updatedState, w3, floorId, false)
      updatedState = addWallToFloor(updatedState, w4, floorId, false)
      updatedState = addWallToFloor(updatedState, w5, floorId, false)
      updatedState = addWallToFloor(updatedState, w6, floorId, false)
      updatedState = addWallToFloor(updatedState, w7, floorId, false)

      // Create left and right rooms with proper clockwise ordering
      const leftRoom = createRoomFromWallsAndPoints(
        'Left Room',
        [w1.id, wShared.id, w3.id, w4.id], // clockwise order
        [p1.id, p2.id, p5.id, p6.id] // corresponding points
      )
      
      const rightRoom = createRoomFromWallsAndPoints(
        'Right Room', 
        [w5.id, w6.id, w7.id, wShared.id], // clockwise order
        [p2.id, p3.id, p4.id, p5.id] // corresponding points
      )

      // Test the ordering function
      const mergedRoomData = createOrderedMergedRoom(leftRoom, rightRoom, wShared.id, updatedState)

      // The merged room should have walls in clockwise order around the perimeter
      // Expected: [w1, w5, w6, w7, w3, w4] (going clockwise around the merged rectangle)
      // Expected points: [p1, p2, p3, p4, p5, p6] (corresponding to the walls)
      
      expect(mergedRoomData.wallIds).toHaveLength(6) // All walls except the shared one
      expect(mergedRoomData.pointIds).toHaveLength(6) // All points in order
      expect(mergedRoomData.wallIds).not.toContain(wShared.id) // Shared wall should be excluded

      // Verify the walls form a proper perimeter (each wall connects to the next)
      for (let i = 0; i < mergedRoomData.wallIds.length; i++) {
        const currentWallId = mergedRoomData.wallIds[i]
        const nextWallId = mergedRoomData.wallIds[(i + 1) % mergedRoomData.wallIds.length]
        const currentPointId = mergedRoomData.pointIds[i]
        const nextPointId = mergedRoomData.pointIds[(i + 1) % mergedRoomData.pointIds.length]
        
        const currentWall = updatedState.walls.get(currentWallId)
        const nextWall = updatedState.walls.get(nextWallId)
        
        expect(currentWall).toBeDefined()
        expect(nextWall).toBeDefined()
        
        // Current wall should connect the current point to some other point
        expect(
          currentWall!.startPointId === currentPointId || currentWall!.endPointId === currentPointId
        ).toBe(true)
        
        // Next wall should connect to the next point
        expect(
          nextWall!.startPointId === nextPointId || nextWall!.endPointId === nextPointId
        ).toBe(true)
      }
    })

    it('should handle the case where walls cannot form a complete ordered loop', () => {
      const state = createEmptyModelState()
      const floorId = Array.from(state.floors.keys())[0]

      // Create disconnected walls that don't form a proper loop
      const p1 = createPoint(createPoint2D(0, 0))
      const p2 = createPoint(createPoint2D(1000, 0))
      const p3 = createPoint(createPoint2D(2000, 0))
      const p4 = createPoint(createPoint2D(2000, 1000))

      let updatedState = addPointToFloor(state, p1, floorId)
      updatedState = addPointToFloor(updatedState, p2, floorId)
      updatedState = addPointToFloor(updatedState, p3, floorId)
      updatedState = addPointToFloor(updatedState, p4, floorId)

      // Create two disconnected walls
      const w1 = createWall(p1.id, p2.id, createLength(3000), createLength(3000), createLength(200))
      const w2 = createWall(p3.id, p4.id, createLength(3000), createLength(3000), createLength(200))

      updatedState = addWallToFloor(updatedState, w1, floorId, false)
      updatedState = addWallToFloor(updatedState, w2, floorId, false)

      // Create rooms with these disconnected walls (invalid)
      const room1 = createRoomFromWallsAndPoints('Room 1', [w1.id], [p1.id, p2.id])
      const room2 = createRoomFromWallsAndPoints('Room 2', [w2.id], [p3.id, p4.id])

      // Should fall back to concatenated arrays when ordering fails
      const mergedRoomData = createOrderedMergedRoom(room1, room2, w1.id, updatedState)

      expect(mergedRoomData.wallIds).toContain(w1.id)
      expect(mergedRoomData.wallIds).toContain(w2.id)
      expect(mergedRoomData.wallIds).toHaveLength(2)
    })
  })

  describe('createOrderedRoomFromLoop', () => {
    it('should create a room with properly ordered walls and points from a complete loop', () => {
      const state = createEmptyModelState()
      const floorId = Array.from(state.floors.keys())[0]

      // Create a square
      const p1 = createPoint(createPoint2D(0, 0))
      const p2 = createPoint(createPoint2D(1000, 0))
      const p3 = createPoint(createPoint2D(1000, 1000))
      const p4 = createPoint(createPoint2D(0, 1000))

      let updatedState = addPointToFloor(state, p1, floorId)
      updatedState = addPointToFloor(updatedState, p2, floorId)
      updatedState = addPointToFloor(updatedState, p3, floorId)
      updatedState = addPointToFloor(updatedState, p4, floorId)

      const w1 = createWall(p1.id, p2.id, createLength(3000), createLength(3000), createLength(200))
      const w2 = createWall(p2.id, p3.id, createLength(3000), createLength(3000), createLength(200))
      const w3 = createWall(p3.id, p4.id, createLength(3000), createLength(3000), createLength(200))
      const w4 = createWall(p4.id, p1.id, createLength(3000), createLength(3000), createLength(200))

      updatedState = addWallToFloor(updatedState, w1, floorId, false)
      updatedState = addWallToFloor(updatedState, w2, floorId, false)
      updatedState = addWallToFloor(updatedState, w3, floorId, false)
      updatedState = addWallToFloor(updatedState, w4, floorId, false)

      const room = createOrderedRoomFromLoop(w1.id, 'Test Room', updatedState)

      expect(room).not.toBeNull()
      expect(room!.wallIds).toHaveLength(4)
      expect(room!.pointIds).toHaveLength(4)

      // Verify the ordering - each wall should connect to the next
      for (let i = 0; i < room!.wallIds.length; i++) {
        const currentWallId = room!.wallIds[i]
        const nextWallId = room!.wallIds[(i + 1) % room!.wallIds.length]
        const currentPointId = room!.pointIds![i]

        const currentWall = updatedState.walls.get(currentWallId)
        const nextWall = updatedState.walls.get(nextWallId)

        expect(currentWall).toBeDefined()
        expect(nextWall).toBeDefined()

        // Current wall should include the current point
        expect(
          currentWall!.startPointId === currentPointId || currentWall!.endPointId === currentPointId
        ).toBe(true)
      }
    })

    it('should return null for incomplete loops', () => {
      const state = createEmptyModelState()
      const floorId = Array.from(state.floors.keys())[0]

      // Create an L-shape (incomplete loop)
      const p1 = createPoint(createPoint2D(0, 0))
      const p2 = createPoint(createPoint2D(1000, 0))
      const p3 = createPoint(createPoint2D(1000, 1000))

      let updatedState = addPointToFloor(state, p1, floorId)
      updatedState = addPointToFloor(updatedState, p2, floorId)
      updatedState = addPointToFloor(updatedState, p3, floorId)

      const w1 = createWall(p1.id, p2.id, createLength(3000), createLength(3000), createLength(200))
      const w2 = createWall(p2.id, p3.id, createLength(3000), createLength(3000), createLength(200))

      updatedState = addWallToFloor(updatedState, w1, floorId, false)
      updatedState = addWallToFloor(updatedState, w2, floorId, false)

      const room = createOrderedRoomFromLoop(w1.id, 'Test Room', updatedState)

      expect(room).toBeNull() // Should return null for incomplete loop
    })
  })

  describe('Integration test - room merging with proper ordering', () => {
    it('should maintain proper wall and point ordering when merging rooms via wall deletion', () => {
      const state = createEmptyModelState()
      const floorId = Array.from(state.floors.keys())[0]

      // Create two adjacent rectangular rooms
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
      const w1 = createWall(p1.id, p2.id, createLength(3000), createLength(3000), createLength(200))
      const wShared = createWall(p2.id, p5.id, createLength(3000), createLength(3000), createLength(200))
      const w3 = createWall(p5.id, p6.id, createLength(3000), createLength(3000), createLength(200))
      const w4 = createWall(p6.id, p1.id, createLength(3000), createLength(3000), createLength(200))
      const w5 = createWall(p2.id, p3.id, createLength(3000), createLength(3000), createLength(200))
      const w6 = createWall(p3.id, p4.id, createLength(3000), createLength(3000), createLength(200))
      const w7 = createWall(p4.id, p5.id, createLength(3000), createLength(3000), createLength(200))

      updatedState = addWallToFloor(updatedState, w1, floorId, false)
      updatedState = addWallToFloor(updatedState, wShared, floorId, false)
      updatedState = addWallToFloor(updatedState, w3, floorId, false)
      updatedState = addWallToFloor(updatedState, w4, floorId, false)
      updatedState = addWallToFloor(updatedState, w5, floorId, false)
      updatedState = addWallToFloor(updatedState, w6, floorId, false)
      updatedState = addWallToFloor(updatedState, w7, floorId, false)

      // Create rooms with proper room tracking
      const leftRoom = createRoomFromWallsAndPoints(
        'Left Room',
        [w1.id, wShared.id, w3.id, w4.id],
        [p1.id, p2.id, p5.id, p6.id]
      )
      const rightRoom = createRoomFromWallsAndPoints(
        'Right Room',
        [w5.id, w6.id, w7.id, wShared.id],
        [p2.id, p3.id, p4.id, p5.id]
      )

      updatedState = addRoomToFloor(updatedState, leftRoom, floorId)
      updatedState = addRoomToFloor(updatedState, rightRoom, floorId)

      // Set up proper room references on the shared wall
      updatedState.walls.set(wShared.id, {
        ...updatedState.walls.get(wShared.id)!,
        leftRoomId: leftRoom.id,
        rightRoomId: rightRoom.id
      })

      expect(updatedState.rooms.size).toBe(2)

      // Delete the shared wall - should merge the rooms with proper ordering
      const mergedState = deleteWallWithRoomMerging(updatedState, wShared.id, floorId)

      expect(mergedState.rooms.size).toBe(1)
      const mergedRoom = Array.from(mergedState.rooms.values())[0]

      // The merged room should have 6 walls (excluding the deleted shared wall)
      expect(mergedRoom.wallIds).toHaveLength(6)
      expect(mergedRoom.pointIds).toHaveLength(6)
      expect(mergedRoom.wallIds).not.toContain(wShared.id)

      // Verify that the walls and points are properly ordered around the perimeter
      for (let i = 0; i < mergedRoom.wallIds.length; i++) {
        const currentWallId = mergedRoom.wallIds[i]
        const currentPointId = mergedRoom.pointIds![i]

        const currentWall = mergedState.walls.get(currentWallId)
        expect(currentWall).toBeDefined()

        // Current wall should connect the current point to the next point or some other point
        const wallConnectsToCurrentPoint = (
          currentWall!.startPointId === currentPointId || currentWall!.endPointId === currentPointId
        )
        expect(wallConnectsToCurrentPoint).toBe(true)
      }
    })
  })
})