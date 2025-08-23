import { describe, it, expect } from 'vitest'
import {
  createEmptyModelState,
  addPointToFloor,
  addWallToFloor,
  createPoint,
  createWall,
  findWallLoops,
  isValidRoomLoop,
  updateRoomsAfterWallChange,
  findRoomsIntersectedByWall
} from './operations'
import {
  createLength,
  createPoint2D
} from '@/types/geometry'

describe('Room Management Operations', () => {
  describe('findWallLoops', () => {
    it('should find a simple rectangular loop', () => {
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

      const loops = findWallLoops(updatedState, floorId)
      expect(loops).toHaveLength(1)
      expect(loops[0]).toHaveLength(4)
      expect(loops[0]).toContain(wall1.id)
      expect(loops[0]).toContain(wall2.id)
      expect(loops[0]).toContain(wall3.id)
      expect(loops[0]).toContain(wall4.id)
    })

    it('should not find loops with incomplete walls', () => {
      const state = createEmptyModelState()
      const floorId = Array.from(state.floors.keys())[0]

      // Create three points for an incomplete rectangle
      const point1 = createPoint(createPoint2D(0, 0))
      const point2 = createPoint(createPoint2D(1000, 0))
      const point3 = createPoint(createPoint2D(1000, 1000))

      let updatedState = addPointToFloor(state, point1, floorId)
      updatedState = addPointToFloor(updatedState, point2, floorId)
      updatedState = addPointToFloor(updatedState, point3, floorId)

      // Create only two walls (incomplete loop)
      const wall1 = createWall(point1.id, point2.id, createLength(3000), createLength(3000), createLength(200))
      const wall2 = createWall(point2.id, point3.id, createLength(3000), createLength(3000), createLength(200))

      updatedState = addWallToFloor(updatedState, wall1, floorId, false)
      updatedState = addWallToFloor(updatedState, wall2, floorId, false)

      const loops = findWallLoops(updatedState, floorId)
      expect(loops).toHaveLength(0)
    })

    it('should find only minimal loops when walls create nested areas', () => {
      const state = createEmptyModelState()
      const floorId = Array.from(state.floors.keys())[0]

      // Create a large rectangle with a dividing wall in the middle
      // Points for the outer rectangle
      const point1 = createPoint(createPoint2D(0, 0))
      const point2 = createPoint(createPoint2D(2000, 0))
      const point3 = createPoint(createPoint2D(2000, 1000))
      const point4 = createPoint(createPoint2D(0, 1000))
      
      // Points for the dividing wall
      const point5 = createPoint(createPoint2D(1000, 0))
      const point6 = createPoint(createPoint2D(1000, 1000))

      let updatedState = addPointToFloor(state, point1, floorId)
      updatedState = addPointToFloor(updatedState, point2, floorId)
      updatedState = addPointToFloor(updatedState, point3, floorId)
      updatedState = addPointToFloor(updatedState, point4, floorId)
      updatedState = addPointToFloor(updatedState, point5, floorId)
      updatedState = addPointToFloor(updatedState, point6, floorId)

      // Create outer rectangle walls
      const wall1 = createWall(point1.id, point5.id, createLength(3000), createLength(3000), createLength(200)) // bottom left
      const wall2 = createWall(point5.id, point2.id, createLength(3000), createLength(3000), createLength(200)) // bottom right
      const wall3 = createWall(point2.id, point3.id, createLength(3000), createLength(3000), createLength(200)) // right
      const wall4 = createWall(point3.id, point6.id, createLength(3000), createLength(3000), createLength(200)) // top right
      const wall5 = createWall(point6.id, point4.id, createLength(3000), createLength(3000), createLength(200)) // top left
      const wall6 = createWall(point4.id, point1.id, createLength(3000), createLength(3000), createLength(200)) // left
      const wall7 = createWall(point5.id, point6.id, createLength(3000), createLength(3000), createLength(200)) // dividing wall

      updatedState = addWallToFloor(updatedState, wall1, floorId, false)
      updatedState = addWallToFloor(updatedState, wall2, floorId, false)
      updatedState = addWallToFloor(updatedState, wall3, floorId, false)
      updatedState = addWallToFloor(updatedState, wall4, floorId, false)
      updatedState = addWallToFloor(updatedState, wall5, floorId, false)
      updatedState = addWallToFloor(updatedState, wall6, floorId, false)
      updatedState = addWallToFloor(updatedState, wall7, floorId, false)

      const loops = findWallLoops(updatedState, floorId)
      
      // Should find exactly 2 minimal loops (left and right rooms), not the large outer loop
      expect(loops).toHaveLength(2)
      
      // Each loop should have 4 walls
      for (const loop of loops) {
        expect(loop).toHaveLength(4)
      }
      
      // One loop should be the left room: wall1, wall7, wall5, wall6
      const leftRoom = loops.find(loop => 
        loop.includes(wall1.id) && loop.includes(wall7.id) && 
        loop.includes(wall5.id) && loop.includes(wall6.id)
      )
      expect(leftRoom).toBeDefined()
      
      // Other loop should be the right room: wall2, wall3, wall4, wall7
      const rightRoom = loops.find(loop => 
        loop.includes(wall2.id) && loop.includes(wall3.id) && 
        loop.includes(wall4.id) && loop.includes(wall7.id)
      )
      expect(rightRoom).toBeDefined()
    })
  })

  describe('isValidRoomLoop', () => {
    it('should validate a proper rectangular loop', () => {
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

      const wallIds = [wall1.id, wall2.id, wall3.id, wall4.id]
      expect(isValidRoomLoop(wallIds, updatedState)).toBe(true)
    })

    it('should reject loops with too few walls', () => {
      const state = createEmptyModelState()
      const floorId = Array.from(state.floors.keys())[0]

      const point1 = createPoint(createPoint2D(0, 0))
      const point2 = createPoint(createPoint2D(1000, 0))

      let updatedState = addPointToFloor(state, point1, floorId)
      updatedState = addPointToFloor(updatedState, point2, floorId)

      const wall1 = createWall(point1.id, point2.id, createLength(3000), createLength(3000), createLength(200))
      updatedState = addWallToFloor(updatedState, wall1, floorId)

      expect(isValidRoomLoop([wall1.id], updatedState)).toBe(false)
    })
  })

  describe('updateRoomsAfterWallChange', () => {
    it('should create a room when walls form a complete loop', () => {
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

      // Add walls one by one - room should be created when the loop is complete
      const wall1 = createWall(point1.id, point2.id, createLength(3000), createLength(3000), createLength(200))
      const wall2 = createWall(point2.id, point3.id, createLength(3000), createLength(3000), createLength(200))
      const wall3 = createWall(point3.id, point4.id, createLength(3000), createLength(3000), createLength(200))

      updatedState = addWallToFloor(updatedState, wall1, floorId)
      updatedState = addWallToFloor(updatedState, wall2, floorId)
      updatedState = addWallToFloor(updatedState, wall3, floorId)

      // No room should exist yet
      const floor = updatedState.floors.get(floorId)!
      expect(floor.roomIds).toHaveLength(0)

      // Add the final wall to complete the loop
      const wall4 = createWall(point4.id, point1.id, createLength(3000), createLength(3000), createLength(200))
      updatedState = addWallToFloor(updatedState, wall4, floorId)

      // Room should now be created
      const updatedFloor = updatedState.floors.get(floorId)!
      expect(updatedFloor.roomIds).toHaveLength(1)

      const room = updatedState.rooms.get(updatedFloor.roomIds[0])!
      expect(room.wallIds).toHaveLength(4)
      expect(room.wallIds).toContain(wall1.id)
      expect(room.wallIds).toContain(wall2.id)
      expect(room.wallIds).toContain(wall3.id)
      expect(room.wallIds).toContain(wall4.id)
    })

    it('should remove rooms when walls are deleted', () => {
      const state = createEmptyModelState()
      const floorId = Array.from(state.floors.keys())[0]

      // Create a complete rectangular room first
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

      updatedState = addWallToFloor(updatedState, wall1, floorId)
      updatedState = addWallToFloor(updatedState, wall2, floorId)
      updatedState = addWallToFloor(updatedState, wall3, floorId)
      updatedState = addWallToFloor(updatedState, wall4, floorId)

      // Verify room was created
      let floor = updatedState.floors.get(floorId)!
      expect(floor.roomIds).toHaveLength(1)

      // Delete one wall to break the loop
      updatedState = updatedState.walls.delete(wall1.id) ? updatedState : updatedState
      updatedState = { ...updatedState }
      updatedState.walls = new Map(updatedState.walls)
      updatedState.walls.delete(wall1.id)

      const updatedFloor = {
        ...floor,
        wallIds: floor.wallIds.filter(id => id !== wall1.id)
      }
      updatedState.floors = new Map(updatedState.floors)
      updatedState.floors.set(floorId, updatedFloor)

      // Update rooms after wall removal
      updatedState = updateRoomsAfterWallChange(updatedState, floorId)

      // Room should be removed
      floor = updatedState.floors.get(floorId)!
      expect(floor.roomIds).toHaveLength(0)
    })
  })

  describe('findRoomsIntersectedByWall', () => {
    it('should detect when a wall would pass through a room', () => {
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

      updatedState = addWallToFloor(updatedState, wall1, floorId)
      updatedState = addWallToFloor(updatedState, wall2, floorId)
      updatedState = addWallToFloor(updatedState, wall3, floorId)
      updatedState = addWallToFloor(updatedState, wall4, floorId)

      // Create points for a wall that would pass through the middle of the room
      const dividerPoint1 = createPoint(createPoint2D(500, 0))
      const dividerPoint2 = createPoint(createPoint2D(500, 1000))

      updatedState = addPointToFloor(updatedState, dividerPoint1, floorId)
      updatedState = addPointToFloor(updatedState, dividerPoint2, floorId)

      const floor = updatedState.floors.get(floorId)!
      expect(floor.roomIds).toHaveLength(1)

      const intersectedRooms = findRoomsIntersectedByWall(
        updatedState,
        dividerPoint1.id,
        dividerPoint2.id,
        floorId
      )

      expect(intersectedRooms).toHaveLength(1)
      expect(intersectedRooms[0].id).toBe(floor.roomIds[0])
    })

    it('should not detect intersection for walls outside rooms', () => {
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

      updatedState = addWallToFloor(updatedState, wall1, floorId)
      updatedState = addWallToFloor(updatedState, wall2, floorId)
      updatedState = addWallToFloor(updatedState, wall3, floorId)
      updatedState = addWallToFloor(updatedState, wall4, floorId)

      // Create points for a wall outside the room
      const outsidePoint1 = createPoint(createPoint2D(1500, 0))
      const outsidePoint2 = createPoint(createPoint2D(1500, 1000))

      updatedState = addPointToFloor(updatedState, outsidePoint1, floorId)
      updatedState = addPointToFloor(updatedState, outsidePoint2, floorId)

      const intersectedRooms = findRoomsIntersectedByWall(
        updatedState,
        outsidePoint1.id,
        outsidePoint2.id,
        floorId
      )

      expect(intersectedRooms).toHaveLength(0)
    })
  })
})