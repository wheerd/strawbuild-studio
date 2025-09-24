import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { StoreyId } from '@/shared/types/ids'
import { createLength } from '@/shared/geometry'
import { createStoreysSlice, type StoreysSlice } from './storeysSlice'

// Mock Zustand following the official testing guide
vi.mock('zustand')

describe('StoreysSlice', () => {
  let store: StoreysSlice

  beforeEach(() => {
    // Create the slice directly without using create()
    const mockSet = vi.fn()
    const mockGet = vi.fn()
    const mockStore = {} as any

    store = createStoreysSlice(mockSet, mockGet, mockStore)

    // Mock the get function to return current state
    mockGet.mockImplementation(() => store)

    // Mock the set function to actually update the store
    mockSet.mockImplementation(updater => {
      if (typeof updater === 'function') {
        const newState = updater(store)
        store = { ...store, ...newState }
      } else {
        store = { ...store, ...updater }
      }
    })

    // Clear the default ground floor for clean tests
    store = { ...store, storeys: {} }
  })

  describe('addStorey', () => {
    it('should add the first storey with level 0', () => {
      const storey = store.actions.addStorey('Ground Floor')

      expect(Object.keys(store.storeys).length).toBe(1)
      expect(storey.id in store.storeys).toBe(true)

      const addedStorey = store.storeys[storey.id]
      expect(addedStorey).toBeDefined()
      expect(addedStorey.name).toBe('Ground Floor')
      expect(addedStorey.level).toBe(0)
      expect(addedStorey.height).toBe(store.defaultHeight)
    })

    it('should add subsequent storeys with incrementing levels', () => {
      const groundFloor = store.actions.addStorey('Ground Floor')
      const firstFloor = store.actions.addStorey('First Floor')
      const secondFloor = store.actions.addStorey('Second Floor')

      expect(Object.keys(store.storeys).length).toBe(3)
      expect(groundFloor.level).toBe(0)
      expect(firstFloor.level).toBe(1)
      expect(secondFloor.level).toBe(2)
    })

    it('should add a storey with custom height', () => {
      const height = createLength(4000)
      const storey = store.actions.addStorey('First Floor', height)

      expect(Object.keys(store.storeys).length).toBe(1)

      const addedStorey = store.storeys[storey.id]
      expect(addedStorey?.height).toBe(height)
    })

    it('should trim storey name whitespace', () => {
      const storey = store.actions.addStorey('  Ground Floor  ')

      const addedStorey = store.storeys[storey.id]
      expect(addedStorey?.name).toBe('Ground Floor')
    })

    it('should throw error for empty storey name', () => {
      expect(() => store.actions.addStorey('')).toThrow('Storey name cannot be empty')
      expect(() => store.actions.addStorey('   ')).toThrow('Storey name cannot be empty')
    })

    it('should throw error for invalid storey height', () => {
      expect(() => store.actions.addStorey('Floor', createLength(0))).toThrow('Storey height must be greater than 0')
    })

    it('should throw error for negative storey height', () => {
      expect(() => store.actions.addStorey('Floor', createLength(-1000))).toThrow(
        'Storey height must be greater than 0'
      )
    })
  })

  describe('removeStorey', () => {
    it('should remove an existing storey and adjust levels', () => {
      const groundFloor = store.actions.addStorey('Ground Floor')
      const firstFloor = store.actions.addStorey('First Floor')
      const secondFloor = store.actions.addStorey('Second Floor')

      // Remove the first floor (level 1)
      store.actions.removeStorey(firstFloor.id)

      expect(Object.keys(store.storeys).length).toBe(2)
      expect(firstFloor.id in store.storeys).toBe(false)
      expect(groundFloor.id in store.storeys).toBe(true)
      expect(secondFloor.id in store.storeys).toBe(true)

      // Second floor should be adjusted from level 2 to level 1
      const adjustedSecondFloor = store.storeys[secondFloor.id]
      expect(adjustedSecondFloor?.level).toBe(1)

      // Ground floor should remain at level 0
      const groundFloorAfter = store.storeys[groundFloor.id]
      expect(groundFloorAfter?.level).toBe(0)
    })

    it('should handle removing non-existent storey gracefully', () => {
      const groundFloor = store.actions.addStorey('Ground Floor')
      const initialSize = Object.keys(store.storeys).length

      store.actions.removeStorey('non-existent' as StoreyId)

      expect(Object.keys(store.storeys).length).toBe(initialSize)
      expect(groundFloor.id in store.storeys).toBe(true)
    })

    it('should prevent removing the last remaining storey', () => {
      const groundFloor = store.actions.addStorey('Ground Floor')

      expect(() => store.actions.removeStorey(groundFloor.id)).toThrow('Cannot remove the last remaining storey')
      expect(Object.keys(store.storeys).length).toBe(1)
      expect(groundFloor.id in store.storeys).toBe(true)
    })

    it('should adjust basement levels correctly when removing', () => {
      // Create floors with basement levels using adjustAllLevels
      store.actions.addStorey('Ground Floor')
      store.actions.addStorey('First Floor')
      store.actions.addStorey('Second Floor')

      // Adjust all levels down by 2 to create basement scenario
      store.actions.adjustAllLevels(-2)

      // Should now have levels -2, -1, 0
      const storeys = store.actions.getStoreysOrderedByLevel()
      expect(storeys[0].level).toBe(-2)
      expect(storeys[1].level).toBe(-1)
      expect(storeys[2].level).toBe(0)

      // Remove the middle basement floor (level -1)
      const middleFloor = storeys[1]
      store.actions.removeStorey(middleFloor.id)

      // Remaining floors should be adjusted
      const remainingStoreys = store.actions.getStoreysOrderedByLevel()
      expect(remainingStoreys).toHaveLength(2)
      expect(remainingStoreys[0].level).toBe(-1) // was -2, adjusted up
      expect(remainingStoreys[1].level).toBe(0) // stays at 0
    })

    it('should update active storey id when removing active storey', () => {
      const floor1 = store.actions.addStorey('Floor 1')
      const floor2 = store.actions.addStorey('Floor 2')

      store.actions.setActiveStorey(floor1.id)
      store.actions.removeStorey(floor1.id)

      expect(store.actions.getActiveStorey()).toBe(floor2.id)
    })
  })

  describe('updateStoreyName', () => {
    it('should update storey name', () => {
      const storey = store.actions.addStorey('Original Name')

      store.actions.updateStoreyName(storey.id, 'Updated Name')

      const updatedStorey = store.storeys[storey.id]
      expect(updatedStorey?.name).toBe('Updated Name')
    })

    it('should trim storey name whitespace when updating', () => {
      const storey = store.actions.addStorey('Original Name')

      store.actions.updateStoreyName(storey.id, '  Updated Name  ')

      const updatedStorey = store.storeys[storey.id]
      expect(updatedStorey?.name).toBe('Updated Name')
    })

    it('should throw error for empty storey name', () => {
      const storey = store.actions.addStorey('Original Name')

      expect(() => store.actions.updateStoreyName(storey.id, '')).toThrow('Storey name cannot be empty')
      expect(() => store.actions.updateStoreyName(storey.id, '   ')).toThrow('Storey name cannot be empty')
    })

    it('should do nothing if storey does not exist', () => {
      const initialStoreys = { ...store.storeys }

      store.actions.updateStoreyName('non-existent' as StoreyId, 'New Name')

      expect(store.storeys).toEqual(initialStoreys)
    })
  })

  describe('updateStoreyHeight', () => {
    it('should update storey height', () => {
      const storey = store.actions.addStorey('Test Floor')
      const newHeight = createLength(3500)

      store.actions.updateStoreyHeight(storey.id, newHeight)

      const updatedStorey = store.storeys[storey.id]
      expect(updatedStorey?.height).toBe(newHeight)
    })

    it('should throw error for invalid storey height', () => {
      const storey = store.actions.addStorey('Test Floor')

      expect(() => store.actions.updateStoreyHeight(storey.id, createLength(0))).toThrow(
        'Storey height must be greater than 0'
      )
    })

    it('should throw error for negative storey height', () => {
      const storey = store.actions.addStorey('Test Floor')

      expect(() => store.actions.updateStoreyHeight(storey.id, createLength(-1000))).toThrow(
        'Storey height must be greater than 0'
      )
    })

    it('should do nothing if storey does not exist', () => {
      const initialStoreys = { ...store.storeys }

      store.actions.updateStoreyHeight('non-existent' as StoreyId, createLength(3000))

      expect(store.storeys).toEqual(initialStoreys)
    })
  })

  describe('getStoreyById', () => {
    it('should return existing storey', () => {
      const storey = store.actions.addStorey('Test Floor')
      const result = store.actions.getStoreyById(storey.id)

      expect(result).toEqual(storey)
    })

    it('should return null for non-existent storey', () => {
      const result = store.actions.getStoreyById('non-existent' as StoreyId)
      expect(result).toBeNull()
    })
  })

  describe('getStoreysOrderedByLevel', () => {
    it('should return empty array when no storeys', () => {
      const result = store.actions.getStoreysOrderedByLevel()
      expect(result).toEqual([])
    })

    it('should return single storey', () => {
      const storey = store.actions.addStorey('Ground Floor')

      const ordered = store.actions.getStoreysOrderedByLevel()

      expect(ordered).toHaveLength(1)
      expect(ordered[0]).toEqual(storey)
    })

    it('should return storeys ordered by level ascending', () => {
      const groundFloor = store.actions.addStorey('Ground Floor')
      const firstFloor = store.actions.addStorey('First Floor')
      const secondFloor = store.actions.addStorey('Second Floor')

      const ordered = store.actions.getStoreysOrderedByLevel()

      expect(ordered).toHaveLength(3)
      expect(ordered[0]).toEqual(groundFloor)
      expect(ordered[1]).toEqual(firstFloor)
      expect(ordered[2]).toEqual(secondFloor)
    })

    it('should handle mixed positive and negative levels', () => {
      store.actions.addStorey('Ground Floor')
      store.actions.addStorey('First Floor')
      store.actions.addStorey('Second Floor')

      // Adjust to create basement
      store.actions.adjustAllLevels(-1)

      const ordered = store.actions.getStoreysOrderedByLevel()

      expect(ordered).toHaveLength(3)
      expect(ordered[0].level).toBe(-1)
      expect(ordered[1].level).toBe(0)
      expect(ordered[2].level).toBe(1)
    })
  })

  describe('level management operations', () => {
    describe('swapStoreyLevels', () => {
      it('should swap levels between two storeys', () => {
        const groundFloor = store.actions.addStorey('Ground Floor')
        const firstFloor = store.actions.addStorey('First Floor')

        store.actions.swapStoreyLevels(groundFloor.id, firstFloor.id)

        const swappedGround = store.storeys[groundFloor.id]
        const swappedFirst = store.storeys[firstFloor.id]

        expect(swappedGround?.level).toBe(1)
        expect(swappedFirst?.level).toBe(0)
      })

      it('should do nothing if either storey does not exist', () => {
        const groundFloor = store.actions.addStorey('Ground Floor')
        const originalLevel = groundFloor.level

        store.actions.swapStoreyLevels(groundFloor.id, 'non-existent' as StoreyId)

        const unchangedGround = store.storeys[groundFloor.id]
        expect(unchangedGround?.level).toBe(originalLevel)
      })
    })

    describe('adjustAllLevels', () => {
      it('should increase all levels by 1 when starting from negative levels', () => {
        const basementFloor = store.actions.addStorey('Basement Floor')
        const groundFloor = store.actions.addStorey('Ground Floor')

        // First adjust to create basement scenario
        store.actions.adjustAllLevels(-1) // Now have levels -1, 0

        // Now we can safely adjust up by 1
        store.actions.adjustAllLevels(1) // Should give us levels 0, 1

        const adjustedBasement = store.storeys[basementFloor.id]
        const adjustedGround = store.storeys[groundFloor.id]

        expect(adjustedBasement?.level).toBe(0)
        expect(adjustedGround?.level).toBe(1)
      })

      it('should decrease all levels by 1', () => {
        const groundFloor = store.actions.addStorey('Ground Floor')
        const firstFloor = store.actions.addStorey('First Floor')

        store.actions.adjustAllLevels(-1)

        const adjustedGround = store.storeys[groundFloor.id]
        const adjustedFirst = store.storeys[firstFloor.id]

        expect(adjustedGround?.level).toBe(-1)
        expect(adjustedFirst?.level).toBe(0)
      })

      it('should throw error if adjustment would create invalid state', () => {
        store.actions.addStorey('Ground Floor')
        store.actions.addStorey('First Floor')

        // This would result in levels 2, 3 which removes level 0
        // Note: The current implementation doesn't actually prevent this case
        // This test may need to be updated based on the actual validation logic
        expect(() => store.actions.adjustAllLevels(2)).toThrow('Adjustment would remove floor 0, which is not allowed')
      })
    })
  })

  describe('level consistency', () => {
    it('should maintain consecutive levels when adding multiple storeys', () => {
      const floors = []
      for (let i = 0; i < 5; i++) {
        floors.push(store.actions.addStorey(`Floor ${i}`))
      }

      const ordered = store.actions.getStoreysOrderedByLevel()
      expect(ordered).toHaveLength(5)

      for (let i = 0; i < 5; i++) {
        expect(ordered[i].level).toBe(i)
      }
    })

    it('should maintain level consistency when removing from middle', () => {
      // Add floors 0, 1, 2, 3, 4
      const floors = []
      for (let i = 0; i < 5; i++) {
        floors.push(store.actions.addStorey(`Floor ${i}`))
      }

      // Remove floor at level 2
      store.actions.removeStorey(floors[2].id)

      const remaining = store.actions.getStoreysOrderedByLevel()
      expect(remaining).toHaveLength(4)
      expect(remaining.map(s => s.level)).toEqual([0, 1, 2, 3])
    })

    it('should handle removing ground floor and adjust all levels', () => {
      const groundFloor = store.actions.addStorey('Ground Floor')
      store.actions.addStorey('First Floor')
      store.actions.addStorey('Second Floor')

      // Remove ground floor (level 0)
      store.actions.removeStorey(groundFloor.id)

      const remaining = store.actions.getStoreysOrderedByLevel()
      expect(remaining).toHaveLength(2)
      expect(remaining[0].level).toBe(0) // first floor becomes ground
      expect(remaining[1].level).toBe(1) // second floor adjusted
    })
  })
})
