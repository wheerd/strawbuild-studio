import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { StoreyId } from '@/types/ids'
import { createLength } from '@/types/geometry'
import { createStoreyLevel } from '@/types/model'
import { createStoreysSlice, type StoreysSlice } from './storeysSlice'

// Mock Zustand following the official testing guide
vi.mock('zustand')

describe('StoreysSlice', () => {
  let store: StoreysSlice
  let storeyId1: StoreyId

  beforeEach(() => {
    // Create the slice directly without using create()
    const mockSet = vi.fn()
    const mockGet = vi.fn()
    const mockStore = {} as any

    store = createStoreysSlice(mockSet, mockGet, mockStore)

    // Set up test IDs
    storeyId1 = 'storey_1' as StoreyId

    // Mock the get function to return current state
    mockGet.mockImplementation(() => store)

    // Mock the set function to actually update the store
    mockSet.mockImplementation(updater => {
      if (typeof updater === 'function') {
        const newState = updater(store)
        Object.assign(store, newState)
      } else {
        Object.assign(store, updater)
      }
    })
  })

  describe('addStorey', () => {
    it('should add a storey with default height', () => {
      const level = createStoreyLevel(0)
      const storey = store.addStorey('Ground Storey', level)

      expect(store.storeys.size).toBe(1)
      expect(store.storeys.has(storey.id)).toBe(true)

      const addedStorey = store.storeys.get(storey.id)
      expect(addedStorey).toBeDefined()
      expect(addedStorey?.name).toBe('Ground Storey')
      expect(addedStorey?.level).toBe(level)
      expect(addedStorey?.height).toBe(createLength(3000)) // Default height

      // Should return the storey
      expect(storey.name).toBe('Ground Storey')
      expect(storey.level).toBe(level)
    })

    it('should add a storey with custom height', () => {
      const level = createStoreyLevel(1)
      const height = createLength(4000)
      const storey = store.addStorey('First Storey', level, height)

      expect(store.storeys.size).toBe(1)

      const addedStorey = store.storeys.get(storey.id)
      expect(addedStorey?.height).toBe(height)
    })

    it('should add multiple storeys', () => {
      const groundLevel = createStoreyLevel(0)
      const firstLevel = createStoreyLevel(1)

      const groundStorey = store.addStorey('Ground Storey', groundLevel)
      const firstStorey = store.addStorey('First Storey', firstLevel)

      expect(store.storeys.size).toBe(2)
      expect(store.storeys.has(groundStorey.id)).toBe(true)
      expect(store.storeys.has(firstStorey.id)).toBe(true)
      expect(groundStorey.id).not.toBe(firstStorey.id)
    })

    it('should trim storey name whitespace', () => {
      const level = createStoreyLevel(0)
      const storey = store.addStorey('  Ground Storey  ', level)

      const addedStorey = store.storeys.get(storey.id)
      expect(addedStorey?.name).toBe('Ground Storey')
    })

    it('should throw error for empty storey name', () => {
      const level = createStoreyLevel(0)
      expect(() => store.addStorey('', level)).toThrow('Storey name cannot be empty')
      expect(() => store.addStorey('   ', level)).toThrow('Storey name cannot be empty')
    })

    it('should throw error for duplicate storey level', () => {
      const level = createStoreyLevel(0)
      store.addStorey('Ground Storey', level)

      expect(() => store.addStorey('Another Storey', level)).toThrow('Storey level 0 already exists')
    })

    it('should throw error for invalid storey height', () => {
      const level = createStoreyLevel(0)
      const invalidHeight = createLength(0)

      expect(() => store.addStorey('Ground Storey', level, invalidHeight)).toThrow(
        'Storey height must be greater than 0'
      )
    })

    it('should throw error for negative storey height', () => {
      const level = createStoreyLevel(0)
      const invalidHeight = createLength(-100)

      expect(() => store.addStorey('Ground Storey', level, invalidHeight)).toThrow(
        'Storey height must be greater than 0'
      )
    })
  })

  describe('removeStorey', () => {
    it('should remove an existing storey', () => {
      // Add storey first
      const level = createStoreyLevel(0)
      const storey = store.addStorey('Ground Storey', level)
      expect(store.storeys.size).toBe(1)

      // Remove it
      store.removeStorey(storey.id)

      expect(store.storeys.size).toBe(0)
      expect(store.storeys.has(storey.id)).toBe(false)
    })

    it('should handle removing non-existent storey gracefully', () => {
      const initialSize = store.storeys.size

      // Try to remove non-existent storey
      store.removeStorey(storeyId1)

      expect(store.storeys.size).toBe(initialSize)
    })

    it('should not affect other storeys when removing one', () => {
      // Add two storeys
      const groundLevel = createStoreyLevel(0)
      const firstLevel = createStoreyLevel(1)
      const groundStorey = store.addStorey('Ground Storey', groundLevel)
      const firstStorey = store.addStorey('First Storey', firstLevel)

      expect(store.storeys.size).toBe(2)

      // Remove one
      store.removeStorey(groundStorey.id)

      expect(store.storeys.size).toBe(1)
      expect(store.storeys.has(firstStorey.id)).toBe(true)
      expect(store.storeys.has(groundStorey.id)).toBe(false)
    })
  })

  describe('updateStoreyName', () => {
    it('should update storey name', () => {
      // Add storey first
      const level = createStoreyLevel(0)
      const storey = store.addStorey('Ground Storey', level)

      // Update name
      store.updateStoreyName(storey.id, 'Basement')

      const updatedStorey = store.storeys.get(storey.id)
      expect(updatedStorey?.name).toBe('Basement')
      expect(updatedStorey?.level).toBe(level) // Other properties unchanged
    })

    it('should trim storey name whitespace when updating', () => {
      // Add storey first
      const level = createStoreyLevel(0)
      const storey = store.addStorey('Ground Storey', level)

      // Update name with whitespace
      store.updateStoreyName(storey.id, '  Basement  ')

      const updatedStorey = store.storeys.get(storey.id)
      expect(updatedStorey?.name).toBe('Basement')
    })

    it('should throw error for empty storey name', () => {
      // Add storey first
      const level = createStoreyLevel(0)
      const storey = store.addStorey('Ground Storey', level)

      expect(() => store.updateStoreyName(storey.id, '')).toThrow('Storey name cannot be empty')
      expect(() => store.updateStoreyName(storey.id, '   ')).toThrow('Storey name cannot be empty')
    })

    it('should do nothing if storey does not exist', () => {
      const initialStoreys = new Map(store.storeys)

      // Try to update non-existent storey
      store.updateStoreyName(storeyId1, 'New Name')

      expect(store.storeys).toEqual(initialStoreys)
    })
  })

  describe('updateStoreyLevel', () => {
    it('should update storey level', () => {
      // Add storey first
      const level = createStoreyLevel(0)
      const storey = store.addStorey('Ground Storey', level)

      // Update level
      const newLevel = createStoreyLevel(1)
      store.updateStoreyLevel(storey.id, newLevel)

      const updatedStorey = store.storeys.get(storey.id)
      expect(updatedStorey?.level).toBe(newLevel)
      expect(updatedStorey?.name).toBe('Ground Storey') // Other properties unchanged
    })

    it('should throw error when updating to duplicate level', () => {
      // Add two storeys
      const level1 = createStoreyLevel(0)
      const level2 = createStoreyLevel(1)
      const storey1 = store.addStorey('Ground Storey', level1)
      const storey2 = store.addStorey('First Storey', level2)

      // Try to update storey2 to same level as storey1
      expect(() => store.updateStoreyLevel(storey2.id, level1)).toThrow('Storey level 0 already exists')

      // Storey levels should remain unchanged
      expect(store.storeys.get(storey1.id)?.level).toBe(level1)
      expect(store.storeys.get(storey2.id)?.level).toBe(level2)
    })

    it('should allow updating storey to same level (no change)', () => {
      // Add storey first
      const level = createStoreyLevel(0)
      const storey = store.addStorey('Ground Storey', level)

      // Update to same level should work
      expect(() => store.updateStoreyLevel(storey.id, level)).not.toThrow()

      const updatedStorey = store.storeys.get(storey.id)
      expect(updatedStorey?.level).toBe(level)
    })

    it('should do nothing if storey does not exist', () => {
      const initialStoreys = new Map(store.storeys)

      // Try to update non-existent storey
      store.updateStoreyLevel(storeyId1, createStoreyLevel(1))

      expect(store.storeys).toEqual(initialStoreys)
    })
  })

  describe('updateStoreyHeight', () => {
    it('should update storey height', () => {
      // Add storey first
      const level = createStoreyLevel(0)
      const storey = store.addStorey('Ground Storey', level)

      // Update height
      const newHeight = createLength(3500)
      store.updateStoreyHeight(storey.id, newHeight)

      const updatedStorey = store.storeys.get(storey.id)
      expect(updatedStorey?.height).toBe(newHeight)
      expect(updatedStorey?.name).toBe('Ground Storey') // Other properties unchanged
    })

    it('should throw error for invalid storey height', () => {
      // Add storey first
      const level = createStoreyLevel(0)
      const storey = store.addStorey('Ground Storey', level)

      const invalidHeight = createLength(0)
      expect(() => store.updateStoreyHeight(storey.id, invalidHeight)).toThrow('Storey height must be greater than 0')

      // Storey height should remain unchanged
      const unchangedStorey = store.storeys.get(storey.id)
      expect(unchangedStorey?.height).toBe(createLength(3000))
    })

    it('should throw error for negative storey height', () => {
      // Add storey first
      const level = createStoreyLevel(0)
      const storey = store.addStorey('Ground Storey', level)

      const invalidHeight = createLength(-100)
      expect(() => store.updateStoreyHeight(storey.id, invalidHeight)).toThrow('Storey height must be greater than 0')

      // Storey height should remain unchanged
      const unchangedStorey = store.storeys.get(storey.id)
      expect(unchangedStorey?.height).toBe(createLength(3000))
    })

    it('should do nothing if storey does not exist', () => {
      const initialStoreys = new Map(store.storeys)

      // Try to update non-existent storey
      store.updateStoreyHeight(storeyId1, createLength(4000))

      expect(store.storeys).toEqual(initialStoreys)
    })
  })

  describe('getStoreyById', () => {
    it('should return existing storey', () => {
      // Add storey first
      const level = createStoreyLevel(0)
      const addedStorey = store.addStorey('Ground Storey', level)

      // Get the storey
      const storey = store.getStoreyById(addedStorey.id)

      expect(storey).toBeDefined()
      expect(storey?.name).toBe('Ground Storey')
      expect(storey?.level).toBe(level)

      // Should be the same object
      expect(storey).toEqual(addedStorey)
    })

    it('should return null for non-existent storey', () => {
      const storey = store.getStoreyById(storeyId1)
      expect(storey).toBeNull()
    })
  })

  describe('getStoreysOrderedByLevel', () => {
    it('should return empty array when no storeys', () => {
      const storeys = store.getStoreysOrderedByLevel()
      expect(storeys).toEqual([])
    })

    it('should return single storey', () => {
      const level = createStoreyLevel(0)
      const storey = store.addStorey('Ground Storey', level)

      const storeys = store.getStoreysOrderedByLevel()
      expect(storeys).toHaveLength(1)
      expect(storeys[0]).toEqual(storey)
    })

    it('should return storeys ordered by level ascending', () => {
      // Add storeys in random order
      const storey2 = store.addStorey('Second Storey', createStoreyLevel(2))
      const storey0 = store.addStorey('Ground Storey', createStoreyLevel(0))
      const storey1 = store.addStorey('First Storey', createStoreyLevel(1))
      const basementStorey = store.addStorey('Basement', createStoreyLevel(-1))

      const storeys = store.getStoreysOrderedByLevel()
      expect(storeys).toHaveLength(4)

      // Should be ordered by level
      expect(storeys[0].level).toBe(createStoreyLevel(-1))
      expect(storeys[1].level).toBe(createStoreyLevel(0))
      expect(storeys[2].level).toBe(createStoreyLevel(1))
      expect(storeys[3].level).toBe(createStoreyLevel(2))

      expect(storeys[0]).toEqual(basementStorey)
      expect(storeys[1]).toEqual(storey0)
      expect(storeys[2]).toEqual(storey1)
      expect(storeys[3]).toEqual(storey2)
    })
  })

  // Note: Storey entity management is now handled by the entities themselves
  // when they are created with a storeyId parameter. The storeys slice focuses
  // on managing storey properties only.

  describe('complex scenarios', () => {
    it('should handle complex storey management correctly', () => {
      // Create multiple storeys
      const level1 = createStoreyLevel(0)
      const level2 = createStoreyLevel(1)

      const storey1 = store.addStorey('Ground Storey', level1, createLength(3000))
      const storey2 = store.addStorey('First Storey', level2, createLength(2800))

      expect(store.storeys.size).toBe(2)

      // Update storey properties
      store.updateStoreyName(storey1.id, 'Main Storey')
      store.updateStoreyHeight(storey2.id, createLength(3500))

      const updatedStorey1 = store.storeys.get(storey1.id)
      const updatedStorey2 = store.storeys.get(storey2.id)

      expect(updatedStorey1?.name).toBe('Main Storey')
      expect(updatedStorey2?.height).toBe(createLength(3500))

      // Verify ordering
      const orderedStoreys = store.getStoreysOrderedByLevel()
      expect(orderedStoreys[0]).toEqual(updatedStorey1) // Level 0
      expect(orderedStoreys[1]).toEqual(updatedStorey2) // Level 1
    })
  })

  describe('level management operations', () => {
    describe('swapStoreyLevels', () => {
      it('should swap levels between two storeys', () => {
        // Add two storeys
        const level1 = createStoreyLevel(0)
        const level2 = createStoreyLevel(1)
        const storey1 = store.addStorey('Ground Floor', level1)
        const storey2 = store.addStorey('First Floor', level2)

        // Swap their levels
        store.swapStoreyLevels(storey1.id, storey2.id)

        const updatedStorey1 = store.storeys.get(storey1.id)
        const updatedStorey2 = store.storeys.get(storey2.id)

        expect(updatedStorey1?.level).toBe(level2)
        expect(updatedStorey2?.level).toBe(level1)
      })

      it('should do nothing if either storey does not exist', () => {
        const level1 = createStoreyLevel(0)
        const storey1 = store.addStorey('Ground Floor', level1)
        const initialStoreys = new Map(store.storeys)

        // Try to swap with non-existent storey
        store.swapStoreyLevels(storey1.id, 'non-existent' as any)

        expect(store.storeys).toEqual(initialStoreys)
      })
    })

    describe('adjustAllLevels', () => {
      it('should increase all levels by 1', () => {
        // Add storeys at different levels
        const storey1 = store.addStorey('Basement', createStoreyLevel(-1))
        const storey2 = store.addStorey('Ground Floor', createStoreyLevel(0))
        const storey3 = store.addStorey('First Floor', createStoreyLevel(1))

        // Increase all levels by 1
        store.adjustAllLevels(1)

        expect(store.storeys.get(storey1.id)?.level).toBe(0)
        expect(store.storeys.get(storey2.id)?.level).toBe(1)
        expect(store.storeys.get(storey3.id)?.level).toBe(2)
      })

      it('should decrease all levels by 1', () => {
        // Add storeys at different levels
        const storey1 = store.addStorey('Ground Floor', createStoreyLevel(0))
        const storey2 = store.addStorey('First Floor', createStoreyLevel(1))
        const storey3 = store.addStorey('Second Floor', createStoreyLevel(2))

        // Decrease all levels by 1
        store.adjustAllLevels(-1)

        expect(store.storeys.get(storey1.id)?.level).toBe(-1)
        expect(store.storeys.get(storey2.id)?.level).toBe(0)
        expect(store.storeys.get(storey3.id)?.level).toBe(1)
      })
    })

    describe('compactStoreyLevels', () => {
      it('should compact levels with gaps', () => {
        // Add storeys with gaps
        const storey1 = store.addStorey('Ground', createStoreyLevel(0))
        const storey2 = store.addStorey('Third', createStoreyLevel(3))
        const storey3 = store.addStorey('Fifth', createStoreyLevel(5))

        // Manually compact
        store.compactStoreyLevels()

        // Should be compacted to consecutive levels
        const storeys = store.getStoreysOrderedByLevel()
        expect(storeys[0].level).toBe(0)
        expect(storeys[1].level).toBe(1)
        expect(storeys[2].level).toBe(2)

        // Verify the storeys are in correct order
        expect(storeys[0].id).toBe(storey1.id)
        expect(storeys[1].id).toBe(storey2.id)
        expect(storeys[2].id).toBe(storey3.id)
      })

      it('should handle already consecutive levels', () => {
        const storey1 = store.addStorey('Basement', createStoreyLevel(-1))
        const storey2 = store.addStorey('Ground', createStoreyLevel(0))
        const storey3 = store.addStorey('First', createStoreyLevel(1))

        // Compact - should remain unchanged
        store.compactStoreyLevels()

        const storeys = store.getStoreysOrderedByLevel()
        expect(storeys[0].level).toBe(-1)
        expect(storeys[1].level).toBe(0)
        expect(storeys[2].level).toBe(1)

        // Verify storeys are unchanged
        expect(storeys[0].id).toBe(storey1.id)
        expect(storeys[1].id).toBe(storey2.id)
        expect(storeys[2].id).toBe(storey3.id)
      })

      it('should handle empty storeys gracefully', () => {
        expect(() => store.compactStoreyLevels()).not.toThrow()
        expect(store.storeys.size).toBe(0)
      })

      it('should compact towards 0 with mixed levels', () => {
        // Add storeys: [-2, 0, 1] should become [-1, 0, 1]
        const basement = store.addStorey('Basement', createStoreyLevel(-2))
        const ground = store.addStorey('Ground', createStoreyLevel(0))
        const first = store.addStorey('First', createStoreyLevel(1))

        store.compactStoreyLevels()

        const storeys = store.getStoreysOrderedByLevel()
        expect(storeys[0].level).toBe(-1) // Basement compacted from -2 to -1
        expect(storeys[1].level).toBe(0) // Ground stays at 0
        expect(storeys[2].level).toBe(1) // First stays at 1

        expect(storeys[0].id).toBe(basement.id)
        expect(storeys[1].id).toBe(ground.id)
        expect(storeys[2].id).toBe(first.id)
      })

      it('should compact towards 0 with gaps above and below', () => {
        // Add storeys: [-1, 0, 2, 3] should become [-1, 0, 1, 2]
        const basement = store.addStorey('Basement', createStoreyLevel(-1))
        const ground = store.addStorey('Ground', createStoreyLevel(0))
        const second = store.addStorey('Second', createStoreyLevel(2))
        const third = store.addStorey('Third', createStoreyLevel(3))

        store.compactStoreyLevels()

        const storeys = store.getStoreysOrderedByLevel()
        expect(storeys[0].level).toBe(-1) // Basement stays at -1
        expect(storeys[1].level).toBe(0) // Ground stays at 0
        expect(storeys[2].level).toBe(1) // Second compacted from 2 to 1
        expect(storeys[3].level).toBe(2) // Third compacted from 3 to 2

        expect(storeys[0].id).toBe(basement.id)
        expect(storeys[1].id).toBe(ground.id)
        expect(storeys[2].id).toBe(second.id)
        expect(storeys[3].id).toBe(third.id)
      })

      it('should create ground level from above-ground when no ground level exists', () => {
        // Add storeys: [3, 5, 7] should become [0, 1, 2] (lowest becomes ground)
        const third = store.addStorey('Third', createStoreyLevel(3))
        const fifth = store.addStorey('Fifth', createStoreyLevel(5))
        const seventh = store.addStorey('Seventh', createStoreyLevel(7))

        store.compactStoreyLevels()

        const storeys = store.getStoreysOrderedByLevel()
        expect(storeys[0].level).toBe(0) // Third promoted to ground level
        expect(storeys[1].level).toBe(1) // Fifth compacted to 1
        expect(storeys[2].level).toBe(2) // Seventh compacted to 2

        expect(storeys[0].id).toBe(third.id)
        expect(storeys[1].id).toBe(fifth.id)
        expect(storeys[2].id).toBe(seventh.id)
      })

      it('should create ground level from below-ground when only negatives exist', () => {
        // Add storeys: [-5, -3, -1] should become [-2, -1, 0] (highest becomes ground)
        const deepBasement = store.addStorey('Deep Basement', createStoreyLevel(-5))
        const midBasement = store.addStorey('Mid Basement', createStoreyLevel(-3))
        const basement = store.addStorey('Basement', createStoreyLevel(-1))

        store.compactStoreyLevels()

        const storeys = store.getStoreysOrderedByLevel()
        expect(storeys[0].level).toBe(-2) // Deep basement compacted to -2
        expect(storeys[1].level).toBe(-1) // Mid basement compacted to -1
        expect(storeys[2].level).toBe(0) // Basement promoted to ground level

        expect(storeys[0].id).toBe(deepBasement.id)
        expect(storeys[1].id).toBe(midBasement.id)
        expect(storeys[2].id).toBe(basement.id)
      })

      it('should prefer above-ground over below-ground for ground level creation', () => {
        // Add storeys: [-2, 3] should become [-1, 0] (positive level becomes ground)
        const basement = store.addStorey('Basement', createStoreyLevel(-2))
        const third = store.addStorey('Third', createStoreyLevel(3))

        store.compactStoreyLevels()

        const storeys = store.getStoreysOrderedByLevel()
        expect(storeys[0].level).toBe(-1) // Basement compacted to -1
        expect(storeys[1].level).toBe(0) // Third promoted to ground level

        expect(storeys[0].id).toBe(basement.id)
        expect(storeys[1].id).toBe(third.id)
      })
    })
  })
})
