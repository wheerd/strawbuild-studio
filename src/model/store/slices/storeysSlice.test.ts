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

    describe('duplicateStorey', () => {
      it('should create a copy with next available level', () => {
        const originalStorey = store.addStorey('Ground Floor', createStoreyLevel(0))

        const duplicatedStorey = store.duplicateStorey(originalStorey.id)

        expect(store.storeys.size).toBe(2)
        expect(duplicatedStorey.name).toBe('Ground Floor Copy')
        expect(duplicatedStorey.level).toBe(1)
        expect(duplicatedStorey.height).toBe(originalStorey.height)
        expect(duplicatedStorey.id).not.toBe(originalStorey.id)
      })

      it('should use custom name when provided', () => {
        const originalStorey = store.addStorey('Ground Floor', createStoreyLevel(0))

        const duplicatedStorey = store.duplicateStorey(originalStorey.id, 'Custom Name')

        expect(duplicatedStorey.name).toBe('Custom Name')
      })

      it('should throw error for non-existent storey', () => {
        expect(() => store.duplicateStorey('non-existent' as any)).toThrow('Source storey not found')
      })
    })

    describe('moveStoreyUp', () => {
      it('should swap with storey above when not highest', () => {
        const storey1 = store.addStorey('Ground Floor', createStoreyLevel(0))
        const storey2 = store.addStorey('First Floor', createStoreyLevel(1))
        const storey3 = store.addStorey('Second Floor', createStoreyLevel(2))

        // Move middle storey up
        store.moveStoreyUp(storey2.id)

        expect(store.storeys.get(storey1.id)?.level).toBe(0)
        expect(store.storeys.get(storey2.id)?.level).toBe(2) // Swapped with storey3
        expect(store.storeys.get(storey3.id)?.level).toBe(1) // Swapped with storey2
      })

      it('should increase all levels when moving highest storey up', () => {
        const storey1 = store.addStorey('Basement', createStoreyLevel(-1))
        const storey2 = store.addStorey('Ground Floor', createStoreyLevel(0))

        // Move highest storey up
        store.moveStoreyUp(storey2.id)

        expect(store.storeys.get(storey1.id)?.level).toBe(0)
        expect(store.storeys.get(storey2.id)?.level).toBe(1)
      })

      it('should throw error when moving highest storey would make lowest > 0', () => {
        store.addStorey('Ground Floor', createStoreyLevel(0))
        const storey2 = store.addStorey('First Floor', createStoreyLevel(1))

        expect(() => store.moveStoreyUp(storey2.id)).toThrow(
          'Cannot move floor up: lowest floor would exceed ground level'
        )
      })

      it('should do nothing with single storey', () => {
        const storey = store.addStorey('Ground Floor', createStoreyLevel(0))
        const initialLevel = storey.level

        store.moveStoreyUp(storey.id)

        expect(store.storeys.get(storey.id)?.level).toBe(initialLevel)
      })
    })

    describe('moveStoreyDown', () => {
      it('should swap with storey below when not lowest', () => {
        const storey1 = store.addStorey('Ground Floor', createStoreyLevel(0))
        const storey2 = store.addStorey('First Floor', createStoreyLevel(1))
        const storey3 = store.addStorey('Second Floor', createStoreyLevel(2))

        // Move middle storey down
        store.moveStoreyDown(storey2.id)

        expect(store.storeys.get(storey1.id)?.level).toBe(1) // Swapped with storey2
        expect(store.storeys.get(storey2.id)?.level).toBe(0) // Swapped with storey1
        expect(store.storeys.get(storey3.id)?.level).toBe(2)
      })

      it('should decrease all levels when moving lowest storey down', () => {
        const storey1 = store.addStorey('Ground Floor', createStoreyLevel(0))
        const storey2 = store.addStorey('First Floor', createStoreyLevel(1))

        // Move lowest storey down
        store.moveStoreyDown(storey1.id)

        expect(store.storeys.get(storey1.id)?.level).toBe(-1)
        expect(store.storeys.get(storey2.id)?.level).toBe(0)
      })

      it('should throw error when moving lowest would make highest < 0', () => {
        const storey1 = store.addStorey('Basement', createStoreyLevel(-1))
        store.addStorey('Ground Floor', createStoreyLevel(0))

        expect(() => store.moveStoreyDown(storey1.id)).toThrow(
          'Cannot move floor down: highest floor would go below ground level'
        )
      })

      it('should do nothing with single storey', () => {
        const storey = store.addStorey('Ground Floor', createStoreyLevel(0))
        const initialLevel = storey.level

        store.moveStoreyDown(storey.id)

        expect(store.storeys.get(storey.id)?.level).toBe(initialLevel)
      })
    })
  })
})
