import { describe, it, expect } from 'vitest'
import {
  createEmptyModelState,
  createFloor,
  createWall,
  createRoom,
  createConnectionPoint,
  createOpening,
  isOpeningValidOnWall,
  calculateRoomArea,
  getWallLength,
  calculateStateBounds,
  addFloorToState,
  addWallToState,
  addConnectionPointToState,
  addOpeningToState,
  removeWallFromState
} from '../operations'

describe('Model Operations', () => {
  describe('Factory Functions', () => {
    it('should create empty model state with ground floor', () => {
      const state = createEmptyModelState()

      expect(state.floors.size).toBe(1)
      const groundFloor = Array.from(state.floors.values())[0]
      expect(groundFloor.name).toBe('Ground Floor')
      expect(groundFloor.level).toBe(0)
      expect(groundFloor.height).toBe(3000)
      expect(state.walls.size).toBe(0)
      expect(state.rooms.size).toBe(0)
      expect(state.connectionPoints.size).toBe(0)
      expect(state.openings.size).toBe(0)
      expect(state.createdAt).toBeInstanceOf(Date)
      expect(state.updatedAt).toBeInstanceOf(Date)
    })

    it('should create floor with correct properties', () => {
      const floor = createFloor('First Floor', 1, 2800)

      expect(floor.name).toBe('First Floor')
      expect(floor.level).toBe(1)
      expect(floor.height).toBe(2800)
      expect(floor.wallIds).toEqual([])
      expect(floor.roomIds).toEqual([])
      expect(floor.connectionPointIds).toEqual([])
      expect(floor.openingIds).toEqual([])
    })

    it('should create connection point at position', () => {
      const point = createConnectionPoint({ x: 100, y: 200 })

      expect(point.position).toEqual({ x: 100, y: 200 })
      expect(point.connectedWallIds).toEqual([])
    })

    it('should create wall between connection points', () => {
      const point1 = createConnectionPoint({ x: 0, y: 0 })
      const point2 = createConnectionPoint({ x: 100, y: 0 })
      const wall = createWall(point1.id, point2.id, 150, 2700)

      expect(wall.startPointId).toBe(point1.id)
      expect(wall.endPointId).toBe(point2.id)
      expect(wall.thickness).toBe(150)
      expect(wall.height).toBe(2700)
      expect(wall.openingIds).toEqual([])
    })

    it('should create room with wall references', () => {
      const point1 = createConnectionPoint({ x: 0, y: 0 })
      const point2 = createConnectionPoint({ x: 100, y: 0 })
      const wall = createWall(point1.id, point2.id)
      const room = createRoom('Living Room', [wall.id])

      expect(room.name).toBe('Living Room')
      expect(room.wallIds).toEqual([wall.id])
      expect(room.area).toBe(0)
    })

    it('should create opening on wall', () => {
      const point1 = createConnectionPoint({ x: 0, y: 0 })
      const point2 = createConnectionPoint({ x: 1000, y: 0 })
      const wall = createWall(point1.id, point2.id)
      const opening = createOpening(wall.id, 'door', 200, 800, 2100)

      expect(opening.wallId).toBe(wall.id)
      expect(opening.type).toBe('door')
      expect(opening.offsetFromStart).toBe(200)
      expect(opening.width).toBe(800)
      expect(opening.height).toBe(2100)
    })
  })

  describe('State Operations', () => {
    it('should add floor to state', () => {
      const state = createEmptyModelState()
      const floor = createFloor('First Floor', 1)
      const newState = addFloorToState(state, floor)

      expect(newState.floors.size).toBe(2)
      expect(newState.floors.has(floor.id)).toBe(true)
      expect(newState.updatedAt.getTime()).toBeGreaterThanOrEqual(state.updatedAt.getTime())
    })

    it('should add wall to state', () => {
      let state = createEmptyModelState()
      const point1 = createConnectionPoint({ x: 0, y: 0 })
      const point2 = createConnectionPoint({ x: 100, y: 0 })
      state = addConnectionPointToState(state, point1)
      state = addConnectionPointToState(state, point2)

      const wall = createWall(point1.id, point2.id)
      const newState = addWallToState(state, wall)

      expect(newState.walls.size).toBe(1)
      expect(newState.walls.has(wall.id)).toBe(true)
    })

    it('should remove wall and cleanup', () => {
      let state = createEmptyModelState()
      const point1 = createConnectionPoint({ x: 0, y: 0 })
      const point2 = createConnectionPoint({ x: 1000, y: 0 })
      const wall = createWall(point1.id, point2.id)
      const opening = createOpening(wall.id, 'door', 200, 800, 2100)

      state = addConnectionPointToState(state, point1)
      state = addConnectionPointToState(state, point2)
      state = addWallToState(state, wall)
      state = addOpeningToState(state, opening)

      expect(state.walls.size).toBe(1)
      expect(state.openings.size).toBe(1)

      const finalState = removeWallFromState(state, wall.id)

      expect(finalState.walls.size).toBe(0)
      expect(finalState.openings.size).toBe(0)
    })
  })

  describe('Utility Functions', () => {
    it('should calculate wall length', () => {
      let state = createEmptyModelState()
      const point1 = createConnectionPoint({ x: 0, y: 0 })
      const point2 = createConnectionPoint({ x: 300, y: 400 })
      const wall = createWall(point1.id, point2.id)

      state = addConnectionPointToState(state, point1)
      state = addConnectionPointToState(state, point2)
      state = addWallToState(state, wall)

      const length = getWallLength(wall, state)
      expect(length).toBe(500) // 3-4-5 triangle
    })

    it('should calculate state bounds', () => {
      let state = createEmptyModelState()
      const point1 = createConnectionPoint({ x: 10, y: 20 })
      const point2 = createConnectionPoint({ x: 100, y: 150 })

      state = addConnectionPointToState(state, point1)
      state = addConnectionPointToState(state, point2)

      const bounds = calculateStateBounds(state)
      expect(bounds).toEqual({
        minX: 10,
        minY: 20,
        maxX: 100,
        maxY: 150
      })
    })

    it('should return null bounds for empty state', () => {
      const state = createEmptyModelState()
      const bounds = calculateStateBounds(state)
      expect(bounds).toBeNull()
    })

    it('should calculate room area', () => {
      let state = createEmptyModelState()

      // Create a simple square room
      const p1 = createConnectionPoint({ x: 0, y: 0 })
      const p2 = createConnectionPoint({ x: 100, y: 0 })
      const p3 = createConnectionPoint({ x: 100, y: 100 })
      const p4 = createConnectionPoint({ x: 0, y: 100 })

      const w1 = createWall(p1.id, p2.id)
      const w2 = createWall(p2.id, p3.id)
      const w3 = createWall(p3.id, p4.id)
      const w4 = createWall(p4.id, p1.id)

      const room = createRoom('Square Room', [w1.id, w2.id, w3.id, w4.id])

      state = addConnectionPointToState(state, p1)
      state = addConnectionPointToState(state, p2)
      state = addConnectionPointToState(state, p3)
      state = addConnectionPointToState(state, p4)
      state = addWallToState(state, w1)
      state = addWallToState(state, w2)
      state = addWallToState(state, w3)
      state = addWallToState(state, w4)

      const area = calculateRoomArea(room, state)
      expect(area).toBe(10000) // 100 * 100
    })

    it('should validate opening placement', () => {
      let state = createEmptyModelState()
      const point1 = createConnectionPoint({ x: 0, y: 0 })
      const point2 = createConnectionPoint({ x: 1000, y: 0 })
      const wall = createWall(point1.id, point2.id)

      state = addConnectionPointToState(state, point1)
      state = addConnectionPointToState(state, point2)
      state = addWallToState(state, wall)

      const validOpening = createOpening(wall.id, 'door', 100, 800, 2100)
      expect(isOpeningValidOnWall(validOpening, state)).toBe(true)

      const invalidOpening = createOpening(wall.id, 'window', 900, 800, 1200)
      expect(isOpeningValidOnWall(invalidOpening, state)).toBe(false)
    })
  })
})