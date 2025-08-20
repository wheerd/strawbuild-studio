import { describe, it, expect } from 'vitest'
import {
  createEmptyModelState,
  createPoint,
  createWall,
  addPointToFloor,
  addWallToFloor,
  getWallLength,
  calculateStateBounds
} from '@/model/operations'
import { createAbsoluteOffset, createLength } from '@/types/geometry'

describe('Model Properties', () => {
  describe('Connection Points', () => {
    it('should create connection point with position', () => {
      const point = createPoint({
        x: createAbsoluteOffset(100),
        y: createAbsoluteOffset(200)
      })

      expect(Number(point.position.x)).toBe(100)
      expect(Number(point.position.y)).toBe(200)
    })
  })

  describe('Walls', () => {
    it('should create wall between points', () => {
      const p1 = createPoint({
        x: createAbsoluteOffset(0),
        y: createAbsoluteOffset(0)
      })
      const p2 = createPoint({
        x: createAbsoluteOffset(100),
        y: createAbsoluteOffset(0)
      })
      const wall = createWall(
        p1.id,
        p2.id,
        createLength(3000),
        createLength(3000),
        createLength(200)
      )

      expect(wall.startPointId).toBe(p1.id)
      expect(wall.endPointId).toBe(p2.id)
      expect(Number(wall.thickness)).toBe(200)
      expect(Number(wall.heightAtStart)).toBe(3000)
      expect(Number(wall.heightAtEnd)).toBe(3000)
    })

    it('should calculate wall length', () => {
      let state = createEmptyModelState()
      const groundFloorId = Array.from(state.floors.keys())[0]
      const p1 = createPoint({
        x: createAbsoluteOffset(0),
        y: createAbsoluteOffset(0)
      })
      const p2 = createPoint({
        x: createAbsoluteOffset(300),
        y: createAbsoluteOffset(400)
      })
      const wall = createWall(
        p1.id,
        p2.id,
        createLength(2700),
        createLength(2700),
        createLength(200)
      )

      state = addPointToFloor(state, p1, groundFloorId)
      state = addPointToFloor(state, p2, groundFloorId)
      state = addWallToFloor(state, wall, groundFloorId)

      expect(Number(getWallLength(wall, state))).toBe(500)
    })
  })

  describe('State Bounds', () => {
    it('should calculate bounds from connection points', () => {
      let state = createEmptyModelState()
      const groundFloorId = Array.from(state.floors.keys())[0]
      const p1 = createPoint({
        x: createAbsoluteOffset(10),
        y: createAbsoluteOffset(20)
      })
      const p2 = createPoint({
        x: createAbsoluteOffset(100),
        y: createAbsoluteOffset(50)
      })

      state = addPointToFloor(state, p1, groundFloorId)
      state = addPointToFloor(state, p2, groundFloorId)

      const bounds = calculateStateBounds(state)
      expect((bounds != null) && Number(bounds.minX)).toBe(10)
      expect((bounds != null) && Number(bounds.minY)).toBe(20)
      expect((bounds != null) && Number(bounds.maxX)).toBe(100)
      expect((bounds != null) && Number(bounds.maxY)).toBe(50)
    })
  })
})
