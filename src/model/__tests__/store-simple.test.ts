import { describe, it, expect, beforeEach } from 'vitest'
import { useModelStore } from '../store'

// Simple store tests without React hooks to avoid rendering issues
describe('ModelStore - Basic Operations', () => {
  beforeEach(() => {
    // Reset store state
    useModelStore.getState().reset()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useModelStore.getState()

      expect(state.floors.size).toBe(1)
      const groundFloor = Array.from(state.floors.values())[0]
      expect(groundFloor.name).toBe('Ground Floor')
    })
  })

  describe('Building Operations', () => {
    it('should reset store state', () => {
      const { reset } = useModelStore.getState()

      reset()

      const state = useModelStore.getState()
      expect(state.floors.size).toBe(1)
    })

    it('should add floor', () => {
      const { addFloor } = useModelStore.getState()

      addFloor('First Floor', 1, 3000)

      const state = useModelStore.getState()
      expect(state.floors.size).toBe(2)
      expect(Array.from(state.floors.values())[1].name).toBe('First Floor')
    })

    it('should add connection points and walls', () => {
      const { addConnectionPoint, addWall } = useModelStore.getState()
      const point1 = addConnectionPoint({ x: 0, y: 0 })
      const point2 = addConnectionPoint({ x: 1000, y: 0 })

      let state = useModelStore.getState()
      expect(state.connectionPoints.size).toBe(2)

      addWall(point1.id, point2.id)

      state = useModelStore.getState()
      expect(state.walls.size).toBe(1)
      expect(state.bounds).toBeDefined()
    })

    it('should validate openings before adding', () => {
      const { addConnectionPoint, addWall, addOpening } = useModelStore.getState()

      // Setup wall
      const point1 = addConnectionPoint({ x: 0, y: 0 })
      const point2 = addConnectionPoint({ x: 1000, y: 0 })
      const wall = addWall(point1.id, point2.id)

      // Valid opening
      expect(() => addOpening(wall.id, 'door', 100, 800, 2100)).not.toThrow()

      // Invalid opening
      expect(() => addOpening(wall.id, 'window', 500, 800, 1200)).toThrow('Invalid opening position')
    })
  })

  describe('Wall Removal', () => {
    it('should remove wall and clean up related entities', () => {
      const { addConnectionPoint, addWall, addOpening, removeWall } = useModelStore.getState()

      // Setup
      const point1 = addConnectionPoint({ x: 0, y: 0 })
      const point2 = addConnectionPoint({ x: 1000, y: 0 })
      const wall = addWall(point1.id, point2.id)
      addOpening(wall.id, 'door', 100, 800, 2100)

      let state = useModelStore.getState()
      expect(state.walls.size).toBe(1)
      expect(state.openings.size).toBe(1)

      // Remove wall
      removeWall(wall.id)

      state = useModelStore.getState()
      expect(state.walls.size).toBe(0)
      expect(state.openings.size).toBe(0)
    })
  })
})