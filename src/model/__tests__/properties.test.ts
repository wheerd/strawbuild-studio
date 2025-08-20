import { describe, it, expect } from 'vitest'
import {
  createEmptyModelState,
  createPoint,
  createWall,
  addPointToState,
  addWallToState,
  getWallLength,
  calculateStateBounds
} from '../operations'

describe('Model Properties', () => {
  describe('Connection Points', () => {
    it('should create connection point with position', () => {
      const state = createEmptyModelState()
      const groundFloorId = Array.from(state.floors.keys())[0]
      const point = createPoint({ x: 100, y: 200 }, groundFloorId)

      expect(point.position).toEqual({ x: 100, y: 200 })
      expect(point.connectedWallIds).toEqual([])
      expect(point.floorId).toBe(groundFloorId)
    })
  })

  describe('Walls', () => {
    it('should create wall between points', () => {
      const state = createEmptyModelState()
      const groundFloorId = Array.from(state.floors.keys())[0]
      const p1 = createPoint({ x: 0, y: 0 }, groundFloorId)
      const p2 = createPoint({ x: 100, y: 0 }, groundFloorId)
      const wall = createWall(p1.id, p2.id, groundFloorId, 200, 3000)

      expect(wall.startPointId).toBe(p1.id)
      expect(wall.endPointId).toBe(p2.id)
      expect(wall.thickness).toBe(200)
      expect(wall.height).toBe(3000)
      expect(wall.floorId).toBe(groundFloorId)
    })

    it('should calculate wall length', () => {
      let state = createEmptyModelState()
      const groundFloorId = Array.from(state.floors.keys())[0]
      const p1 = createPoint({ x: 0, y: 0 }, groundFloorId)
      const p2 = createPoint({ x: 300, y: 400 }, groundFloorId)
      const wall = createWall(p1.id, p2.id, groundFloorId)

      state = addPointToState(state, p1)
      state = addPointToState(state, p2)
      state = addWallToState(state, wall)

      expect(getWallLength(wall, state)).toBe(500)
    })
  })

  describe('State Bounds', () => {
    it('should calculate bounds from connection points', () => {
      let state = createEmptyModelState()
      const groundFloorId = Array.from(state.floors.keys())[0]
      const p1 = createPoint({ x: 10, y: 20 }, groundFloorId)
      const p2 = createPoint({ x: 100, y: 50 }, groundFloorId)

      state = addPointToState(state, p1)
      state = addPointToState(state, p2)

      const bounds = calculateStateBounds(state)
      expect(bounds).toEqual({
        minX: 10,
        minY: 20,
        maxX: 100,
        maxY: 50
      })
    })
  })
})
