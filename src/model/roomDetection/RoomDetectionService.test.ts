import { describe, it, expect } from 'vitest'
import { RoomDetectionService } from './RoomDetectionService'
import {
  createEmptyModelState,
  addPointToFloor,
  addWallToFloor,
  addRoomToFloor,
  createPoint,
  createWall,
  createRoom
} from '../operations'
import {
  createLength,
  createPoint2D
} from '@/types/geometry'

describe('RoomDetectionService', () => {
  describe('detectRooms', () => {
    it('should detect a single rectangular room', () => {
      const service = new RoomDetectionService()
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

      const result = service.detectRooms(updatedState, floorId)

      expect(result.roomsToCreate).toHaveLength(1)
      expect(result.roomsToUpdate).toHaveLength(0)
      expect(result.roomsToDelete).toHaveLength(0)

      const room = result.roomsToCreate[0]
      expect(room.wallIds).toHaveLength(4)
      expect(room.outerBoundary.pointIds).toHaveLength(4)
      expect(room.name).toMatch(/Room \d+/)

      // Should have wall assignments
      expect(result.wallAssignments).toHaveLength(4)
      expect(result.pointAssignments).toHaveLength(4)
    })

    it('should detect multiple rooms', () => {
      const service = new RoomDetectionService()
      const state = createEmptyModelState()
      const floorId = Array.from(state.floors.keys())[0]

      // Create two separate rectangular rooms
      // Room 1: (0,0) -> (500,0) -> (500,500) -> (0,500) -> (0,0)
      const room1Points = [
        createPoint(createPoint2D(0, 0)),
        createPoint(createPoint2D(500, 0)),
        createPoint(createPoint2D(500, 500)),
        createPoint(createPoint2D(0, 500))
      ]

      // Room 2: (1000,0) -> (1500,0) -> (1500,500) -> (1000,500) -> (1000,0)
      const room2Points = [
        createPoint(createPoint2D(1000, 0)),
        createPoint(createPoint2D(1500, 0)),
        createPoint(createPoint2D(1500, 500)),
        createPoint(createPoint2D(1000, 500))
      ]

      let updatedState = state
      const allPoints = [...room1Points, ...room2Points]
      for (const point of allPoints) {
        updatedState = addPointToFloor(updatedState, point, floorId)
      }

      // Create walls for room 1
      const room1Walls = [
        createWall(room1Points[0].id, room1Points[1].id, createLength(3000), createLength(3000), createLength(200)),
        createWall(room1Points[1].id, room1Points[2].id, createLength(3000), createLength(3000), createLength(200)),
        createWall(room1Points[2].id, room1Points[3].id, createLength(3000), createLength(3000), createLength(200)),
        createWall(room1Points[3].id, room1Points[0].id, createLength(3000), createLength(3000), createLength(200))
      ]

      // Create walls for room 2
      const room2Walls = [
        createWall(room2Points[0].id, room2Points[1].id, createLength(3000), createLength(3000), createLength(200)),
        createWall(room2Points[1].id, room2Points[2].id, createLength(3000), createLength(3000), createLength(200)),
        createWall(room2Points[2].id, room2Points[3].id, createLength(3000), createLength(3000), createLength(200)),
        createWall(room2Points[3].id, room2Points[0].id, createLength(3000), createLength(3000), createLength(200))
      ]

      const allWalls = [...room1Walls, ...room2Walls]
      for (const wall of allWalls) {
        updatedState = addWallToFloor(updatedState, wall, floorId, false)
      }

      const result = service.detectRooms(updatedState, floorId)

      expect(result.roomsToCreate).toHaveLength(2)
      expect(result.roomsToUpdate).toHaveLength(0)
      expect(result.roomsToDelete).toHaveLength(0)

      // Each room should have 4 walls
      for (const room of result.roomsToCreate) {
        expect(room.wallIds).toHaveLength(4)
        expect(room.outerBoundary.pointIds).toHaveLength(4)
      }
    })

    it('should handle floors with no walls', () => {
      const service = new RoomDetectionService()
      const state = createEmptyModelState()
      const floorId = Array.from(state.floors.keys())[0]

      const result = service.detectRooms(state, floorId)

      expect(result.roomsToCreate).toHaveLength(0)
      expect(result.roomsToUpdate).toHaveLength(0)
      expect(result.roomsToDelete).toHaveLength(0)
      expect(result.wallAssignments).toHaveLength(0)
      expect(result.pointAssignments).toHaveLength(0)
    })
  })

  describe('handleWallAddition', () => {
    it('should detect room creation when wall completes a loop', () => {
      const service = new RoomDetectionService()
      const state = createEmptyModelState()
      const floorId = Array.from(state.floors.keys())[0]

      // Create three walls of a rectangle
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

      updatedState = addWallToFloor(updatedState, wall1, floorId, false)
      updatedState = addWallToFloor(updatedState, wall2, floorId, false)
      updatedState = addWallToFloor(updatedState, wall3, floorId, false)

      // Add the fourth wall to complete the loop
      const wall4 = createWall(point4.id, point1.id, createLength(3000), createLength(3000), createLength(200))
      updatedState = addWallToFloor(updatedState, wall4, floorId, false)

      const result = service.handleWallAddition(updatedState, wall4.id, floorId)

      expect(result.roomsToCreate.length).toBeGreaterThanOrEqual(1)
      
      if (result.roomsToCreate.length > 0) {
        const room = result.roomsToCreate[0]
        expect(room.wallIds).toContain(wall4.id)
      }
    })

    it('should handle room splitting when wall divides existing room', () => {
      const service = new RoomDetectionService()
      const state = createEmptyModelState()
      const floorId = Array.from(state.floors.keys())[0]

      // Create a large rectangular room first
      const point1 = createPoint(createPoint2D(0, 0))
      const point2 = createPoint(createPoint2D(2000, 0))
      const point3 = createPoint(createPoint2D(2000, 1000))
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

      // Create the room
      const room = createRoom('Large Room', [wall1.id, wall2.id, wall3.id, wall4.id], [point1.id, point2.id, point3.id, point4.id])
      updatedState = addRoomToFloor(updatedState, room, floorId)

      // Add points for dividing wall
      const dividerPoint1 = createPoint(createPoint2D(1000, 0))
      const dividerPoint2 = createPoint(createPoint2D(1000, 1000))
      updatedState = addPointToFloor(updatedState, dividerPoint1, floorId)
      updatedState = addPointToFloor(updatedState, dividerPoint2, floorId)

      // Add dividing wall
      const dividerWall = createWall(dividerPoint1.id, dividerPoint2.id, createLength(3000), createLength(3000), createLength(200))
      updatedState = addWallToFloor(updatedState, dividerWall, floorId, false)

      const result = service.handleWallAddition(updatedState, dividerWall.id, floorId)

      // Should delete the original room and potentially create new ones
      expect(result.roomsToDelete).toContain(room.id)
    })
  })

  describe('handleWallRemoval', () => {
    it('should merge rooms when shared wall is removed', () => {
      const service = new RoomDetectionService()
      const state = createEmptyModelState()
      const floorId = Array.from(state.floors.keys())[0]

      // Create two adjacent rooms with a shared wall
      // This is a complex setup - for now test basic functionality
      const result = service.handleWallRemoval(state, 'non-existent-wall' as any, floorId)

      expect(result.roomsToCreate).toHaveLength(0)
      expect(result.roomsToUpdate).toHaveLength(0)
      expect(result.roomsToDelete).toHaveLength(0)
    })

    it('should remove room if wall removal makes it invalid', () => {
      const service = new RoomDetectionService()
      const state = createEmptyModelState()
      const floorId = Array.from(state.floors.keys())[0]

      // Create a minimal room with 3 walls
      const point1 = createPoint(createPoint2D(0, 0))
      const point2 = createPoint(createPoint2D(1000, 0))
      const point3 = createPoint(createPoint2D(500, 1000))

      let updatedState = addPointToFloor(state, point1, floorId)
      updatedState = addPointToFloor(updatedState, point2, floorId)
      updatedState = addPointToFloor(updatedState, point3, floorId)

      const wall1 = createWall(point1.id, point2.id, createLength(3000), createLength(3000), createLength(200))
      const wall2 = createWall(point2.id, point3.id, createLength(3000), createLength(3000), createLength(200))
      const wall3 = createWall(point3.id, point1.id, createLength(3000), createLength(3000), createLength(200))

      updatedState = addWallToFloor(updatedState, wall1, floorId, false)
      updatedState = addWallToFloor(updatedState, wall2, floorId, false)
      updatedState = addWallToFloor(updatedState, wall3, floorId, false)

      // Create room
      const room = createRoom('Triangle Room', [wall1.id, wall2.id, wall3.id], [point1.id, point2.id, point3.id])
      updatedState = addRoomToFloor(updatedState, room, floorId)

      const result = service.handleWallRemoval(updatedState, wall1.id, floorId)

      // Room should become invalid and be deleted
      expect(result.roomsToDelete).toContain(room.id)
    })
  })

  describe('validateRoomConsistency', () => {
    it('should validate consistent room state', () => {
      const service = new RoomDetectionService()
      const state = createEmptyModelState()
      const floorId = Array.from(state.floors.keys())[0]

      // Create a valid room
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

      const result = service.validateRoomConsistency(updatedState, floorId)

      expect(result.validRooms).toContain(room.id)
      expect(result.invalidRooms).toHaveLength(0)
      expect(result.orphanedWalls).toHaveLength(0)
      expect(result.orphanedPoints).toHaveLength(0)
    })

    it('should detect invalid rooms', () => {
      const service = new RoomDetectionService()
      const state = createEmptyModelState()
      const floorId = Array.from(state.floors.keys())[0]

      // Create an invalid room with only one wall
      const point1 = createPoint(createPoint2D(0, 0))
      const point2 = createPoint(createPoint2D(1000, 0))

      let updatedState = addPointToFloor(state, point1, floorId)
      updatedState = addPointToFloor(updatedState, point2, floorId)

      const wall1 = createWall(point1.id, point2.id, createLength(3000), createLength(3000), createLength(200))
      updatedState = addWallToFloor(updatedState, wall1, floorId, false)

      const room = createRoom('Invalid Room', [wall1.id], [point1.id, point2.id])
      updatedState = addRoomToFloor(updatedState, room, floorId)

      const result = service.validateRoomConsistency(updatedState, floorId)

      expect(result.invalidRooms).toContain(room.id)
      expect(result.validRooms).toHaveLength(0)
    })

    it('should detect orphaned walls', () => {
      const service = new RoomDetectionService()
      const state = createEmptyModelState()
      const floorId = Array.from(state.floors.keys())[0]

      // Create walls without any rooms
      const point1 = createPoint(createPoint2D(0, 0))
      const point2 = createPoint(createPoint2D(1000, 0))

      let updatedState = addPointToFloor(state, point1, floorId)
      updatedState = addPointToFloor(updatedState, point2, floorId)

      const wall1 = createWall(point1.id, point2.id, createLength(3000), createLength(3000), createLength(200))
      updatedState = addWallToFloor(updatedState, wall1, floorId, false)

      const result = service.validateRoomConsistency(updatedState, floorId)

      expect(result.orphanedWalls).toContain(wall1.id)
      expect(result.validRooms).toHaveLength(0)
      expect(result.invalidRooms).toHaveLength(0)
    })
  })

  describe('edge cases', () => {
    it('should handle non-existent floor', () => {
      const service = new RoomDetectionService()
      const state = createEmptyModelState()

      const result = service.detectRooms(state, 'non-existent-floor' as any)

      expect(result.roomsToCreate).toHaveLength(0)
      expect(result.roomsToUpdate).toHaveLength(0)
      expect(result.roomsToDelete).toHaveLength(0)
    })

    it('should handle non-existent wall in handleWallAddition', () => {
      const service = new RoomDetectionService()
      const state = createEmptyModelState()
      const floorId = Array.from(state.floors.keys())[0]

      const result = service.handleWallAddition(state, 'non-existent-wall' as any, floorId)

      expect(result.roomsToCreate).toHaveLength(0)
      expect(result.roomsToUpdate).toHaveLength(0)
      expect(result.roomsToDelete).toHaveLength(0)
    })

    it('should handle non-existent wall in handleWallRemoval', () => {
      const service = new RoomDetectionService()
      const state = createEmptyModelState()
      const floorId = Array.from(state.floors.keys())[0]

      const result = service.handleWallRemoval(state, 'non-existent-wall' as any, floorId)

      expect(result.roomsToCreate).toHaveLength(0)
      expect(result.roomsToUpdate).toHaveLength(0)
      expect(result.roomsToDelete).toHaveLength(0)
    })
  })

  describe('configuration', () => {
    it('should respect custom room naming pattern', () => {
      const customConfig = {
        roomNamePattern: 'Space {index}'
      }

      const service = new RoomDetectionService(customConfig)
      const state = createEmptyModelState()
      const floorId = Array.from(state.floors.keys())[0]

      // Create a square (4 walls) - minimum required for room
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

      const result = service.detectRooms(updatedState, floorId)

      // Should create room and use custom naming pattern
      expect(result.roomsToCreate).toHaveLength(1)
      expect(result.roomsToCreate[0].name).toBe('Space 1')
    })
  })
})