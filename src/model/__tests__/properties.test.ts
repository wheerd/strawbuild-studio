import { describe, it, expect } from 'vitest'
import {
  createEmptyModelState,
  createConnectionPoint,
  createWall,
  addConnectionPointToState,
  addWallToState,
  getWallLength,
  calculateStateBounds
} from '../operations'

describe('Model Properties', () => {
  describe('Connection Points', () => {
    it('should create connection point with position', () => {
      const point = createConnectionPoint({ x: 100, y: 200 })
      expect(point.position).toEqual({ x: 100, y: 200 })
      expect(point.connectedWallIds).toEqual([])
    })
  })

  describe('Walls', () => {
    it('should create wall between points', () => {
      const p1 = createConnectionPoint({ x: 0, y: 0 })
      const p2 = createConnectionPoint({ x: 100, y: 0 })
      const wall = createWall(p1.id, p2.id, 200, 3000)

      expect(wall.startPointId).toBe(p1.id)
      expect(wall.endPointId).toBe(p2.id)
      expect(wall.thickness).toBe(200)
      expect(wall.height).toBe(3000)
    })

    it('should calculate wall length', () => {
      let state = createEmptyModelState()
      const p1 = createConnectionPoint({ x: 0, y: 0 })
      const p2 = createConnectionPoint({ x: 300, y: 400 })
      const wall = createWall(p1.id, p2.id)

      state = addConnectionPointToState(state, p1)
      state = addConnectionPointToState(state, p2)
      state = addWallToState(state, wall)

      expect(getWallLength(wall, state)).toBe(500)
    })
  })

  describe('State Bounds', () => {
    it('should calculate bounds from connection points', () => {
      let state = createEmptyModelState()
      const p1 = createConnectionPoint({ x: 10, y: 20 })
      const p2 = createConnectionPoint({ x: 100, y: 50 })

      state = addConnectionPointToState(state, p1)
      state = addConnectionPointToState(state, p2)

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