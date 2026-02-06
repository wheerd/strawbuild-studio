import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ConstraintInput, PerimeterCornerId, PerimeterId, PerimeterWallId } from '@/building/model'

import { buildingConstraintKey } from './constraintTranslator'
import { getGcsActions, getGcsState } from './store'

// Mock building store for addPerimeterGeometry and addBuildingConstraint
const mockGetPerimeterCornersById = vi.fn().mockReturnValue([])
const mockGetPerimeterWallsById = vi.fn().mockReturnValue([])
const mockGetPerimeterById = vi.fn().mockReturnValue({ cornerIds: [] })

vi.mock('@/building/store', () => ({
  getModelActions: () => ({
    getPerimeterCornersById: (...args: unknown[]) => mockGetPerimeterCornersById(...args),
    getPerimeterWallsById: (...args: unknown[]) => mockGetPerimeterWallsById(...args),
    getPerimeterById: (...args: unknown[]) => mockGetPerimeterById(...args)
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
const cornerD = 'outcorner_ddd' as PerimeterCornerId
const wallA = 'outwall_aaa' as PerimeterWallId
const wallB = 'outwall_bbb' as PerimeterWallId
const wallC = 'outwall_ccc' as PerimeterWallId
const wallD = 'outwall_ddd' as PerimeterWallId
const perimeterA = 'perimeter_aaa' as PerimeterId
const perimeterB = 'perimeter_bbb' as PerimeterId

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

/** Helper to configure mock model store to return rectangle perimeter data. */
function setupRectangleMocks(perimeterId: PerimeterId): void {
  mockGetPerimeterCornersById.mockImplementation((id: PerimeterId) => {
    if (id !== perimeterId) return []
    return [
      { id: cornerA, insidePoint: [0, 0], outsidePoint: [0, -420] },
      { id: cornerB, insidePoint: [5000, 0], outsidePoint: [5000, -420] },
      { id: cornerC, insidePoint: [5000, 3000], outsidePoint: [5420, 3000] },
      { id: cornerD, insidePoint: [0, 3000], outsidePoint: [-420, 3000] }
    ]
  })
  mockGetPerimeterWallsById.mockImplementation((id: PerimeterId) => {
    if (id !== perimeterId) return []
    return [
      { id: wallA, startCornerId: cornerA, endCornerId: cornerB, thickness: 420 },
      { id: wallB, startCornerId: cornerB, endCornerId: cornerC, thickness: 420 },
      { id: wallC, startCornerId: cornerC, endCornerId: cornerD, thickness: 420 },
      { id: wallD, startCornerId: cornerD, endCornerId: cornerA, thickness: 420 }
    ]
  })
  mockGetPerimeterById.mockImplementation((id: PerimeterId) => {
    if (id !== perimeterId) return undefined
    return { id: perimeterId, cornerIds: [cornerA, cornerB, cornerC, cornerD] }
  })
}

describe('GCS store building constraints', () => {
  beforeEach(() => {
    // zustand mock auto-resets stores between tests
    mockGetPerimeterCornersById.mockReturnValue([])
    mockGetPerimeterWallsById.mockReturnValue([])
    mockGetPerimeterById.mockReturnValue({ cornerIds: [] })
    setupGeometry()
  })

  describe('addBuildingConstraint', () => {
    it('adds a distance constraint and stores it', () => {
      const actions = getGcsActions()
      const constraint: ConstraintInput = {
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
      const constraint: ConstraintInput = {
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
      const constraint: ConstraintInput = {
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
      const constraint: ConstraintInput = {
        type: 'distance',
        nodeA: cornerA,
        nodeB: cornerB,
        side: 'left',
        length: 5000
      }

      const key1 = actions.addBuildingConstraint(constraint)
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(vi.fn())

      // Same constraint with different length should produce same key
      const constraint2: ConstraintInput = {
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
      const constraint1: ConstraintInput = {
        type: 'distance',
        nodeA: cornerA,
        nodeB: cornerB,
        side: 'left',
        length: 5000
      }
      const constraint2: ConstraintInput = {
        type: 'distance',
        nodeA: cornerB,
        nodeB: cornerA,
        side: 'right',
        length: 3000
      }

      actions.addBuildingConstraint(constraint1)
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(vi.fn())
      actions.addBuildingConstraint(constraint2)
      expect(warnSpy).toHaveBeenCalled()
      warnSpy.mockRestore()
    })

    it('prevents contradicting horizontal/vertical constraints', () => {
      const actions = getGcsActions()
      const h: ConstraintInput = { type: 'horizontal', nodeA: cornerA, nodeB: cornerB }
      const v: ConstraintInput = { type: 'vertical', nodeA: cornerA, nodeB: cornerB }

      actions.addBuildingConstraint(h)
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(vi.fn())
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
      const constraint: ConstraintInput = {
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
      const constraint: ConstraintInput = { type: 'horizontal', nodeA: cornerA, nodeB: cornerB }

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
      const h: ConstraintInput = { type: 'horizontal', nodeA: cornerA, nodeB: cornerB }
      const v: ConstraintInput = { type: 'vertical', nodeA: cornerA, nodeB: cornerB }

      const key = actions.addBuildingConstraint(h)
      actions.removeBuildingConstraint(key)

      // Should now be able to add vertical on the same nodes
      const key2 = actions.addBuildingConstraint(v)
      expect(key).toBe(key2)
      expect(getGcsState().buildingConstraints[key2]).toEqual(v)
    })

    it('warns when removing a non-existent key', () => {
      const actions = getGcsActions()
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(vi.fn())

      actions.removeBuildingConstraint('nonexistent_key')
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('not found'))

      warnSpy.mockRestore()
    })

    it('does not affect other building constraints', () => {
      const actions = getGcsActions()
      const h: ConstraintInput = { type: 'horizontal', nodeA: cornerA, nodeB: cornerB }
      const dist: ConstraintInput = {
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

describe('GCS store perimeter geometry', () => {
  beforeEach(() => {
    mockGetPerimeterCornersById.mockReturnValue([])
    mockGetPerimeterWallsById.mockReturnValue([])
    mockGetPerimeterById.mockReturnValue({ cornerIds: [] })
  })

  describe('addPerimeterGeometry', () => {
    it('creates points for each corner (inside + outside)', () => {
      setupRectangleMocks(perimeterA)
      const actions = getGcsActions()

      actions.addPerimeterGeometry(perimeterA)

      const state = getGcsState()
      expect(state.points[`corner_${cornerA}_in`]).toBeDefined()
      expect(state.points[`corner_${cornerA}_out`]).toBeDefined()
      expect(state.points[`corner_${cornerB}_in`]).toBeDefined()
      expect(state.points[`corner_${cornerB}_out`]).toBeDefined()
      expect(state.points[`corner_${cornerC}_in`]).toBeDefined()
      expect(state.points[`corner_${cornerC}_out`]).toBeDefined()
      expect(state.points[`corner_${cornerD}_in`]).toBeDefined()
      expect(state.points[`corner_${cornerD}_out`]).toBeDefined()
    })

    it('seeds point positions from model store geometry', () => {
      setupRectangleMocks(perimeterA)
      const actions = getGcsActions()

      actions.addPerimeterGeometry(perimeterA)

      const state = getGcsState()
      expect(state.points[`corner_${cornerA}_in`].x).toBe(0)
      expect(state.points[`corner_${cornerA}_in`].y).toBe(0)
      expect(state.points[`corner_${cornerA}_out`].x).toBe(0)
      expect(state.points[`corner_${cornerA}_out`].y).toBe(-420)
    })

    it('creates lines for each wall (inside + outside)', () => {
      setupRectangleMocks(perimeterA)
      const actions = getGcsActions()

      actions.addPerimeterGeometry(perimeterA)

      const state = getGcsState()
      expect(state.lines.find(l => l.id === `wall_${wallA}_in`)).toBeDefined()
      expect(state.lines.find(l => l.id === `wall_${wallA}_out`)).toBeDefined()
      expect(state.lines.find(l => l.id === `wall_${wallB}_in`)).toBeDefined()
      expect(state.lines.find(l => l.id === `wall_${wallB}_out`)).toBeDefined()
    })

    it('creates visual lines for each corner', () => {
      setupRectangleMocks(perimeterA)
      const actions = getGcsActions()

      actions.addPerimeterGeometry(perimeterA)

      const state = getGcsState()
      expect(state.visualLines.find(l => l.id === `corner_${cornerA}_line`)).toBeDefined()
      expect(state.visualLines.find(l => l.id === `corner_${cornerB}_line`)).toBeDefined()
    })

    it('creates parallel and thickness constraints for each wall', () => {
      setupRectangleMocks(perimeterA)
      const actions = getGcsActions()

      actions.addPerimeterGeometry(perimeterA)

      const state = getGcsState()
      // 4 walls × 2 constraints each = 8 structural constraints
      expect(state.constraints[`parallel_${wallA}`]).toBeDefined()
      expect(state.constraints[`parallel_${wallA}`].type).toBe('parallel')
      expect(state.constraints[`thickness_${wallA}`]).toBeDefined()
      expect(state.constraints[`thickness_${wallA}`].type).toBe('p2l_distance')
    })

    it('registers the perimeter in perimeterRegistry', () => {
      setupRectangleMocks(perimeterA)
      const actions = getGcsActions()

      actions.addPerimeterGeometry(perimeterA)

      const state = getGcsState()
      const entry = state.perimeterRegistry[perimeterA]
      expect(entry).toBeDefined()
      expect(entry.pointIds).toHaveLength(8) // 4 corners × 2 (in + out)
      expect(entry.lineIds).toHaveLength(8) // 4 walls × 2 (in + out)
      expect(entry.visualLineIds).toHaveLength(4) // 4 corners
      expect(entry.constraintIds).toHaveLength(8) // 4 walls × 2 (parallel + thickness)
    })

    it('updates cornerOrderMap', () => {
      setupRectangleMocks(perimeterA)
      const actions = getGcsActions()

      actions.addPerimeterGeometry(perimeterA)

      const state = getGcsState()
      expect(state.cornerOrderMap.get(perimeterA)).toEqual([cornerA, cornerB, cornerC, cornerD])
    })

    it('handles upsert — removes old data before re-adding', () => {
      setupRectangleMocks(perimeterA)
      const actions = getGcsActions()

      actions.addPerimeterGeometry(perimeterA)

      // Add a building constraint referencing this perimeter's corners
      const constraint: ConstraintInput = { type: 'horizontal', nodeA: cornerA, nodeB: cornerB }
      actions.addBuildingConstraint(constraint)

      // Re-add with same data (upsert)
      actions.addPerimeterGeometry(perimeterA)

      const state = getGcsState()
      // Should still have exactly the right number of points (not doubled)
      expect(Object.keys(state.points)).toHaveLength(8)
      // The building constraint that referenced the old corners should be removed
      expect(Object.keys(state.buildingConstraints)).toHaveLength(0)
    })
  })

  describe('removePerimeterGeometry', () => {
    it('removes all points, lines, visual lines, and constraints', () => {
      setupRectangleMocks(perimeterA)
      const actions = getGcsActions()

      actions.addPerimeterGeometry(perimeterA)
      actions.removePerimeterGeometry(perimeterA)

      const state = getGcsState()
      expect(Object.keys(state.points)).toHaveLength(0)
      expect(state.lines).toHaveLength(0)
      expect(state.visualLines).toHaveLength(0)
      expect(Object.keys(state.constraints)).toHaveLength(0)
    })

    it('removes the perimeter from the registry', () => {
      setupRectangleMocks(perimeterA)
      const actions = getGcsActions()

      actions.addPerimeterGeometry(perimeterA)
      actions.removePerimeterGeometry(perimeterA)

      expect(getGcsState().perimeterRegistry[perimeterA]).toBeUndefined()
    })

    it('removes the perimeter from cornerOrderMap', () => {
      setupRectangleMocks(perimeterA)
      const actions = getGcsActions()

      actions.addPerimeterGeometry(perimeterA)
      actions.removePerimeterGeometry(perimeterA)

      expect(getGcsState().cornerOrderMap.has(perimeterA)).toBe(false)
    })

    it('removes building constraints that reference the perimeter entities', () => {
      setupRectangleMocks(perimeterA)
      const actions = getGcsActions()

      actions.addPerimeterGeometry(perimeterA)

      // Add building constraints referencing this perimeter
      const h: ConstraintInput = { type: 'horizontal', nodeA: cornerA, nodeB: cornerB }
      const dist: ConstraintInput = {
        type: 'distance',
        nodeA: cornerB,
        nodeB: cornerC,
        side: 'right',
        length: 3000
      }
      actions.addBuildingConstraint(h)
      actions.addBuildingConstraint(dist)

      expect(Object.keys(getGcsState().buildingConstraints)).toHaveLength(2)

      actions.removePerimeterGeometry(perimeterA)

      expect(Object.keys(getGcsState().buildingConstraints)).toHaveLength(0)
    })

    it('warns when removing a non-existent perimeter', () => {
      const actions = getGcsActions()
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(vi.fn())

      actions.removePerimeterGeometry(perimeterB)

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('not found'))
      warnSpy.mockRestore()
    })

    it('does not affect other perimeters', () => {
      // Set up two perimeters with distinct corners/walls
      const cornerE = 'outcorner_eee' as PerimeterCornerId
      const cornerF = 'outcorner_fff' as PerimeterCornerId
      const wallE = 'outwall_eee' as PerimeterWallId
      const wallF = 'outwall_fff' as PerimeterWallId

      setupRectangleMocks(perimeterA)
      const originalImpl = mockGetPerimeterCornersById.getMockImplementation()!
      const originalWallImpl = mockGetPerimeterWallsById.getMockImplementation()!
      const originalPerimImpl = mockGetPerimeterById.getMockImplementation()!

      mockGetPerimeterCornersById.mockImplementation((id: PerimeterId) => {
        if (id === perimeterB) {
          return [
            { id: cornerE, insidePoint: [10000, 0], outsidePoint: [10000, -420] },
            { id: cornerF, insidePoint: [15000, 0], outsidePoint: [15000, -420] }
          ]
        }
        return originalImpl(id)
      })
      mockGetPerimeterWallsById.mockImplementation((id: PerimeterId) => {
        if (id === perimeterB) {
          return [
            { id: wallE, startCornerId: cornerE, endCornerId: cornerF, thickness: 420 },
            { id: wallF, startCornerId: cornerF, endCornerId: cornerE, thickness: 420 }
          ]
        }
        return originalWallImpl(id)
      })
      mockGetPerimeterById.mockImplementation((id: PerimeterId) => {
        if (id === perimeterB) {
          return { id: perimeterB, cornerIds: [cornerE, cornerF] }
        }
        return originalPerimImpl(id)
      })

      const actions = getGcsActions()
      actions.addPerimeterGeometry(perimeterA)
      actions.addPerimeterGeometry(perimeterB)

      // Remove only perimeterA
      actions.removePerimeterGeometry(perimeterA)

      const state = getGcsState()
      // PerimeterB should still be intact
      expect(state.perimeterRegistry[perimeterB]).toBeDefined()
      expect(state.points[`corner_${cornerE}_in`]).toBeDefined()
      expect(state.lines.find(l => l.id === `wall_${wallE}_in`)).toBeDefined()
      // PerimeterA should be gone
      expect(state.perimeterRegistry[perimeterA]).toBeUndefined()
      expect(state.points[`corner_${cornerA}_in`]).toBeUndefined()
    })
  })

  describe('removal helpers', () => {
    it('removePoints removes specified points', () => {
      const actions = getGcsActions()
      actions.addPoint('p1', 0, 0)
      actions.addPoint('p2', 1, 1)
      actions.addPoint('p3', 2, 2)

      actions.removePoints(['p1', 'p3'])

      const state = getGcsState()
      expect(state.points.p1).toBeUndefined()
      expect(state.points.p2).toBeDefined()
      expect(state.points.p3).toBeUndefined()
    })

    it('removeLines removes specified lines', () => {
      const actions = getGcsActions()
      actions.addPoint('a', 0, 0)
      actions.addPoint('b', 1, 1)
      actions.addPoint('c', 2, 2)
      actions.addLine('l1', 'a', 'b')
      actions.addLine('l2', 'b', 'c')

      actions.removeLines(['l1'])

      const state = getGcsState()
      expect(state.lines.find(l => l.id === 'l1')).toBeUndefined()
      expect(state.lines.find(l => l.id === 'l2')).toBeDefined()
    })

    it('removeVisualLines removes specified visual lines', () => {
      const actions = getGcsActions()
      actions.addPoint('a', 0, 0)
      actions.addPoint('b', 1, 1)
      actions.addVisualLine('vl1', 'a', 'b')
      actions.addVisualLine('vl2', 'a', 'b')

      actions.removeVisualLines(['vl1'])

      const state = getGcsState()
      expect(state.visualLines.find(l => l.id === 'vl1')).toBeUndefined()
      expect(state.visualLines.find(l => l.id === 'vl2')).toBeDefined()
    })

    it('removeConstraints removes specified constraints', () => {
      const actions = getGcsActions()
      actions.addConstraint({ id: 'c1', type: 'equal', param1: 0, param2: 0 })
      actions.addConstraint({ id: 'c2', type: 'equal', param1: 1, param2: 1 })

      actions.removeConstraints(['c1'])

      const state = getGcsState()
      expect(state.constraints.c1).toBeUndefined()
      expect(state.constraints.c2).toBeDefined()
    })

    it('removal helpers are no-ops for empty arrays', () => {
      const actions = getGcsActions()
      actions.addPoint('p1', 0, 0)

      actions.removePoints([])
      actions.removeLines([])
      actions.removeVisualLines([])
      actions.removeConstraints([])

      expect(getGcsState().points.p1).toBeDefined()
    })
  })
})
