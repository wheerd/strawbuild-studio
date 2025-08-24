import { describe, it, expect } from 'vitest'
import { RoomDetectionEngine } from './RoomDetectionEngine'
import {
  createEmptyModelState,
  addPointToFloor,
  addWallToFloor,
  createPoint,
  createWall
} from '../operations'
import {
  createLength,
  createPoint2D
} from '@/types/geometry'
import type { RoomDefinition } from './types'

describe('RoomDetectionEngine', () => {
  describe('findWallLoops', () => {
    it('should find a simple rectangular loop', () => {
      const engine = new RoomDetectionEngine()
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

      const loops = engine.findWallLoops(updatedState, floorId)
      expect(loops).toHaveLength(1)
      expect(loops[0]).toHaveLength(4)
      expect(loops[0]).toContain(wall1.id)
      expect(loops[0]).toContain(wall2.id)
      expect(loops[0]).toContain(wall3.id)
      expect(loops[0]).toContain(wall4.id)
    })

    it('should not find loops with incomplete walls', () => {
      const engine = new RoomDetectionEngine()
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

      const loops = engine.findWallLoops(updatedState, floorId)
      expect(loops).toHaveLength(0)
    })

    it('should find two separate loops', () => {
      const engine = new RoomDetectionEngine()
      const state = createEmptyModelState()
      const floorId = Array.from(state.floors.keys())[0]

      // Create two separate rectangles
      // First rectangle: (0,0) -> (500,0) -> (500,500) -> (0,500) -> (0,0)
      const rect1Points = [
        createPoint(createPoint2D(0, 0)),
        createPoint(createPoint2D(500, 0)),
        createPoint(createPoint2D(500, 500)),
        createPoint(createPoint2D(0, 500))
      ]

      // Second rectangle: (1000,0) -> (1500,0) -> (1500,500) -> (1000,500) -> (1000,0)
      const rect2Points = [
        createPoint(createPoint2D(1000, 0)),
        createPoint(createPoint2D(1500, 0)),
        createPoint(createPoint2D(1500, 500)),
        createPoint(createPoint2D(1000, 500))
      ]

      let updatedState = state
      const allPoints = [...rect1Points, ...rect2Points]
      for (const point of allPoints) {
        updatedState = addPointToFloor(updatedState, point, floorId)
      }

      // Create walls for first rectangle
      const rect1Walls = [
        createWall(rect1Points[0].id, rect1Points[1].id, createLength(3000), createLength(3000), createLength(200)),
        createWall(rect1Points[1].id, rect1Points[2].id, createLength(3000), createLength(3000), createLength(200)),
        createWall(rect1Points[2].id, rect1Points[3].id, createLength(3000), createLength(3000), createLength(200)),
        createWall(rect1Points[3].id, rect1Points[0].id, createLength(3000), createLength(3000), createLength(200))
      ]

      // Create walls for second rectangle
      const rect2Walls = [
        createWall(rect2Points[0].id, rect2Points[1].id, createLength(3000), createLength(3000), createLength(200)),
        createWall(rect2Points[1].id, rect2Points[2].id, createLength(3000), createLength(3000), createLength(200)),
        createWall(rect2Points[2].id, rect2Points[3].id, createLength(3000), createLength(3000), createLength(200)),
        createWall(rect2Points[3].id, rect2Points[0].id, createLength(3000), createLength(3000), createLength(200))
      ]

      const allWalls = [...rect1Walls, ...rect2Walls]
      for (const wall of allWalls) {
        updatedState = addWallToFloor(updatedState, wall, floorId, false)
      }

      const loops = engine.findWallLoops(updatedState, floorId)
      expect(loops).toHaveLength(2)

      // Each loop should have 4 walls
      for (const loop of loops) {
        expect(loop).toHaveLength(4)
      }
    })
  })

  describe('traceWallLoop', () => {
    it('should trace a complete rectangular loop', () => {
      const engine = new RoomDetectionEngine()
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

      // Create walls
      const wall1 = createWall(point1.id, point2.id, createLength(3000), createLength(3000), createLength(200))
      const wall2 = createWall(point2.id, point3.id, createLength(3000), createLength(3000), createLength(200))
      const wall3 = createWall(point3.id, point4.id, createLength(3000), createLength(3000), createLength(200))
      const wall4 = createWall(point4.id, point1.id, createLength(3000), createLength(3000), createLength(200))

      updatedState = addWallToFloor(updatedState, wall1, floorId, false)
      updatedState = addWallToFloor(updatedState, wall2, floorId, false)
      updatedState = addWallToFloor(updatedState, wall3, floorId, false)
      updatedState = addWallToFloor(updatedState, wall4, floorId, false)

      const leftTrace = engine.traceWallLoop(wall1.id, 'left', updatedState)
      expect(leftTrace).not.toBeNull()
      expect(leftTrace?.isValid).toBe(true)
      expect(leftTrace?.wallIds).toHaveLength(4)
      expect(leftTrace?.wallIds).toContain(wall1.id)
      expect(leftTrace?.wallIds).toContain(wall2.id)
      expect(leftTrace?.wallIds).toContain(wall3.id)
      expect(leftTrace?.wallIds).toContain(wall4.id)
    })

    it('should return null for incomplete loops', () => {
      const engine = new RoomDetectionEngine()
      const state = createEmptyModelState()
      const floorId = Array.from(state.floors.keys())[0]

      // Create L-shaped incomplete structure
      const point1 = createPoint(createPoint2D(0, 0))
      const point2 = createPoint(createPoint2D(1000, 0))
      const point3 = createPoint(createPoint2D(1000, 1000))

      let updatedState = addPointToFloor(state, point1, floorId)
      updatedState = addPointToFloor(updatedState, point2, floorId)
      updatedState = addPointToFloor(updatedState, point3, floorId)

      const wall1 = createWall(point1.id, point2.id, createLength(3000), createLength(3000), createLength(200))
      const wall2 = createWall(point2.id, point3.id, createLength(3000), createLength(3000), createLength(200))

      updatedState = addWallToFloor(updatedState, wall1, floorId, false)
      updatedState = addWallToFloor(updatedState, wall2, floorId, false)

      const trace = engine.traceWallLoop(wall1.id, 'left', updatedState)
      expect(trace).toBeNull()
    })
  })

  describe('validateRoom', () => {
    it('should validate a proper room definition', () => {
      const engine = new RoomDetectionEngine()
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

      const roomDef: RoomDefinition = {
        name: 'Test Room',
        wallIds: [wall1.id, wall2.id, wall3.id, wall4.id],
        outerBoundary: {
          wallIds: [wall1.id, wall2.id, wall3.id, wall4.id],
          pointIds: [point1.id, point2.id, point3.id, point4.id]
        },
        holes: [],
        interiorWallIds: []
      }

      expect(engine.validateRoom(roomDef, updatedState)).toBe(true)
    })

    it('should reject room with too few walls', () => {
      const engine = new RoomDetectionEngine()
      const state = createEmptyModelState()
      const floorId = Array.from(state.floors.keys())[0]

      const point1 = createPoint(createPoint2D(0, 0))
      const point2 = createPoint(createPoint2D(1000, 0))

      let updatedState = addPointToFloor(state, point1, floorId)
      updatedState = addPointToFloor(updatedState, point2, floorId)

      const wall1 = createWall(point1.id, point2.id, createLength(3000), createLength(3000), createLength(200))
      updatedState = addWallToFloor(updatedState, wall1, floorId, false)

      const roomDef: RoomDefinition = {
        name: 'Invalid Room',
        wallIds: [wall1.id],
        outerBoundary: {
          wallIds: [wall1.id],
          pointIds: [point1.id, point2.id]
        },
        holes: [],
        interiorWallIds: []
      }

      expect(engine.validateRoom(roomDef, updatedState)).toBe(false)
    })

    it('should reject room with disconnected walls', () => {
      const engine = new RoomDetectionEngine()
      const state = createEmptyModelState()
      const floorId = Array.from(state.floors.keys())[0]

      // Create two separate walls
      const point1 = createPoint(createPoint2D(0, 0))
      const point2 = createPoint(createPoint2D(1000, 0))
      const point3 = createPoint(createPoint2D(2000, 0))
      const point4 = createPoint(createPoint2D(3000, 0))

      let updatedState = addPointToFloor(state, point1, floorId)
      updatedState = addPointToFloor(updatedState, point2, floorId)
      updatedState = addPointToFloor(updatedState, point3, floorId)
      updatedState = addPointToFloor(updatedState, point4, floorId)

      const wall1 = createWall(point1.id, point2.id, createLength(3000), createLength(3000), createLength(200))
      const wall2 = createWall(point3.id, point4.id, createLength(3000), createLength(3000), createLength(200))

      updatedState = addWallToFloor(updatedState, wall1, floorId, false)
      updatedState = addWallToFloor(updatedState, wall2, floorId, false)

      const roomDef: RoomDefinition = {
        name: 'Invalid Room',
        wallIds: [wall1.id, wall2.id],
        outerBoundary: {
          wallIds: [wall1.id, wall2.id],
          pointIds: [point1.id, point2.id, point3.id, point4.id]
        },
        holes: [],
        interiorWallIds: []
      }

      expect(engine.validateRoom(roomDef, updatedState)).toBe(false)
    })
  })

  describe('determineRoomSide', () => {
    it('should determine room is on left side of horizontal wall', () => {
      const engine = new RoomDetectionEngine()
      const state = createEmptyModelState()
      const floorId = Array.from(state.floors.keys())[0]

      // Create a horizontal wall and room above it
      const point1 = createPoint(createPoint2D(0, 0))
      const point2 = createPoint(createPoint2D(1000, 0))
      const point3 = createPoint(createPoint2D(500, 500))

      let updatedState = addPointToFloor(state, point1, floorId)
      updatedState = addPointToFloor(updatedState, point2, floorId)
      updatedState = addPointToFloor(updatedState, point3, floorId)

      const wall = createWall(point1.id, point2.id, createLength(3000), createLength(3000), createLength(200))
      updatedState = addWallToFloor(updatedState, wall, floorId, false)

      const roomDef: RoomDefinition = {
        name: 'Test Room',
        wallIds: [wall.id],
        outerBoundary: {
          wallIds: [wall.id],
          pointIds: [point1.id, point2.id, point3.id] // Triangle with point3 above the wall
        },
        holes: [],
        interiorWallIds: []
      }

      const side = engine.determineRoomSide(roomDef, wall, updatedState)
      expect(side).toBe('left')
    })

    it('should determine room is on right side of horizontal wall', () => {
      const engine = new RoomDetectionEngine()
      const state = createEmptyModelState()
      const floorId = Array.from(state.floors.keys())[0]

      // Create a horizontal wall and room below it
      const point1 = createPoint(createPoint2D(0, 0))
      const point2 = createPoint(createPoint2D(1000, 0))
      const point3 = createPoint(createPoint2D(500, -500))

      let updatedState = addPointToFloor(state, point1, floorId)
      updatedState = addPointToFloor(updatedState, point2, floorId)
      updatedState = addPointToFloor(updatedState, point3, floorId)

      const wall = createWall(point1.id, point2.id, createLength(3000), createLength(3000), createLength(200))
      updatedState = addWallToFloor(updatedState, wall, floorId, false)

      const roomDef: RoomDefinition = {
        name: 'Test Room',
        wallIds: [wall.id],
        outerBoundary: {
          wallIds: [wall.id],
          pointIds: [point1.id, point2.id, point3.id] // Triangle with point3 below the wall
        },
        holes: [],
        interiorWallIds: []
      }

      const side = engine.determineRoomSide(roomDef, wall, updatedState)
      expect(side).toBe('right')
    })
  })

  describe('createRoomFromLoop', () => {
    it('should create a valid room definition from a wall loop', () => {
      const engine = new RoomDetectionEngine()
      const state = createEmptyModelState()
      const floorId = Array.from(state.floors.keys())[0]

      // Create a complete rectangular loop
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

      const wallIds = [wall1.id, wall2.id, wall3.id, wall4.id]
      const roomDef = engine.createRoomFromLoop(wallIds, 'Test Room', updatedState)

      expect(roomDef).not.toBeNull()
      expect(roomDef?.name).toBe('Test Room')
      expect(roomDef?.wallIds).toHaveLength(4)
      expect(roomDef?.outerBoundary.pointIds).toHaveLength(4)
    })

    it('should return null for invalid wall loops', () => {
      const engine = new RoomDetectionEngine()
      const state = createEmptyModelState()
      const floorId = Array.from(state.floors.keys())[0]

      // Create incomplete loop
      const point1 = createPoint(createPoint2D(0, 0))
      const point2 = createPoint(createPoint2D(1000, 0))

      let updatedState = addPointToFloor(state, point1, floorId)
      updatedState = addPointToFloor(updatedState, point2, floorId)

      const wall1 = createWall(point1.id, point2.id, createLength(3000), createLength(3000), createLength(200))
      updatedState = addWallToFloor(updatedState, wall1, floorId, false)

      const roomDef = engine.createRoomFromLoop([wall1.id], 'Invalid Room', updatedState)
      expect(roomDef).toBeNull()
    })
  })

  describe('findInteriorWalls', () => {
    it('should identify walls inside a room', () => {
      const engine = new RoomDetectionEngine()
      const state = createEmptyModelState()
      const floorId = Array.from(state.floors.keys())[0]

      // Create a rectangular room: (0,0) -> (2000,0) -> (2000,2000) -> (0,2000) -> (0,0)
      const roomPoints = [
        createPoint(createPoint2D(0, 0)),
        createPoint(createPoint2D(2000, 0)),
        createPoint(createPoint2D(2000, 2000)),
        createPoint(createPoint2D(0, 2000))
      ]

      // Create an interior wall in the middle of the room
      const interiorPoint1 = createPoint(createPoint2D(500, 1000))
      const interiorPoint2 = createPoint(createPoint2D(1500, 1000))

      let updatedState = state
      for (const point of [...roomPoints, interiorPoint1, interiorPoint2]) {
        updatedState = addPointToFloor(updatedState, point, floorId)
      }

      // Create room boundary walls
      const boundaryWalls = [
        createWall(roomPoints[0].id, roomPoints[1].id, createLength(3000), createLength(3000), createLength(200)),
        createWall(roomPoints[1].id, roomPoints[2].id, createLength(3000), createLength(3000), createLength(200)),
        createWall(roomPoints[2].id, roomPoints[3].id, createLength(3000), createLength(3000), createLength(200)),
        createWall(roomPoints[3].id, roomPoints[0].id, createLength(3000), createLength(3000), createLength(200))
      ]

      // Create interior wall
      const interiorWall = createWall(interiorPoint1.id, interiorPoint2.id, createLength(3000), createLength(3000), createLength(200))

      for (const wall of [...boundaryWalls, interiorWall]) {
        updatedState = addWallToFloor(updatedState, wall, floorId, false)
      }

      const roomDef: RoomDefinition = {
        name: 'Test Room',
        wallIds: boundaryWalls.map(w => w.id),
        outerBoundary: {
          wallIds: boundaryWalls.map(w => w.id),
          pointIds: roomPoints.map(p => p.id)
        },
        holes: [],
        interiorWallIds: []
      }

      const floor = updatedState.floors.get(floorId)!
      const interiorWalls = engine.findInteriorWalls(roomDef, floor.wallIds, updatedState)

      expect(interiorWalls).toContain(interiorWall.id)
      expect(interiorWalls).toHaveLength(1)
    })

    it('should not identify boundary walls as interior walls', () => {
      const engine = new RoomDetectionEngine()
      const state = createEmptyModelState()
      const floorId = Array.from(state.floors.keys())[0]

      // Create a simple rectangular room
      const roomPoints = [
        createPoint(createPoint2D(0, 0)),
        createPoint(createPoint2D(1000, 0)),
        createPoint(createPoint2D(1000, 1000)),
        createPoint(createPoint2D(0, 1000))
      ]

      let updatedState = state
      for (const point of roomPoints) {
        updatedState = addPointToFloor(updatedState, point, floorId)
      }

      const boundaryWalls = [
        createWall(roomPoints[0].id, roomPoints[1].id, createLength(3000), createLength(3000), createLength(200)),
        createWall(roomPoints[1].id, roomPoints[2].id, createLength(3000), createLength(3000), createLength(200)),
        createWall(roomPoints[2].id, roomPoints[3].id, createLength(3000), createLength(3000), createLength(200)),
        createWall(roomPoints[3].id, roomPoints[0].id, createLength(3000), createLength(3000), createLength(200))
      ]

      for (const wall of boundaryWalls) {
        updatedState = addWallToFloor(updatedState, wall, floorId, false)
      }

      const roomDef: RoomDefinition = {
        name: 'Test Room',
        wallIds: boundaryWalls.map(w => w.id),
        outerBoundary: {
          wallIds: boundaryWalls.map(w => w.id),
          pointIds: roomPoints.map(p => p.id)
        },
        holes: [],
        interiorWallIds: []
      }

      const floor = updatedState.floors.get(floorId)!
      const interiorWalls = engine.findInteriorWalls(roomDef, floor.wallIds, updatedState)

      expect(interiorWalls).toHaveLength(0)
    })
  })

  describe('findRoomsWithWall', () => {
    it('should find rooms that contain a specific wall', () => {
      const engine = new RoomDetectionEngine()
      const state = createEmptyModelState()

      // Create some test rooms and walls
      // This would require setting up the full state with rooms
      // For now, test with empty state
      const rooms = engine.findRoomsWithWall(state, 'non-existent-wall' as any)
      expect(rooms).toHaveLength(0)
    })
  })
})
