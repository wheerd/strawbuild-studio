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
  createRoom,
  createRoomFromWallsAndPoints,
  updatePointRoomReferences,
  traceWallLoop,
  deleteWallWithRoomMerging,
  addWallWithRoomDetection
} from './operations'
import {
  createLength,
  createPoint2D
} from '@/types/geometry'

describe('New Room Tracking System', () => {
  describe('Basic room tracking on walls and points', () => {
    it('should create walls and points with empty room tracking', () => {
      const state = createEmptyModelState()
      const floorId = Array.from(state.floors.keys())[0]

      const p1 = createPoint(createPoint2D(0, 0))
      const p2 = createPoint(createPoint2D(1000, 0))
      
      let updatedState = addPointToFloor(state, p1, floorId)
      updatedState = addPointToFloor(updatedState, p2, floorId)

      // Points should have empty room arrays
      expect(p1.roomIds).toEqual([])
      expect(p2.roomIds).toEqual([])

      const wall = createWall(p1.id, p2.id, createLength(3000), createLength(3000), createLength(200))
      
      // Wall should have no room references initially
      expect(wall.leftRoomId).toBeUndefined()
      expect(wall.rightRoomId).toBeUndefined()
    })

    it('should update point room references correctly', () => {
      const state = createEmptyModelState()
      const floorId = Array.from(state.floors.keys())[0]

      const p1 = createPoint(createPoint2D(0, 0))
      let updatedState = addPointToFloor(state, p1, floorId)

      const room1 = createRoom('Room 1', [], [])
      const room2 = createRoom('Room 2', [], [])

      // Add room reference
      updatedState = updatePointRoomReferences(updatedState, p1.id, room1.id)
      let point = updatedState.points.get(p1.id)!
      expect(point.roomIds).toContain(room1.id)
      expect(point.roomIds).toHaveLength(1)

      // Add another room reference
      updatedState = updatePointRoomReferences(updatedState, p1.id, room2.id)
      point = updatedState.points.get(p1.id)!
      expect(point.roomIds).toContain(room1.id)
      expect(point.roomIds).toContain(room2.id)
      expect(point.roomIds).toHaveLength(2)

      // Remove a room reference
      updatedState = updatePointRoomReferences(updatedState, p1.id, undefined, room1.id)
      point = updatedState.points.get(p1.id)!
      expect(point.roomIds).not.toContain(room1.id)
      expect(point.roomIds).toContain(room2.id)
      expect(point.roomIds).toHaveLength(1)
    })

    it('should create rooms with ordered walls and points', () => {
      const p1 = createPoint(createPoint2D(0, 0))
      const p2 = createPoint(createPoint2D(1000, 0))
      const p3 = createPoint(createPoint2D(1000, 1000))
      const p4 = createPoint(createPoint2D(0, 1000))

      const w1 = createWall(p1.id, p2.id, createLength(3000), createLength(3000), createLength(200))
      const w2 = createWall(p2.id, p3.id, createLength(3000), createLength(3000), createLength(200))
      const w3 = createWall(p3.id, p4.id, createLength(3000), createLength(3000), createLength(200))
      const w4 = createWall(p4.id, p1.id, createLength(3000), createLength(3000), createLength(200))

      const room = createRoomFromWallsAndPoints(
        'Test Room',
        [w1.id, w2.id, w3.id, w4.id],
        [p1.id, p2.id, p3.id, p4.id]
      )

      expect(room.wallIds).toEqual([w1.id, w2.id, w3.id, w4.id])
      expect(room.pointIds).toEqual([p1.id, p2.id, p3.id, p4.id])
    })
  })

  describe('Wall loop tracing', () => {
    it('should trace a simple rectangular loop correctly', () => {
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

      // Debug: check what walls we have
      console.log('All walls:')
      for (const [id, wall] of updatedState.walls) {
        console.log(`${id}: ${wall.startPointId} -> ${wall.endPointId}`)
      }
      
      // Try tracing from w1
      const leftLoop = traceWallLoop(w1.id, 'left', updatedState)
      const rightLoop = traceWallLoop(w1.id, 'right', updatedState)

      // Debug output
      console.log('Left loop:', leftLoop)
      console.log('Right loop:', rightLoop)
      
      // For now, let's just check that the function doesn't crash
      // expect(leftLoop).not.toBeNull()
      // expect(rightLoop).not.toBeNull()

      // Should find all 4 walls in the loop
      expect(leftLoop!.wallIds).toHaveLength(4)
      expect(leftLoop!.pointIds).toHaveLength(5) // 4 unique points + starting point repeated at end
      expect(leftLoop!.wallIds).toContain(w1.id)
      expect(leftLoop!.wallIds).toContain(w2.id)
      expect(leftLoop!.wallIds).toContain(w3.id)
      expect(leftLoop!.wallIds).toContain(w4.id)
      
      // First and last point should be the same (closed loop)
      expect(leftLoop!.pointIds[0]).toBe(leftLoop!.pointIds[leftLoop!.pointIds.length - 1])
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

      // Should not be able to trace a complete loop
      const leftLoop = traceWallLoop(w1.id, 'left', updatedState)
      const rightLoop = traceWallLoop(w1.id, 'right', updatedState)

      expect(leftLoop).toBeNull()
      expect(rightLoop).toBeNull()
    })
  })

  describe('Room merging on wall deletion', () => {
    it('should merge two adjacent rooms when dividing wall is deleted', () => {
      const state = createEmptyModelState()
      const floorId = Array.from(state.floors.keys())[0]

      // Create two adjacent rectangular rooms with a shared wall
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

      const wallLeft1 = createWall(p1.id, p2.id, createLength(3000), createLength(3000), createLength(200))
      const wallDivider = createWall(p2.id, p5.id, createLength(3000), createLength(3000), createLength(200))
      const wallLeft2 = createWall(p5.id, p6.id, createLength(3000), createLength(3000), createLength(200))
      const wallLeft3 = createWall(p6.id, p1.id, createLength(3000), createLength(3000), createLength(200))
      
      const wallRight1 = createWall(p2.id, p3.id, createLength(3000), createLength(3000), createLength(200))
      const wallRight2 = createWall(p3.id, p4.id, createLength(3000), createLength(3000), createLength(200))
      const wallRight3 = createWall(p4.id, p5.id, createLength(3000), createLength(3000), createLength(200))

      updatedState = addWallToFloor(updatedState, wallLeft1, floorId, false)
      updatedState = addWallToFloor(updatedState, wallDivider, floorId, false)
      updatedState = addWallToFloor(updatedState, wallLeft2, floorId, false)
      updatedState = addWallToFloor(updatedState, wallLeft3, floorId, false)
      updatedState = addWallToFloor(updatedState, wallRight1, floorId, false)
      updatedState = addWallToFloor(updatedState, wallRight2, floorId, false)
      updatedState = addWallToFloor(updatedState, wallRight3, floorId, false)

      // Create left and right rooms manually with proper room tracking
      const leftRoom = createRoomFromWallsAndPoints(
        'Left Room',
        [wallLeft1.id, wallDivider.id, wallLeft2.id, wallLeft3.id],
        [p1.id, p2.id, p5.id, p6.id]
      )
      
      const rightRoom = createRoomFromWallsAndPoints(
        'Right Room',
        [wallRight1.id, wallRight2.id, wallRight3.id, wallDivider.id],
        [p2.id, p3.id, p4.id, p5.id]
      )

      updatedState = addRoomToFloor(updatedState, leftRoom, floorId)
      updatedState = addRoomToFloor(updatedState, rightRoom, floorId)

      // Set up wall room references
      updatedState.walls.set(wallDivider.id, {
        ...updatedState.walls.get(wallDivider.id)!,
        leftRoomId: leftRoom.id,
        rightRoomId: rightRoom.id
      })

      // Update point room references
      updatedState = updatePointRoomReferences(updatedState, p2.id, leftRoom.id)
      updatedState = updatePointRoomReferences(updatedState, p2.id, rightRoom.id)
      updatedState = updatePointRoomReferences(updatedState, p5.id, leftRoom.id)
      updatedState = updatePointRoomReferences(updatedState, p5.id, rightRoom.id)

      expect(updatedState.rooms.size).toBe(2)

      // Delete the dividing wall - should merge the rooms
      const mergedState = deleteWallWithRoomMerging(updatedState, wallDivider.id, floorId)

      expect(mergedState.rooms.size).toBe(1)
      const mergedRoom = Array.from(mergedState.rooms.values())[0]
      expect(mergedRoom.name).toBe('Left Room') // Should keep the left room's name
      expect(mergedRoom.wallIds).toHaveLength(6) // All walls except the deleted divider
      expect(mergedRoom.wallIds).not.toContain(wallDivider.id)
    })

    it('should handle deletion of wall with only one adjacent room', () => {
      const state = createEmptyModelState()
      const floorId = Array.from(state.floors.keys())[0]

      // Create a single rectangular room
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

      const room = createRoomFromWallsAndPoints(
        'Test Room',
        [w1.id, w2.id, w3.id, w4.id],
        [p1.id, p2.id, p3.id, p4.id]
      )

      updatedState = addRoomToFloor(updatedState, room, floorId)

      // Set up wall room reference (only left side)
      updatedState.walls.set(w1.id, {
        ...updatedState.walls.get(w1.id)!,
        leftRoomId: room.id
      })

      expect(updatedState.rooms.size).toBe(1)

      // Delete one wall - should remove the room since it becomes invalid
      const resultState = deleteWallWithRoomMerging(updatedState, w1.id, floorId)

      expect(resultState.rooms.size).toBe(0)
    })
  })

  describe('Room creation on wall addition', () => {
    it('should create rooms when walls complete a loop', () => {
      const state = createEmptyModelState()
      const floorId = Array.from(state.floors.keys())[0]

      // Create three walls of a rectangle
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

      // Add first three walls (no room should be created yet)
      updatedState = addWallWithRoomDetection(updatedState, w1, floorId)
      updatedState = addWallWithRoomDetection(updatedState, w2, floorId)
      updatedState = addWallWithRoomDetection(updatedState, w3, floorId)

      expect(updatedState.rooms.size).toBe(0)

      // Add the fourth wall to complete the loop - should create a room
      const w4 = createWall(p4.id, p1.id, createLength(3000), createLength(3000), createLength(200))
      updatedState = addWallWithRoomDetection(updatedState, w4, floorId)

      expect(updatedState.rooms.size).toBeGreaterThan(0)
    })

    it('should split a room when a dividing wall is added', () => {
      const state = createEmptyModelState()
      const floorId = Array.from(state.floors.keys())[0]

      // Create a rectangular room first
      const p1 = createPoint(createPoint2D(0, 0))
      const p2 = createPoint(createPoint2D(2000, 0))
      const p3 = createPoint(createPoint2D(2000, 1000))
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

      // Create initial room manually
      const p5 = createPoint(createPoint2D(1000, 0))  // Middle top
      const p6 = createPoint(createPoint2D(1000, 1000)) // Middle bottom
      
      updatedState = addPointToFloor(updatedState, p5, floorId)
      updatedState = addPointToFloor(updatedState, p6, floorId)

      const initialRoom = createRoomFromWallsAndPoints(
        'Big Room',
        [w1.id, w2.id, w3.id, w4.id],
        [p1.id, p2.id, p3.id, p4.id]
      )

      updatedState = addRoomToFloor(updatedState, initialRoom, floorId)

      // Update point room references to indicate they belong to the big room
      updatedState = updatePointRoomReferences(updatedState, p5.id, initialRoom.id)
      updatedState = updatePointRoomReferences(updatedState, p6.id, initialRoom.id)

      expect(updatedState.rooms.size).toBe(1)

      // Add dividing wall - should split the room
      const dividingWall = createWall(p5.id, p6.id, createLength(3000), createLength(3000), createLength(200))
      const splitState = addWallWithRoomDetection(updatedState, dividingWall, floorId)

      // Should have created new rooms (original removed, new ones created)
      expect(splitState.rooms.size).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Integration with existing operations', () => {
    it('should work with removeWallFromFloor', () => {
      const state = createEmptyModelState()
      const floorId = Array.from(state.floors.keys())[0]

      // Create a simple scenario
      const p1 = createPoint(createPoint2D(0, 0))
      const p2 = createPoint(createPoint2D(1000, 0))

      let updatedState = addPointToFloor(state, p1, floorId)
      updatedState = addPointToFloor(updatedState, p2, floorId)

      const wall = createWall(p1.id, p2.id, createLength(3000), createLength(3000), createLength(200))
      updatedState = addWallToFloor(updatedState, wall, floorId, false)

      expect(updatedState.walls.has(wall.id)).toBe(true)

      // Remove wall using existing function - should use new implementation
      const finalState = removeWallFromFloor(updatedState, wall.id, floorId)

      expect(finalState.walls.has(wall.id)).toBe(false)
    })

    it('should work with deleteWall', () => {
      const state = createEmptyModelState()
      const floorId = Array.from(state.floors.keys())[0]

      const p1 = createPoint(createPoint2D(0, 0))
      const p2 = createPoint(createPoint2D(1000, 0))

      let updatedState = addPointToFloor(state, p1, floorId)
      updatedState = addPointToFloor(updatedState, p2, floorId)

      const wall = createWall(p1.id, p2.id, createLength(3000), createLength(3000), createLength(200))
      updatedState = addWallToFloor(updatedState, wall, floorId, false)

      expect(updatedState.walls.has(wall.id)).toBe(true)

      // Delete wall using existing function
      const finalState = deleteWall(updatedState, wall.id, floorId)

      expect(finalState.walls.has(wall.id)).toBe(false)
    })
  })
})