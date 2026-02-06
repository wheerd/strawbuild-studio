import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  DistanceConstraint,
  HorizontalConstraint,
  PerimeterCornerId,
  PerimeterWallId,
  VerticalConstraint
} from '@/building/model'

import { buildingConstraintKey } from './constraintTranslator'
import { getGcsActions, getGcsState } from './store'

// Mock building store since populateFromPerimeters depends on it
vi.mock('@/building/store', () => ({
  getModelActions: () => ({
    getPerimeterCornersById: () => [],
    getPerimeterWallsById: () => []
  })
}))

// Mock GCS instance since it requires WASM
vi.mock('@/editor/gcs/gcsInstance', () => ({
  createGcs: () => ({
    push_primitive: vi.fn(),
    clear_data: vi.fn(),
    solve: vi.fn(() => 0),
    apply_solution: vi.fn(),
    gcs: { set_p_param: vi.fn() },
    sketch_index: { get_primitives: () => [] },
    p_param_index: new Map()
  })
}))

const cornerA = 'outcorner_aaa' as PerimeterCornerId
const cornerB = 'outcorner_bbb' as PerimeterCornerId
const cornerC = 'outcorner_ccc' as PerimeterCornerId
const wallA = 'outwall_aaa' as PerimeterWallId
const wallB = 'outwall_bbb' as PerimeterWallId

/**
 * Helper to set up the store with points and lines so that building
 * constraints can reference them.
 */
function setupGeometry(): void {
  const actions = getGcsActions()

  // Add corner points (inside + outside for each corner)
  actions.addPoint(`corner_${cornerA}_in`, 0, 0)
  actions.addPoint(`corner_${cornerA}_out`, 0, -500)
  actions.addPoint(`corner_${cornerB}_in`, 5000, 0)
  actions.addPoint(`corner_${cornerB}_out`, 5000, -500)
  actions.addPoint(`corner_${cornerC}_in`, 5000, 3000)
  actions.addPoint(`corner_${cornerC}_out`, 5500, 3000)

  // Add wall lines (inside + outside for each wall)
  actions.addLine(`wall_${wallA}_in`, `corner_${cornerA}_in`, `corner_${cornerB}_in`)
  actions.addLine(`wall_${wallA}_out`, `corner_${cornerA}_out`, `corner_${cornerB}_out`)
  actions.addLine(`wall_${wallB}_in`, `corner_${cornerB}_in`, `corner_${cornerC}_in`)
  actions.addLine(`wall_${wallB}_out`, `corner_${cornerB}_out`, `corner_${cornerC}_out`)
}

