import { describe, it, expect, beforeEach } from 'vitest'
import { useModelStore } from '@/model/store'
import type { FloorId } from '@/types/ids'

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
      const { addPoint, addWall } = useModelStore.getState()
      const state = useModelStore.getState()
      const groundFloorId = Array.from(state.floors.keys())[0]

      const point1 = addPoint({ x: 0, y: 0 }, groundFloorId)
      const point2 = addPoint({ x: 1000, y: 0 }, groundFloorId)

      let updatedState = useModelStore.getState()
      expect(updatedState.points.size).toBe(2)

      addWall(point1.id, point2.id, groundFloorId)

      updatedState = useModelStore.getState()
      expect(updatedState.walls.size).toBe(1)
      expect(updatedState.bounds).toBeDefined()
    })

    it('should use active floor ID when provided', () => {
      const { addFloor, addPoint, addWall, addRoom } = useModelStore.getState()

      // Create a second floor
      const firstFloor = addFloor('First Floor', 1, 3000)

      let state = useModelStore.getState()
      const groundFloorId = Array.from(state.floors.keys())[0]

      // Add entities to the first floor by passing the active floor ID
      const point1 = addPoint({ x: 0, y: 0 }, firstFloor.id)
      const point2 = addPoint({ x: 1000, y: 0 }, firstFloor.id)
      const wall = addWall(point1.id, point2.id, firstFloor.id, 200, 3000)
      const room = addRoom('Test Room', firstFloor.id, [wall.id])

      state = useModelStore.getState()

      // Verify entities are assigned to the correct floor
      expect(point1.floorId).toBe(firstFloor.id)
      expect(point2.floorId).toBe(firstFloor.id)
      expect(wall.floorId).toBe(firstFloor.id)
      expect(room.floorId).toBe(firstFloor.id)

      // Verify entities are in the floor's collections
      expect(state.floors.get(firstFloor.id)!.pointIds).toContain(point1.id)
      expect(state.floors.get(firstFloor.id)!.pointIds).toContain(point2.id)
      expect(state.floors.get(firstFloor.id)!.wallIds).toContain(wall.id)
      expect(state.floors.get(firstFloor.id)!.roomIds).toContain(room.id)

      // Verify ground floor is empty
      const groundFloor = state.floors.get(groundFloorId)!
      expect(groundFloor.pointIds).toHaveLength(0)
      expect(groundFloor.wallIds).toHaveLength(0)
      expect(groundFloor.roomIds).toHaveLength(0)
    })

    it('should validate openings before adding', () => {
      const { addPoint, addWall, addOpening } = useModelStore.getState()
      const state = useModelStore.getState()
      const groundFloorId = Array.from(state.floors.keys())[0]

      // Setup wall
      const point1 = addPoint({ x: 0, y: 0 }, groundFloorId)
      const point2 = addPoint({ x: 1000, y: 0 }, groundFloorId)
      const wall = addWall(point1.id, point2.id, groundFloorId)

      // Valid opening
      expect(() => addOpening(wall.id, 'door', 100, 800, 2100)).not.toThrow()

      // Invalid opening
      expect(() => addOpening(wall.id, 'window', 500, 800, 1200)).toThrow('Invalid opening position')
    })
  })

  describe('Wall Removal', () => {
    it('should remove wall and clean up related entities', () => {
      const { addPoint, addWall, addOpening, removeWall } = useModelStore.getState()
      const state = useModelStore.getState()
      const groundFloorId = Array.from(state.floors.keys())[0]

      // Setup
      const point1 = addPoint({ x: 0, y: 0 }, groundFloorId)
      const point2 = addPoint({ x: 1000, y: 0 }, groundFloorId)
      const wall = addWall(point1.id, point2.id, groundFloorId)
      addOpening(wall.id, 'door', 100, 800, 2100)

      let updatedState = useModelStore.getState()
      expect(updatedState.walls.size).toBe(1)
      expect(updatedState.openings.size).toBe(1)

      // Remove wall
      removeWall(wall.id)

      updatedState = useModelStore.getState()
      expect(updatedState.walls.size).toBe(0)
      expect(updatedState.openings.size).toBe(0)
    })
  })

  describe('Floor ID Validation', () => {
    it('should throw error when creating entities with invalid floor ID', () => {
      const { addPoint, addWall, addRoom } = useModelStore.getState()
      const invalidFloorId = 'invalid-floor-id' as FloorId

      // Should throw for connection points
      expect(() => addPoint({ x: 0, y: 0 }, invalidFloorId))
        .toThrow('Floor invalid-floor-id not found')

      // Should throw for walls (after creating valid connection points first)
      const state = useModelStore.getState()
      const validFloorId = Array.from(state.floors.keys())[0]
      const point1 = addPoint({ x: 0, y: 0 }, validFloorId)
      const point2 = addPoint({ x: 100, y: 0 }, validFloorId)

      expect(() => addWall(point1.id, point2.id, invalidFloorId))
        .toThrow('Floor invalid-floor-id not found')

      // Should throw for rooms
      expect(() => addRoom('Test Room', invalidFloorId))
        .toThrow('Floor invalid-floor-id not found')
    })
  })
})
