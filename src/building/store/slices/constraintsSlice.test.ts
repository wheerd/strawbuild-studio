import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ConstraintInput } from '@/building/model'
import type { ConstraintEntityId, ConstraintId, PerimeterCornerId, PerimeterWallId } from '@/building/model/ids'

import { type ConstraintsSlice, createConstraintsSlice } from './constraintsSlice'

vi.mock('zustand')

// Test node/wall IDs
const cornerA = 'outcorner_aaa' as PerimeterCornerId
const wallA = 'outwall_aaa' as PerimeterWallId
const wallB = 'outwall_bbb' as PerimeterWallId

describe('constraintsSlice', () => {
  let store: ConstraintsSlice
  let mockSet: any
  let mockGet: any

  beforeEach(() => {
    mockSet = vi.fn()
    mockGet = vi.fn()
    const mockStore = {} as any

    store = createConstraintsSlice(mockSet, mockGet, mockStore)

    mockGet.mockImplementation(() => store)

    mockSet.mockImplementation((updater: any) => {
      if (typeof updater === 'function') {
        updater(store)
      } else {
        store = { ...store, ...updater }
      }
    })
  })

  describe('addBuildingConstraint', () => {
    it('should add a horizontal constraint and return its id', () => {
      const input: ConstraintInput = { type: 'horizontalWall', wall: wallA }

      const id = store.actions.addBuildingConstraint(input)

      expect(id).toMatch(/^constraint_/)
      expect(store.buildingConstraints[id]).toBeDefined()
      expect(store.buildingConstraints[id].type).toBe('horizontalWall')
      expect(store.buildingConstraints[id].id).toBe(id)
    })

    it('should add a distance constraint', () => {
      const input: ConstraintInput = {
        type: 'wallLength',
        wall: wallA,
        side: 'left',
        length: 5000
      }

      const id = store.actions.addBuildingConstraint(input)

      const constraint = store.buildingConstraints[id]
      expect(constraint.type).toBe('wallLength')
      expect(constraint).toHaveProperty('length', 5000)
      expect(constraint).toHaveProperty('side', 'left')
    })

    it('should add a parallel constraint with wall IDs', () => {
      const input: ConstraintInput = { type: 'parallel', wallA, wallB }

      const id = store.actions.addBuildingConstraint(input)

      const constraint = store.buildingConstraints[id]
      expect(constraint.type).toBe('parallel')
      expect(constraint).toHaveProperty('wallA', wallA)
      expect(constraint).toHaveProperty('wallB', wallB)
    })

    it('should add a colinear constraint with three nodes', () => {
      const input: ConstraintInput = {
        type: 'colinearCorner',
        corner: cornerA
      }

      const id = store.actions.addBuildingConstraint(input)

      expect(store.buildingConstraints[id].type).toBe('colinearCorner')
    })

    it('should produce deterministic IDs from the same input', () => {
      const input: ConstraintInput = { type: 'horizontalWall', wall: wallA }

      const id1 = store.actions.addBuildingConstraint(input)
      const id2 = store.actions.addBuildingConstraint(input)

      expect(id1).toBe(id2)
    })

    it('should replace an existing constraint with the same key', () => {
      const input1: ConstraintInput = { type: 'horizontalWall', wall: wallA }
      const input2: ConstraintInput = { type: 'verticalWall', wall: wallA }

      // horizontal and vertical on same nodes share key (hv_ prefix)
      const id1 = store.actions.addBuildingConstraint(input1)
      const id2 = store.actions.addBuildingConstraint(input2)

      expect(id1).toBe(id2)
      expect(store.buildingConstraints[id2].type).toBe('verticalWall')
      expect(Object.keys(store.buildingConstraints)).toHaveLength(1)
    })

    it('should update the reverse index on add', () => {
      const input: ConstraintInput = { type: 'horizontalWall', wall: wallA }

      const id = store.actions.addBuildingConstraint(input)

      expect(store._constraintsByEntity[wallA as ConstraintEntityId]).toContain(id)
    })

    it('should update reverse index when replacing a constraint', () => {
      // First add a wallLength constraint referencing wallA
      const input1: ConstraintInput = {
        type: 'wallLength',
        wall: wallA,
        side: 'left',
        length: 5000
      }
      store.actions.addBuildingConstraint(input1)

      // Replace with a new wallLength constraint with different length
      const input2: ConstraintInput = {
        type: 'wallLength',
        wall: wallA,
        side: 'left',
        length: 6000
      }
      const id = store.actions.addBuildingConstraint(input2)

      // Reverse index should still have exactly one entry per entity
      expect(store._constraintsByEntity[wallA as ConstraintEntityId]).toEqual([id])
    })
  })

  describe('removeBuildingConstraint', () => {
    it('should remove an existing constraint', () => {
      const input: ConstraintInput = { type: 'horizontalWall', wall: wallA }
      const id = store.actions.addBuildingConstraint(input)

      store.actions.removeBuildingConstraint(id)

      expect(store.buildingConstraints[id]).toBeUndefined()
    })

    it('should clean up the reverse index on removal', () => {
      const input: ConstraintInput = { type: 'horizontalWall', wall: wallA }
      const id = store.actions.addBuildingConstraint(input)

      store.actions.removeBuildingConstraint(id)

      expect(store._constraintsByEntity[wallA as ConstraintEntityId]).toBeUndefined()
    })

    it('should handle removing a non-existent constraint gracefully', () => {
      const fakeId = 'constraint_nonexistent' as ConstraintId

      expect(() => {
        store.actions.removeBuildingConstraint(fakeId)
      }).not.toThrow()
    })

    it('should not affect other constraints when removing one', () => {
      const input1: ConstraintInput = { type: 'horizontalWall', wall: wallA }
      const input2: ConstraintInput = {
        type: 'wallLength',
        wall: wallB,
        side: 'left',
        length: 5000
      }
      const id1 = store.actions.addBuildingConstraint(input1)
      const id2 = store.actions.addBuildingConstraint(input2)

      store.actions.removeBuildingConstraint(id1)

      expect(store.buildingConstraints[id1]).toBeUndefined()
      expect(store.buildingConstraints[id2]).toBeDefined()
      // wallB should still be in reverse index (referenced by id2)
      expect(store._constraintsByEntity[wallB as ConstraintEntityId]).toContain(id2)
      // wallA should be gone (only referenced by removed id1)
      expect(store._constraintsByEntity[wallA as ConstraintEntityId]).toBeUndefined()
    })
  })

  describe('removeConstraintsReferencingEntity', () => {
    it('should remove all constraints referencing a corner', () => {
      const input1: ConstraintInput = { type: 'horizontalWall', wall: wallA }
      const input2: ConstraintInput = {
        type: 'wallLength',
        wall: wallA,
        side: 'left',
        length: 5000
      }
      const id1 = store.actions.addBuildingConstraint(input1)
      const id2 = store.actions.addBuildingConstraint(input2)

      // Both constraints reference wallA
      store.actions.removeConstraintsReferencingEntity(wallA as ConstraintEntityId)

      expect(store.buildingConstraints[id1]).toBeUndefined()
      expect(store.buildingConstraints[id2]).toBeUndefined()
      expect(Object.keys(store.buildingConstraints)).toHaveLength(0)
    })

    it('should only remove constraints referencing the specific entity', () => {
      const input1: ConstraintInput = { type: 'horizontalWall', wall: wallA }
      const input2: ConstraintInput = {
        type: 'wallLength',
        wall: wallB,
        side: 'left',
        length: 5000
      }
      store.actions.addBuildingConstraint(input1)
      const id2 = store.actions.addBuildingConstraint(input2)

      // Remove constraints for wallA only
      store.actions.removeConstraintsReferencingEntity(wallA as ConstraintEntityId)

      // Only the horizontal constraint (referencing wallA) should be removed
      expect(Object.keys(store.buildingConstraints)).toHaveLength(1)
      expect(store.buildingConstraints[id2]).toBeDefined()
    })

    it('should remove constraints referencing a wall', () => {
      const input: ConstraintInput = { type: 'parallel', wallA, wallB }
      const id = store.actions.addBuildingConstraint(input)

      store.actions.removeConstraintsReferencingEntity(wallA as ConstraintEntityId)

      expect(store.buildingConstraints[id]).toBeUndefined()
    })

    it('should handle entity with no constraints gracefully', () => {
      expect(() => {
        store.actions.removeConstraintsReferencingEntity(cornerA as ConstraintEntityId)
      }).not.toThrow()
    })

    it('should clean up reverse index entries after removal', () => {
      const input: ConstraintInput = { type: 'horizontalWall', wall: wallA }
      store.actions.addBuildingConstraint(input)

      store.actions.removeConstraintsReferencingEntity(wallA as ConstraintEntityId)

      expect(store._constraintsByEntity[wallA as ConstraintEntityId]).toBeUndefined()
    })
  })

  describe('getBuildingConstraintById', () => {
    it('should return an existing constraint', () => {
      const input: ConstraintInput = { type: 'horizontalWall', wall: wallA }
      const id = store.actions.addBuildingConstraint(input)

      const result = store.actions.getBuildingConstraintById(id)

      expect(result).toBeDefined()
      expect(result?.type).toBe('horizontalWall')
      expect(result?.id).toBe(id)
    })

    it('should return null for a non-existent constraint', () => {
      const fakeId = 'constraint_nonexistent' as ConstraintId

      const result = store.actions.getBuildingConstraintById(fakeId)

      expect(result).toBeNull()
    })
  })

  describe('getAllBuildingConstraints', () => {
    it('should return empty record when no constraints exist', () => {
      const result = store.actions.getAllBuildingConstraints()

      expect(Object.keys(result)).toHaveLength(0)
    })

    it('should return all constraints', () => {
      const input1: ConstraintInput = { type: 'horizontalWall', wall: wallA }
      const input2: ConstraintInput = { type: 'parallel', wallA, wallB }

      store.actions.addBuildingConstraint(input1)
      store.actions.addBuildingConstraint(input2)

      const result = store.actions.getAllBuildingConstraints()

      expect(Object.keys(result)).toHaveLength(2)
    })
  })

  describe('reverse index consistency', () => {
    it('should correctly track multiple constraints per entity', () => {
      const input1: ConstraintInput = { type: 'horizontalWall', wall: wallA }
      const input2: ConstraintInput = {
        type: 'wallLength',
        wall: wallA,
        side: 'left',
        length: 5000
      }

      const id1 = store.actions.addBuildingConstraint(input1)
      const id2 = store.actions.addBuildingConstraint(input2)

      // wallA should be referenced by both constraints
      const refs = store._constraintsByEntity[wallA as ConstraintEntityId]
      expect(refs).toHaveLength(2)
      expect(refs).toContain(id1)
      expect(refs).toContain(id2)
    })

    it('should maintain consistency after add-remove-add cycle', () => {
      const input: ConstraintInput = { type: 'horizontalWall', wall: wallA }

      const id = store.actions.addBuildingConstraint(input)
      store.actions.removeBuildingConstraint(id)

      expect(store._constraintsByEntity[wallA as ConstraintEntityId]).toBeUndefined()

      const id2 = store.actions.addBuildingConstraint(input)
      expect(id2).toBe(id) // deterministic
      expect(store._constraintsByEntity[wallA as ConstraintEntityId]).toEqual([id2])
    })
  })
})
