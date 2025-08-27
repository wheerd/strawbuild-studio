import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FloorId } from '@/types/ids'
import { createLength } from '@/types/geometry'
import { createFloorLevel } from '@/types/model'
import { createFloorsSlice, type FloorsSlice } from './floorsSlice'

// Mock Zustand following the official testing guide
vi.mock('zustand')

describe('FloorsSlice', () => {
  let store: FloorsSlice
  let floorId1: FloorId

  beforeEach(() => {
    // Create the slice directly without using create()
    const mockSet = vi.fn()
    const mockGet = vi.fn()
    const mockStore = {} as any

    store = createFloorsSlice(mockSet, mockGet, mockStore)

    // Set up test IDs
    floorId1 = 'floor_1' as FloorId

    // Mock the get function to return current state
    mockGet.mockImplementation(() => store)

    // Mock the set function to actually update the store
    mockSet.mockImplementation((updater) => {
      if (typeof updater === 'function') {
        const newState = updater(store)
        Object.assign(store, newState)
      } else {
        Object.assign(store, updater)
      }
    })
  })

  describe('addFloor', () => {
    it('should add a floor with default height', () => {
      const level = createFloorLevel(0)
      const floor = store.addFloor('Ground Floor', level)

      expect(store.floors.size).toBe(1)
      expect(store.floors.has(floor.id)).toBe(true)

      const addedFloor = store.floors.get(floor.id)
      expect(addedFloor).toBeDefined()
      expect(addedFloor?.name).toBe('Ground Floor')
      expect(addedFloor?.level).toBe(level)
      expect(addedFloor?.height).toBe(createLength(3000)) // Default height

      // Should return the floor
      expect(floor.name).toBe('Ground Floor')
      expect(floor.level).toBe(level)
    })

    it('should add a floor with custom height', () => {
      const level = createFloorLevel(1)
      const height = createLength(4000)
      const floor = store.addFloor('First Floor', level, height)

      expect(store.floors.size).toBe(1)

      const addedFloor = store.floors.get(floor.id)
      expect(addedFloor?.height).toBe(height)
    })

    it('should add multiple floors', () => {
      const groundLevel = createFloorLevel(0)
      const firstLevel = createFloorLevel(1)

      const groundFloor = store.addFloor('Ground Floor', groundLevel)
      const firstFloor = store.addFloor('First Floor', firstLevel)

      expect(store.floors.size).toBe(2)
      expect(store.floors.has(groundFloor.id)).toBe(true)
      expect(store.floors.has(firstFloor.id)).toBe(true)
      expect(groundFloor.id).not.toBe(firstFloor.id)
    })

    it('should trim floor name whitespace', () => {
      const level = createFloorLevel(0)
      const floor = store.addFloor('  Ground Floor  ', level)

      const addedFloor = store.floors.get(floor.id)
      expect(addedFloor?.name).toBe('Ground Floor')
    })

    it('should throw error for empty floor name', () => {
      const level = createFloorLevel(0)
      expect(() => store.addFloor('', level)).toThrow('Floor name cannot be empty')
      expect(() => store.addFloor('   ', level)).toThrow('Floor name cannot be empty')
    })

    it('should throw error for duplicate floor level', () => {
      const level = createFloorLevel(0)
      store.addFloor('Ground Floor', level)

      expect(() => store.addFloor('Another Floor', level)).toThrow('Floor level 0 already exists')
    })

    it('should throw error for invalid floor height', () => {
      const level = createFloorLevel(0)
      const invalidHeight = createLength(0)

      expect(() => store.addFloor('Ground Floor', level, invalidHeight)).toThrow('Floor height must be greater than 0')
    })

    it('should throw error for negative floor height', () => {
      const level = createFloorLevel(0)
      const invalidHeight = createLength(-100)

      expect(() => store.addFloor('Ground Floor', level, invalidHeight)).toThrow('Floor height must be greater than 0')
    })
  })

  describe('removeFloor', () => {
    it('should remove an existing floor', () => {
      // Add floor first
      const level = createFloorLevel(0)
      const floor = store.addFloor('Ground Floor', level)
      expect(store.floors.size).toBe(1)

      // Remove it
      store.removeFloor(floor.id)

      expect(store.floors.size).toBe(0)
      expect(store.floors.has(floor.id)).toBe(false)
    })

    it('should handle removing non-existent floor gracefully', () => {
      const initialSize = store.floors.size

      // Try to remove non-existent floor
      store.removeFloor(floorId1)

      expect(store.floors.size).toBe(initialSize)
    })

    it('should not affect other floors when removing one', () => {
      // Add two floors
      const groundLevel = createFloorLevel(0)
      const firstLevel = createFloorLevel(1)
      const groundFloor = store.addFloor('Ground Floor', groundLevel)
      const firstFloor = store.addFloor('First Floor', firstLevel)

      expect(store.floors.size).toBe(2)

      // Remove one
      store.removeFloor(groundFloor.id)

      expect(store.floors.size).toBe(1)
      expect(store.floors.has(firstFloor.id)).toBe(true)
      expect(store.floors.has(groundFloor.id)).toBe(false)
    })
  })

  describe('updateFloorName', () => {
    it('should update floor name', () => {
      // Add floor first
      const level = createFloorLevel(0)
      const floor = store.addFloor('Ground Floor', level)

      // Update name
      store.updateFloorName(floor.id, 'Basement')

      const updatedFloor = store.floors.get(floor.id)
      expect(updatedFloor?.name).toBe('Basement')
      expect(updatedFloor?.level).toBe(level) // Other properties unchanged
    })

    it('should trim floor name whitespace when updating', () => {
      // Add floor first
      const level = createFloorLevel(0)
      const floor = store.addFloor('Ground Floor', level)

      // Update name with whitespace
      store.updateFloorName(floor.id, '  Basement  ')

      const updatedFloor = store.floors.get(floor.id)
      expect(updatedFloor?.name).toBe('Basement')
    })

    it('should throw error for empty floor name', () => {
      // Add floor first
      const level = createFloorLevel(0)
      const floor = store.addFloor('Ground Floor', level)

      expect(() => store.updateFloorName(floor.id, '')).toThrow('Floor name cannot be empty')
      expect(() => store.updateFloorName(floor.id, '   ')).toThrow('Floor name cannot be empty')
    })

    it('should do nothing if floor does not exist', () => {
      const initialFloors = new Map(store.floors)

      // Try to update non-existent floor
      store.updateFloorName(floorId1, 'New Name')

      expect(store.floors).toEqual(initialFloors)
    })
  })

  describe('updateFloorLevel', () => {
    it('should update floor level', () => {
      // Add floor first
      const level = createFloorLevel(0)
      const floor = store.addFloor('Ground Floor', level)

      // Update level
      const newLevel = createFloorLevel(1)
      store.updateFloorLevel(floor.id, newLevel)

      const updatedFloor = store.floors.get(floor.id)
      expect(updatedFloor?.level).toBe(newLevel)
      expect(updatedFloor?.name).toBe('Ground Floor') // Other properties unchanged
    })

    it('should throw error when updating to duplicate level', () => {
      // Add two floors
      const level1 = createFloorLevel(0)
      const level2 = createFloorLevel(1)
      const floor1 = store.addFloor('Ground Floor', level1)
      const floor2 = store.addFloor('First Floor', level2)

      // Try to update floor2 to same level as floor1
      expect(() => store.updateFloorLevel(floor2.id, level1)).toThrow('Floor level 0 already exists')

      // Floor levels should remain unchanged
      expect(store.floors.get(floor1.id)?.level).toBe(level1)
      expect(store.floors.get(floor2.id)?.level).toBe(level2)
    })

    it('should allow updating floor to same level (no change)', () => {
      // Add floor first
      const level = createFloorLevel(0)
      const floor = store.addFloor('Ground Floor', level)

      // Update to same level should work
      expect(() => store.updateFloorLevel(floor.id, level)).not.toThrow()

      const updatedFloor = store.floors.get(floor.id)
      expect(updatedFloor?.level).toBe(level)
    })

    it('should do nothing if floor does not exist', () => {
      const initialFloors = new Map(store.floors)

      // Try to update non-existent floor
      store.updateFloorLevel(floorId1, createFloorLevel(1))

      expect(store.floors).toEqual(initialFloors)
    })
  })

  describe('updateFloorHeight', () => {
    it('should update floor height', () => {
      // Add floor first
      const level = createFloorLevel(0)
      const floor = store.addFloor('Ground Floor', level)

      // Update height
      const newHeight = createLength(3500)
      store.updateFloorHeight(floor.id, newHeight)

      const updatedFloor = store.floors.get(floor.id)
      expect(updatedFloor?.height).toBe(newHeight)
      expect(updatedFloor?.name).toBe('Ground Floor') // Other properties unchanged
    })

    it('should throw error for invalid floor height', () => {
      // Add floor first
      const level = createFloorLevel(0)
      const floor = store.addFloor('Ground Floor', level)

      const invalidHeight = createLength(0)
      expect(() => store.updateFloorHeight(floor.id, invalidHeight)).toThrow('Floor height must be greater than 0')

      // Floor height should remain unchanged
      const unchangedFloor = store.floors.get(floor.id)
      expect(unchangedFloor?.height).toBe(createLength(3000))
    })

    it('should throw error for negative floor height', () => {
      // Add floor first
      const level = createFloorLevel(0)
      const floor = store.addFloor('Ground Floor', level)

      const invalidHeight = createLength(-100)
      expect(() => store.updateFloorHeight(floor.id, invalidHeight)).toThrow('Floor height must be greater than 0')

      // Floor height should remain unchanged
      const unchangedFloor = store.floors.get(floor.id)
      expect(unchangedFloor?.height).toBe(createLength(3000))
    })

    it('should do nothing if floor does not exist', () => {
      const initialFloors = new Map(store.floors)

      // Try to update non-existent floor
      store.updateFloorHeight(floorId1, createLength(4000))

      expect(store.floors).toEqual(initialFloors)
    })
  })

  describe('getFloorById', () => {
    it('should return existing floor', () => {
      // Add floor first
      const level = createFloorLevel(0)
      const addedFloor = store.addFloor('Ground Floor', level)

      // Get the floor
      const floor = store.getFloorById(addedFloor.id)

      expect(floor).toBeDefined()
      expect(floor?.name).toBe('Ground Floor')
      expect(floor?.level).toBe(level)

      // Should be the same object
      expect(floor).toEqual(addedFloor)
    })

    it('should return null for non-existent floor', () => {
      const floor = store.getFloorById(floorId1)
      expect(floor).toBeNull()
    })
  })

  describe('getFloorsOrderedByLevel', () => {
    it('should return empty array when no floors', () => {
      const floors = store.getFloorsOrderedByLevel()
      expect(floors).toEqual([])
    })

    it('should return single floor', () => {
      const level = createFloorLevel(0)
      const floor = store.addFloor('Ground Floor', level)

      const floors = store.getFloorsOrderedByLevel()
      expect(floors).toHaveLength(1)
      expect(floors[0]).toEqual(floor)
    })

    it('should return floors ordered by level ascending', () => {
      // Add floors in random order
      const floor2 = store.addFloor('Second Floor', createFloorLevel(2))
      const floor0 = store.addFloor('Ground Floor', createFloorLevel(0))
      const floor1 = store.addFloor('First Floor', createFloorLevel(1))
      const basementFloor = store.addFloor('Basement', createFloorLevel(-1))

      const floors = store.getFloorsOrderedByLevel()
      expect(floors).toHaveLength(4)

      // Should be ordered by level
      expect(floors[0].level).toBe(createFloorLevel(-1))
      expect(floors[1].level).toBe(createFloorLevel(0))
      expect(floors[2].level).toBe(createFloorLevel(1))
      expect(floors[3].level).toBe(createFloorLevel(2))

      expect(floors[0]).toEqual(basementFloor)
      expect(floors[1]).toEqual(floor0)
      expect(floors[2]).toEqual(floor1)
      expect(floors[3]).toEqual(floor2)
    })
  })

  // Note: Floor entity management is now handled by the entities themselves
  // when they are created with a floorId parameter. The floors slice focuses 
  // on managing floor properties only.

  describe('complex scenarios', () => {
    it('should handle complex floor management correctly', () => {
      // Create multiple floors
      const level1 = createFloorLevel(0)
      const level2 = createFloorLevel(1)

      const floor1 = store.addFloor('Ground Floor', level1, createLength(3000))
      const floor2 = store.addFloor('First Floor', level2, createLength(2800))

      expect(store.floors.size).toBe(2)

      // Update floor properties
      store.updateFloorName(floor1.id, 'Main Floor')
      store.updateFloorHeight(floor2.id, createLength(3500))

      const updatedFloor1 = store.floors.get(floor1.id)
      const updatedFloor2 = store.floors.get(floor2.id)

      expect(updatedFloor1?.name).toBe('Main Floor')
      expect(updatedFloor2?.height).toBe(createLength(3500))

      // Verify ordering
      const orderedFloors = store.getFloorsOrderedByLevel()
      expect(orderedFloors[0]).toEqual(updatedFloor1) // Level 0
      expect(orderedFloors[1]).toEqual(updatedFloor2) // Level 1
    })
  })
})