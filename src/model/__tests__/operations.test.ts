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
  addWallToFloor,
  addPointToFloor,
  removeWallFromFloor
} from '@/model/operations'
import { createLength, createAbsoluteOffset } from '@/types/geometry'
import { createFloorLevel } from '@/types/model'

describe('Model Operations', () => {
  describe('Factory Functions', () => {
    it('should create empty model state with ground floor', () => {
      const state = createEmptyModelState()

      expect(state.floors.size).toBe(1)
      const groundFloor = Array.from(state.floors.values())[0]
      expect(groundFloor.name).toBe('Ground Floor')
      expect(Number(groundFloor.level)).toBe(0)
      expect(Number(groundFloor.height)).toBe(3000)
      expect(state.walls.size).toBe(0)
      expect(state.rooms.size).toBe(0)
      expect(state.points.size).toBe(0)
      expect(state.createdAt).toBeInstanceOf(Date)
      expect(state.updatedAt).toBeInstanceOf(Date)
    })

    it('should create floor with correct properties', () => {
      const floor = createFloor('First Floor', createFloorLevel(1), createLength(2800))

      expect(floor.name).toBe('First Floor')
      expect(Number(floor.level)).toBe(1)
      expect(Number(floor.height)).toBe(2800)
      expect(floor.wallIds).toEqual([])
      expect(floor.roomIds).toEqual([])
      expect(floor.pointIds).toEqual([])
      expect(floor.slabIds).toEqual([])
      expect(floor.roofIds).toEqual([])
    })

    it('should validate floor level is integer', () => {
      // Valid levels (any integers)
      expect(() => createFloorLevel(0)).not.toThrow()
      expect(() => createFloorLevel(-10)).not.toThrow()
      expect(() => createFloorLevel(20)).not.toThrow()
      expect(() => createFloorLevel(5)).not.toThrow()
      expect(() => createFloorLevel(-100)).not.toThrow()
      expect(() => createFloorLevel(100)).not.toThrow()

      // Invalid levels - non-integers
      expect(() => createFloorLevel(1.5)).toThrow('Floor level must be an integer')
      expect(() => createFloorLevel(-2.3)).toThrow('Floor level must be an integer')
      expect(() => createFloorLevel(0.1)).toThrow('Floor level must be an integer')
    })

    it('should create connection point at position', () => {
      const point = createPoint({
        x: createAbsoluteOffset(100),
        y: createAbsoluteOffset(200)
      })

      expect(Number(point.position.x)).toBe(100)
      expect(Number(point.position.y)).toBe(200)
    })

    it('should create wall between connection points', () => {
      const point1 = createPoint({
        x: createAbsoluteOffset(0),
        y: createAbsoluteOffset(0)
      })
      const point2 = createPoint({
        x: createAbsoluteOffset(100),
        y: createAbsoluteOffset(0)
      })
      const wall = createWall(
        point1.id,
        point2.id,
        createLength(2700),
        createLength(2700),
        createLength(150)
      )

      expect(wall.startPointId).toBe(point1.id)
      expect(wall.endPointId).toBe(point2.id)
      expect(Number(wall.thickness)).toBe(150)
      expect(Number(wall.heightAtStart)).toBe(2700)
      expect(Number(wall.heightAtEnd)).toBe(2700)
    })

    it('should create room with wall references', () => {
      const point1 = createPoint({
        x: createAbsoluteOffset(0),
        y: createAbsoluteOffset(0)
      })
      const point2 = createPoint({
        x: createAbsoluteOffset(100),
        y: createAbsoluteOffset(0)
      })
      const wall = createWall(
        point1.id,
        point2.id,
        createLength(2700),
        createLength(2700),
        createLength(200)
      )
      const room = createRoom('Living Room', [wall.id])

      expect(room.name).toBe('Living Room')
      expect(room.wallIds).toEqual([wall.id])
      expect(Number(room.area)).toBe(0)
    })

    it('should create opening on wall', () => {
      const opening = createOpening(
        'door',
        createLength(200),
        createLength(800),
        createLength(2100)
      )

      expect(opening.type).toBe('door')
      expect(Number(opening.offsetFromStart)).toBe(200)
      expect(Number(opening.width)).toBe(800)
      expect(Number(opening.height)).toBe(2100)
    })
  })

  describe('State Operations', () => {
    it('should add floor to state', () => {
      const state = createEmptyModelState()
      const floor = createFloor('First Floor', createFloorLevel(1), createLength(3000))
      const newState = addFloorToState(state, floor)

      expect(newState.floors.size).toBe(2)
      expect(newState.floors.has(floor.id)).toBe(true)
      expect(newState.updatedAt.getTime()).toBeGreaterThanOrEqual(state.updatedAt.getTime())
    })

    it('should add wall to floor', () => {
      let state = createEmptyModelState()
      const groundFloorId = Array.from(state.floors.keys())[0]
      const point1 = createPoint({
        x: createAbsoluteOffset(0),
        y: createAbsoluteOffset(0)
      })
      const point2 = createPoint({
        x: createAbsoluteOffset(100),
        y: createAbsoluteOffset(0)
      })
      state = addPointToFloor(state, point1, groundFloorId)
      state = addPointToFloor(state, point2, groundFloorId)

      const wall = createWall(
        point1.id,
        point2.id,
        createLength(2700),
        createLength(2700),
        createLength(200)
      )
      const newState = addWallToFloor(state, wall, groundFloorId)

      expect(newState.walls.size).toBe(1)
      expect(newState.walls.has(wall.id)).toBe(true)
    })

    it('should remove wall from floor', () => {
      let state = createEmptyModelState()
      const groundFloorId = Array.from(state.floors.keys())[0]
      const point1 = createPoint({
        x: createAbsoluteOffset(0),
        y: createAbsoluteOffset(0)
      })
      const point2 = createPoint({
        x: createAbsoluteOffset(1000),
        y: createAbsoluteOffset(0)
      })
      const wall = createWall(
        point1.id,
        point2.id,
        createLength(2700),
        createLength(2700),
        createLength(200)
      )

      state = addPointToFloor(state, point1, groundFloorId)
      state = addPointToFloor(state, point2, groundFloorId)
      state = addWallToFloor(state, wall, groundFloorId)

      expect(state.walls.size).toBe(1)

      const finalState = removeWallFromFloor(state, wall.id, groundFloorId)

      expect(finalState.walls.size).toBe(0)
    })
  })

  describe('Utility Functions', () => {
    it('should calculate wall length', () => {
      let state = createEmptyModelState()
      const groundFloorId = Array.from(state.floors.keys())[0]
      const point1 = createPoint({
        x: createAbsoluteOffset(0),
        y: createAbsoluteOffset(0)
      })
      const point2 = createPoint({
        x: createAbsoluteOffset(300),
        y: createAbsoluteOffset(400)
      })
      const wall = createWall(
        point1.id,
        point2.id,
        createLength(2700),
        createLength(2700),
        createLength(200)
      )

      state = addPointToFloor(state, point1, groundFloorId)
      state = addPointToFloor(state, point2, groundFloorId)
      state = addWallToFloor(state, wall, groundFloorId)

      const length = getWallLength(wall, state)
      expect(Number(length)).toBe(500) // 3-4-5 triangle
    })

    it('should calculate state bounds', () => {
      let state = createEmptyModelState()
      const groundFloorId = Array.from(state.floors.keys())[0]
      const point1 = createPoint({
        x: createAbsoluteOffset(10),
        y: createAbsoluteOffset(20)
      })
      const point2 = createPoint({
        x: createAbsoluteOffset(100),
        y: createAbsoluteOffset(150)
      })

      state = addPointToFloor(state, point1, groundFloorId)
      state = addPointToFloor(state, point2, groundFloorId)

      const bounds = calculateStateBounds(state)
      expect((bounds != null) && Number(bounds.minX)).toBe(10)
      expect((bounds != null) && Number(bounds.minY)).toBe(20)
      expect((bounds != null) && Number(bounds.maxX)).toBe(100)
      expect((bounds != null) && Number(bounds.maxY)).toBe(150)
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
      const p1 = createPoint({
        x: createAbsoluteOffset(0),
        y: createAbsoluteOffset(0)
      })
      const p2 = createPoint({
        x: createAbsoluteOffset(100),
        y: createAbsoluteOffset(0)
      })
      const p3 = createPoint({
        x: createAbsoluteOffset(100),
        y: createAbsoluteOffset(100)
      })
      const p4 = createPoint({
        x: createAbsoluteOffset(0),
        y: createAbsoluteOffset(100)
      })

      const w1 = createWall(p1.id, p2.id, createLength(2700), createLength(2700), createLength(200))
      const w2 = createWall(p2.id, p3.id, createLength(2700), createLength(2700), createLength(200))
      const w3 = createWall(p3.id, p4.id, createLength(2700), createLength(2700), createLength(200))
      const w4 = createWall(p4.id, p1.id, createLength(2700), createLength(2700), createLength(200))

      const room = createRoom('Square Room', [w1.id, w2.id, w3.id, w4.id])

      state = addPointToFloor(state, p1, groundFloorId)
      state = addPointToFloor(state, p2, groundFloorId)
      state = addPointToFloor(state, p3, groundFloorId)
      state = addPointToFloor(state, p4, groundFloorId)
      state = addWallToFloor(state, w1, groundFloorId)
      state = addWallToFloor(state, w2, groundFloorId)
      state = addWallToFloor(state, w3, groundFloorId)
      state = addWallToFloor(state, w4, groundFloorId)

      const area = calculateRoomArea(room, state)
      expect(Number(area)).toBe(10000) // 100 * 100
    })

    it('should validate opening placement', () => {
      let state = createEmptyModelState()
      const groundFloorId = Array.from(state.floors.keys())[0]
      const point1 = createPoint({
        x: createAbsoluteOffset(0),
        y: createAbsoluteOffset(0)
      })
      const point2 = createPoint({
        x: createAbsoluteOffset(1000),
        y: createAbsoluteOffset(0)
      })
      const wall = createWall(
        point1.id,
        point2.id,
        createLength(2700),
        createLength(2700),
        createLength(200)
      )

      state = addPointToFloor(state, point1, groundFloorId)
      state = addPointToFloor(state, point2, groundFloorId)
      state = addWallToFloor(state, wall, groundFloorId)

      const validOpening = createOpening(
        'door',
        createLength(100),
        createLength(800),
        createLength(2100)
      )
      expect(isOpeningValidOnWall(wall, validOpening, state)).toBe(true)

      const invalidOpening = createOpening(
        'window',
        createLength(900),
        createLength(800),
        createLength(1200)
      )
      expect(isOpeningValidOnWall(wall, invalidOpening, state)).toBe(false)
    })
  })
})
