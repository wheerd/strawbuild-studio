import { describe, it, expect } from 'vitest'
import {
  createEmptyModelState,
  createFloor,
  createWall,
  createRoom,
  createPoint,
  createOpening,
  isOpeningValidOnWall,
  calculateRoomArea,
  getWallLength,
  calculateStateBounds,
  addFloorToState,
  addWallToState,
  addPointToState,
  addOpeningToState,
  removeWallFromState
} from '@/model/operations'

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
      expect(state.points.size).toBe(0)
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
      expect(floor.pointIds).toEqual([])
      expect(floor.openingIds).toEqual([])
    })

    it('should create connection point at position', () => {
      const state = createEmptyModelState()
      const groundFloorId = Array.from(state.floors.keys())[0]
      const point = createPoint({ x: 100, y: 200 }, groundFloorId)

      expect(point.position).toEqual({ x: 100, y: 200 })
      expect(point.connectedWallIds).toEqual([])
      expect(point.floorId).toBe(groundFloorId)
    })

    it('should create wall between connection points', () => {
      const state = createEmptyModelState()
      const groundFloorId = Array.from(state.floors.keys())[0]
      const point1 = createPoint({ x: 0, y: 0 }, groundFloorId)
      const point2 = createPoint({ x: 100, y: 0 }, groundFloorId)
      const wall = createWall(point1.id, point2.id, groundFloorId, 150, 2700)

      expect(wall.startPointId).toBe(point1.id)
      expect(wall.endPointId).toBe(point2.id)
      expect(wall.thickness).toBe(150)
      expect(wall.height).toBe(2700)
      expect(wall.openingIds).toEqual([])
      expect(wall.floorId).toBe(groundFloorId)
    })

    it('should create room with wall references', () => {
      const state = createEmptyModelState()
      const groundFloorId = Array.from(state.floors.keys())[0]
      const point1 = createPoint({ x: 0, y: 0 }, groundFloorId)
      const point2 = createPoint({ x: 100, y: 0 }, groundFloorId)
      const wall = createWall(point1.id, point2.id, groundFloorId)
      const room = createRoom('Living Room', groundFloorId, [wall.id])

      expect(room.name).toBe('Living Room')
      expect(room.wallIds).toEqual([wall.id])
      expect(room.area).toBe(0)
      expect(room.floorId).toBe(groundFloorId)
    })

    it('should create opening on wall', () => {
      const state = createEmptyModelState()
      const groundFloorId = Array.from(state.floors.keys())[0]
      const point1 = createPoint({ x: 0, y: 0 }, groundFloorId)
      const point2 = createPoint({ x: 1000, y: 0 }, groundFloorId)
      const wall = createWall(point1.id, point2.id, groundFloorId)
      const opening = createOpening(wall.id, groundFloorId, 'door', 200, 800, 2100)

      expect(opening.wallId).toBe(wall.id)
      expect(opening.type).toBe('door')
      expect(opening.offsetFromStart).toBe(200)
      expect(opening.width).toBe(800)
      expect(opening.height).toBe(2100)
      expect(opening.floorId).toBe(groundFloorId)
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
      const groundFloorId = Array.from(state.floors.keys())[0]
      const point1 = createPoint({ x: 0, y: 0 }, groundFloorId)
      const point2 = createPoint({ x: 100, y: 0 }, groundFloorId)
      state = addPointToState(state, point1)
      state = addPointToState(state, point2)

      const wall = createWall(point1.id, point2.id, groundFloorId)
      const newState = addWallToState(state, wall)

      expect(newState.walls.size).toBe(1)
      expect(newState.walls.has(wall.id)).toBe(true)
    })

    it('should remove wall and cleanup', () => {
      let state = createEmptyModelState()
      const groundFloorId = Array.from(state.floors.keys())[0]
      const point1 = createPoint({ x: 0, y: 0 }, groundFloorId)
      const point2 = createPoint({ x: 1000, y: 0 }, groundFloorId)
      const wall = createWall(point1.id, point2.id, groundFloorId)
      const opening = createOpening(wall.id, groundFloorId, 'door', 200, 800, 2100)

      state = addPointToState(state, point1)
      state = addPointToState(state, point2)
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
      const groundFloorId = Array.from(state.floors.keys())[0]
      const point1 = createPoint({ x: 0, y: 0 }, groundFloorId)
      const point2 = createPoint({ x: 300, y: 400 }, groundFloorId)
      const wall = createWall(point1.id, point2.id, groundFloorId)

      state = addPointToState(state, point1)
      state = addPointToState(state, point2)
      state = addWallToState(state, wall)

      const length = getWallLength(wall, state)
      expect(length).toBe(500) // 3-4-5 triangle
    })

    it('should calculate state bounds', () => {
      let state = createEmptyModelState()
      const groundFloorId = Array.from(state.floors.keys())[0]
      const point1 = createPoint({ x: 10, y: 20 }, groundFloorId)
      const point2 = createPoint({ x: 100, y: 150 }, groundFloorId)

      state = addPointToState(state, point1)
      state = addPointToState(state, point2)

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
      const groundFloorId = Array.from(state.floors.keys())[0]

      // Create a simple square room
      const p1 = createPoint({ x: 0, y: 0 }, groundFloorId)
      const p2 = createPoint({ x: 100, y: 0 }, groundFloorId)
      const p3 = createPoint({ x: 100, y: 100 }, groundFloorId)
      const p4 = createPoint({ x: 0, y: 100 }, groundFloorId)

      const w1 = createWall(p1.id, p2.id, groundFloorId)
      const w2 = createWall(p2.id, p3.id, groundFloorId)
      const w3 = createWall(p3.id, p4.id, groundFloorId)
      const w4 = createWall(p4.id, p1.id, groundFloorId)

      const room = createRoom('Square Room', groundFloorId, [w1.id, w2.id, w3.id, w4.id])

      state = addPointToState(state, p1)
      state = addPointToState(state, p2)
      state = addPointToState(state, p3)
      state = addPointToState(state, p4)
      state = addWallToState(state, w1)
      state = addWallToState(state, w2)
      state = addWallToState(state, w3)
      state = addWallToState(state, w4)

      const area = calculateRoomArea(room, state)
      expect(area).toBe(10000) // 100 * 100
    })

    it('should validate opening placement', () => {
      let state = createEmptyModelState()
      const groundFloorId = Array.from(state.floors.keys())[0]
      const point1 = createPoint({ x: 0, y: 0 }, groundFloorId)
      const point2 = createPoint({ x: 1000, y: 0 }, groundFloorId)
      const wall = createWall(point1.id, point2.id, groundFloorId)

      state = addPointToState(state, point1)
      state = addPointToState(state, point2)
      state = addWallToState(state, wall)

      const validOpening = createOpening(wall.id, groundFloorId, 'door', 100, 800, 2100)
      expect(isOpeningValidOnWall(validOpening, state)).toBe(true)

      const invalidOpening = createOpening(wall.id, groundFloorId, 'window', 900, 800, 1200)
      expect(isOpeningValidOnWall(invalidOpening, state)).toBe(false)
    })
  })
})