describe('GCS store building constraints', () => {
  beforeEach(() => {
    // zustand mock auto-resets stores between tests
    setupGeometry()
  })

  describe('addBuildingConstraint', () => {
    it('adds a distance constraint and stores it', () => {
      const actions = getGcsActions()
      const constraint: DistanceConstraint = {
        type: 'distance',
        nodeA: cornerA,
        nodeB: cornerB,
        side: 'left',
        length: 5000
      }

      const key = actions.addBuildingConstraint(constraint)

      const state = getGcsState()
      expect(state.buildingConstraints[key]).toEqual(constraint)
    })

    it('returns the deterministic key', () => {
      const actions = getGcsActions()
      const constraint: DistanceConstraint = {
        type: 'distance',
        nodeA: cornerA,
        nodeB: cornerB,
        side: 'left',
        length: 5000
      }

      const key = actions.addBuildingConstraint(constraint)
      expect(key).toBe(buildingConstraintKey(constraint))
    })

    it('adds translated planegcs constraints to the constraints record', () => {
      const actions = getGcsActions()
      const constraint: DistanceConstraint = {
        type: 'distance',
        nodeA: cornerA,
        nodeB: cornerB,
        side: 'left',
        length: 5000
      }

      const key = actions.addBuildingConstraint(constraint)

      const state = getGcsState()
      // The translated constraint should be in the constraints record
      // For a distance constraint, the ID is `bc_${key}`
      const translatedId = `bc_${key}`
      expect(state.constraints[translatedId]).toBeDefined()
      expect(state.constraints[translatedId].type).toBe('p2p_distance')
    })

    it('rejects duplicate constraints', () => {
      const actions = getGcsActions()
      const constraint: DistanceConstraint = {
        type: 'distance',
        nodeA: cornerA,
        nodeB: cornerB,
        side: 'left',
        length: 5000
      }

      const key1 = actions.addBuildingConstraint(constraint)
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      // Same constraint with different length should produce same key
      const constraint2: DistanceConstraint = {
        type: 'distance',
        nodeA: cornerA,
        nodeB: cornerB,
        side: 'right',
        length: 3000
      }
      const key2 = actions.addBuildingConstraint(constraint2)

      expect(key1).toBe(key2)
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('already exists'))

      // Original constraint should not be overwritten
      expect(getGcsState().buildingConstraints[key1]).toEqual(constraint)

      warnSpy.mockRestore()
    })

    it('rejects constraints with swapped node order as duplicates', () => {
      const actions = getGcsActions()
      const constraint1: DistanceConstraint = {
        type: 'distance',
        nodeA: cornerA,
        nodeB: cornerB,
        side: 'left',
        length: 5000
      }
      const constraint2: DistanceConstraint = {
        type: 'distance',
        nodeA: cornerB,
        nodeB: cornerA,
        side: 'right',
        length: 3000
      }

      actions.addBuildingConstraint(constraint1)
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      actions.addBuildingConstraint(constraint2)
      expect(warnSpy).toHaveBeenCalled()
      warnSpy.mockRestore()
    })

    it('prevents contradicting horizontal/vertical constraints', () => {
      const actions = getGcsActions()
      const h: HorizontalConstraint = { type: 'horizontal', nodeA: cornerA, nodeB: cornerB }
      const v: VerticalConstraint = { type: 'vertical', nodeA: cornerA, nodeB: cornerB }

      actions.addBuildingConstraint(h)
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      actions.addBuildingConstraint(v)
      expect(warnSpy).toHaveBeenCalled()

      // Only the horizontal constraint should exist
      const bc = getGcsState().buildingConstraints
      const key = buildingConstraintKey(h)
      expect(bc[key]).toEqual(h)

      warnSpy.mockRestore()
    })

    it('throws when referencing a non-existent corner', () => {
      const actions = getGcsActions()
      const constraint: DistanceConstraint = {
        type: 'distance',
        nodeA: 'outcorner_nonexistent' as PerimeterCornerId,
        nodeB: cornerB,
        side: 'left',
        length: 100
      }

      expect(() => actions.addBuildingConstraint(constraint)).toThrow(/not found/)
    })

    it('throws when referencing a non-existent wall', () => {
      const actions = getGcsActions()
      const constraint = {
        type: 'parallel' as const,
        wallA: 'outwall_nonexistent' as PerimeterWallId,
        wallB
      }

      expect(() => actions.addBuildingConstraint(constraint)).toThrow(/not found/)
    })
  })

  describe('removeBuildingConstraint', () => {
    it('removes the building constraint and its translated constraints', () => {
      const actions = getGcsActions()
      const constraint: HorizontalConstraint = { type: 'horizontal', nodeA: cornerA, nodeB: cornerB }

      const key = actions.addBuildingConstraint(constraint)
      const translatedId = `bc_${key}`

      // Verify both exist
      expect(getGcsState().buildingConstraints[key]).toBeDefined()
      expect(getGcsState().constraints[translatedId]).toBeDefined()

      actions.removeBuildingConstraint(key)

      // Both should be gone
      expect(getGcsState().buildingConstraints[key]).toBeUndefined()
      expect(getGcsState().constraints[translatedId]).toBeUndefined()
    })

    it('allows re-adding after removal', () => {
      const actions = getGcsActions()
      const h: HorizontalConstraint = { type: 'horizontal', nodeA: cornerA, nodeB: cornerB }
      const v: VerticalConstraint = { type: 'vertical', nodeA: cornerA, nodeB: cornerB }

      const key = actions.addBuildingConstraint(h)
      actions.removeBuildingConstraint(key)

      // Should now be able to add vertical on the same nodes
      const key2 = actions.addBuildingConstraint(v)
      expect(key).toBe(key2)
      expect(getGcsState().buildingConstraints[key2]).toEqual(v)
    })

    it('warns when removing a non-existent key', () => {
      const actions = getGcsActions()
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      actions.removeBuildingConstraint('nonexistent_key')
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('not found'))

      warnSpy.mockRestore()
    })

    it('does not affect other building constraints', () => {
      const actions = getGcsActions()
      const h: HorizontalConstraint = { type: 'horizontal', nodeA: cornerA, nodeB: cornerB }
      const dist: DistanceConstraint = {
        type: 'distance',
        nodeA: cornerA,
        nodeB: cornerC,
        side: 'right',
        length: 3000
      }

      const keyH = actions.addBuildingConstraint(h)
      const keyDist = actions.addBuildingConstraint(dist)

      actions.removeBuildingConstraint(keyH)

      expect(getGcsState().buildingConstraints[keyH]).toBeUndefined()
      expect(getGcsState().buildingConstraints[keyDist]).toEqual(dist)
    })
  })
})
