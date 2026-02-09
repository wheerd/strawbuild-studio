import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Constraint, PerimeterCornerId, PerimeterId, PerimeterWallId } from '@/building/model'

import { getGcsActions, getGcsState } from './store'

// Mock building store for addPerimeterGeometry and addBuildingConstraint
const mockGetPerimeterCornersById = vi.fn().mockReturnValue([])
const mockGetPerimeterWallsById = vi.fn().mockReturnValue([])
const mockGetPerimeterById = vi.fn().mockReturnValue({ cornerIds: [] })
const mockGetPerimeterWallById = vi.fn()
const mockGetPerimeterCornerById = vi.fn()

vi.mock('@/building/store', () => ({
  getModelActions: () => ({
    getPerimeterCornersById: (...args: unknown[]) => mockGetPerimeterCornersById(...args),
    getPerimeterWallsById: (...args: unknown[]) => mockGetPerimeterWallsById(...args),
    getPerimeterById: (...args: unknown[]) => mockGetPerimeterById(...args),
    getPerimeterWallById: (...args: unknown[]) => mockGetPerimeterWallById(...args),
    getPerimeterCornerById: (...args: unknown[]) => mockGetPerimeterCornerById(...args)
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

/** Helper to configure getPerimeterWallById so TranslationContext can resolve wall→corner mappings. */
function setupWallCornerMocks(): void {
  mockGetPerimeterWallById.mockImplementation((wallId: PerimeterWallId) => {
    const walls: Record<
      string,
      { id: PerimeterWallId; startCornerId: PerimeterCornerId; endCornerId: PerimeterCornerId }
    > = {
      [wallA]: { id: wallA, startCornerId: cornerA, endCornerId: cornerB },
      [wallB]: { id: wallB, startCornerId: cornerB, endCornerId: cornerC },
      [wallC]: { id: wallC, startCornerId: cornerC, endCornerId: cornerD },
      [wallD]: { id: wallD, startCornerId: cornerD, endCornerId: cornerA }
    }
    const wall = walls[wallId]
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!wall) throw new Error(`Wall "${wallId}" not found`)
    return wall
  })
}

/**
 * Helper to set up the store with points and lines so that building
 * constraints can reference them.
 */
function setupGeometry(): void {
  const actions = getGcsActions()

  // Add corner points (ref + nonref_prev + nonref_next for each corner)
  actions.addPoint(`corner_${cornerA}_ref`, 0, 0)
  actions.addPoint(`corner_${cornerA}_nonref_prev`, 0, -500)
  actions.addPoint(`corner_${cornerA}_nonref_next`, -500, 0)
  actions.addPoint(`corner_${cornerB}_ref`, 5000, 0)
  actions.addPoint(`corner_${cornerB}_nonref_prev`, 5000, -500)
  actions.addPoint(`corner_${cornerB}_nonref_next`, 5500, 0)
  actions.addPoint(`corner_${cornerC}_ref`, 5000, 3000)
  actions.addPoint(`corner_${cornerC}_nonref_prev`, 5500, 3000)
  actions.addPoint(`corner_${cornerC}_nonref_next`, 5000, 3500)
  actions.addPoint(`corner_${cornerD}_ref`, 0, 3000)
  actions.addPoint(`corner_${cornerD}_nonref_prev`, -500, 3000)
  actions.addPoint(`corner_${cornerD}_nonref_next`, 0, 3500)

  // Add wall lines (ref + nonref for each wall)
  actions.addLine(`wall_${wallA}_ref`, `corner_${cornerA}_ref`, `corner_${cornerB}_ref`)
  actions.addLine(`wall_${wallA}_nonref`, `corner_${cornerA}_nonref_next`, `corner_${cornerB}_nonref_prev`)
  actions.addLine(`wall_${wallB}_ref`, `corner_${cornerB}_ref`, `corner_${cornerC}_ref`)
  actions.addLine(`wall_${wallB}_nonref`, `corner_${cornerB}_nonref_next`, `corner_${cornerC}_nonref_prev`)
}

/** Helper to configure mock model store to return rectangle perimeter data. */
function setupRectangleMocks(perimeterId: PerimeterId): void {
  mockGetPerimeterCornersById.mockImplementation((mockId: PerimeterId) => {
    if (mockId !== perimeterId) return []
    return [
      {
        id: cornerA,
        perimeterId: mockId,
        previousWallId: wallD,
        nextWallId: wallA,
        constructedByWall: 'next',
        referencePoint: [0, 0],
        insidePoint: [0, 0],
        outsidePoint: [-420, 0],
        interiorAngle: 90,
        exteriorAngle: 270,
        polygon: []
      },
      {
        id: cornerB,
        perimeterId: mockId,
        previousWallId: wallA,
        nextWallId: wallB,
        constructedByWall: 'next',
        referencePoint: [5000, 0],
        insidePoint: [5000, 0],
        outsidePoint: [5000, -420],
        interiorAngle: 90,
        exteriorAngle: 270,
        polygon: []
      },
      {
        id: cornerC,
        perimeterId: mockId,
        previousWallId: wallB,
        nextWallId: wallC,
        constructedByWall: 'next',
        referencePoint: [5000, 3000],
        insidePoint: [5000, 3000],
        outsidePoint: [5420, 3000],
        interiorAngle: 90,
        exteriorAngle: 270,
        polygon: []
      },
      {
        id: cornerD,
        perimeterId: mockId,
        previousWallId: wallC,
        nextWallId: wallD,
        constructedByWall: 'next',
        referencePoint: [0, 3000],
        insidePoint: [0, 3000],
        outsidePoint: [0, 3420],
        interiorAngle: 90,
        exteriorAngle: 270,
        polygon: []
      }
    ]
  })
  mockGetPerimeterWallsById.mockImplementation((mockId: PerimeterId) => {
    if (mockId !== perimeterId) return []
    return [
      {
        id: wallA,
        perimeterId: mockId,
        startCornerId: cornerA,
        endCornerId: cornerB,
        entityIds: [],
        thickness: 420,
        wallAssemblyId: 'wall_assembly_1',
        insideLength: 5000,
        outsideLength: 5000,
        wallLength: 5000,
        direction: [1, 0],
        outsideDirection: [0, -1],
        insideLine: { start: [0, 0], end: [5000, 0] },
        outsideLine: { start: [-420, 0], end: [5000, -420] },
        polygon: { points: [] }
      },
      {
        id: wallB,
        perimeterId: mockId,
        startCornerId: cornerB,
        endCornerId: cornerC,
        entityIds: [],
        thickness: 420,
        wallAssemblyId: 'wall_assembly_1',
        insideLength: 3000,
        outsideLength: 3000,
        wallLength: 3000,
        direction: [0, 1],
        outsideDirection: [1, 0],
        insideLine: { start: [5000, 0], end: [5000, 3000] },
        outsideLine: { start: [5000, -420], end: [5420, 3000] },
        polygon: { points: [] }
      },
      {
        id: wallC,
        perimeterId: mockId,
        startCornerId: cornerC,
        endCornerId: cornerD,
        entityIds: [],
        thickness: 420,
        wallAssemblyId: 'wall_assembly_1',
        insideLength: 5000,
        outsideLength: 5000,
        wallLength: 5000,
        direction: [-1, 0],
        outsideDirection: [0, 1],
        insideLine: { start: [5000, 3000], end: [0, 3000] },
        outsideLine: { start: [5420, 3000], end: [0, 3420] },
        polygon: { points: [] }
      },
      {
        id: wallD,
        perimeterId: mockId,
        startCornerId: cornerD,
        endCornerId: cornerA,
        entityIds: [],
        thickness: 420,
        wallAssemblyId: 'wall_assembly_1',
        insideLength: 3000,
        outsideLength: 3000,
        wallLength: 3000,
        direction: [0, -1],
        outsideDirection: [-1, 0],
        insideLine: { start: [0, 3000], end: [0, 0] },
        outsideLine: { start: [0, 3420], end: [-420, 0] },
        polygon: { points: [] }
      }
    ]
  })
  mockGetPerimeterById.mockImplementation((mockId: PerimeterId) => {
    if (mockId !== perimeterId) return undefined
    return {
      id: mockId,
      storeyId: 'storey_1',
      wallIds: [wallA, wallB, wallC, wallD],
      cornerIds: [cornerA, cornerB, cornerC, cornerD],
      roomIds: [],
      wallNodeIds: [],
      intermediateWallIds: [],
      referenceSide: 'inside'
    }
  })
}

describe('GCS store building constraints', () => {
  beforeEach(() => {
    // zustand mock auto-resets stores between tests
    mockGetPerimeterCornersById.mockReturnValue([])
    mockGetPerimeterWallsById.mockReturnValue([])
    mockGetPerimeterById.mockReturnValue({ cornerIds: [] })
    mockGetPerimeterWallById.mockReturnValue(undefined)
    mockGetPerimeterCornerById.mockImplementation((cornerId: PerimeterCornerId) => ({
      id: cornerId,
      perimeterId: perimeterA,
      previousWallId: wallA,
      nextWallId: wallB,
      referencePoint: [0, 0]
    }))
    setupGeometry()
    setupWallCornerMocks()
  })

  describe('addBuildingConstraint', () => {
    it('adds a distance constraint and stores it', () => {
      const actions = getGcsActions()
      const constraint: Constraint = {
        id: 'constraint_test',
        type: 'wallLength',
        wall: wallA,
        side: 'left',
        length: 5000
      }

      actions.addBuildingConstraint(constraint)

      const state = getGcsState()
      expect(state.buildingConstraints[constraint.id]).toEqual(constraint)
    })

    it('adds translated planegcs constraints to the constraints record', () => {
      const actions = getGcsActions()
      const constraint: Constraint = {
        id: 'constraint_test',
        type: 'wallLength',
        wall: wallA,
        side: 'left',
        length: 5000
      }

      actions.addBuildingConstraint(constraint)

      const state = getGcsState()
      // The translated constraint should be in the constraints record
      // For a distance constraint, the ID is `bc_${key}`
      const translatedId = `bc_${constraint.id}`
      expect(state.constraints[translatedId]).toBeDefined()
      expect(state.constraints[translatedId].type).toBe('p2p_distance')
    })

    it('rejects duplicate constraints', () => {
      const actions = getGcsActions()
      const constraint: Constraint = {
        id: 'constraint_test',
        type: 'wallLength',
        wall: wallA,
        side: 'left',
        length: 5000
      }

      actions.addBuildingConstraint(constraint)
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(vi.fn())

      // Same constraint with different length should produce same key
      const constraint2: Constraint = {
        id: 'constraint_test',
        type: 'wallLength',
        wall: wallA,
        side: 'right',
        length: 3000
      }
      actions.addBuildingConstraint(constraint2)

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('already exists'))

      // Original constraint should not be overwritten
      expect(getGcsState().buildingConstraints[constraint.id]).toEqual(constraint)

      warnSpy.mockRestore()
    })

    it('throws when referencing a non-existent wall in wallLength', () => {
      const actions = getGcsActions()
      const constraint: Constraint = {
        id: 'constraint_test',
        type: 'wallLength',
        wall: 'outwall_nonexistent' as PerimeterWallId,
        side: 'left',
        length: 100
      }

      expect(() => {
        actions.addBuildingConstraint(constraint)
      }).toThrow(/not found/)
    })

    it('throws when referencing a non-existent wall', () => {
      const actions = getGcsActions()
      const constraint: Constraint = {
        id: 'constraint_test',
        type: 'parallel' as const,
        wallA: 'outwall_nonexistent' as PerimeterWallId,
        wallB
      }

      expect(() => {
        actions.addBuildingConstraint(constraint)
      }).toThrow(/not found/)
    })
  })

  describe('removeBuildingConstraint', () => {
    it('removes the building constraint and its translated constraints', () => {
      const actions = getGcsActions()
      const constraint: Constraint = { id: 'constraint_test', type: 'horizontalWall', wall: wallA }

      actions.addBuildingConstraint(constraint)
      const translatedId = `bc_${constraint.id}`

      // Verify both exist
      expect(getGcsState().buildingConstraints[constraint.id]).toBeDefined()
      expect(getGcsState().constraints[translatedId]).toBeDefined()

      actions.removeBuildingConstraint('constraint_test')

      // Both should be gone
      expect(getGcsState().buildingConstraints[constraint.id]).toBeUndefined()
      expect(getGcsState().constraints[translatedId]).toBeUndefined()
    })

    it('allows re-adding after removal', () => {
      const actions = getGcsActions()
      const h: Constraint = { id: 'constraint_test', type: 'horizontalWall', wall: wallA }
      const v: Constraint = { id: 'constraint_test', type: 'verticalWall', wall: wallA }

      actions.addBuildingConstraint(h)
      actions.removeBuildingConstraint(h.id)

      // Should now be able to add vertical on the same wall
      actions.addBuildingConstraint(v)
      expect(getGcsState().buildingConstraints[v.id]).toEqual(v)
    })

    it('warns when removing a non-existent key', () => {
      const actions = getGcsActions()
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(vi.fn())

      actions.removeBuildingConstraint('constraint_nonexistent')
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('not found'))

      warnSpy.mockRestore()
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
    it('creates 3 points for each corner (ref + nonref_prev + nonref_next)', () => {
      setupRectangleMocks(perimeterA)
      const actions = getGcsActions()

      actions.addPerimeterGeometry(perimeterA)

      const state = getGcsState()
      // Check corner A points
      expect(state.points[`corner_${cornerA}_ref`]).toBeDefined()
      expect(state.points[`corner_${cornerA}_nonref_prev`]).toBeDefined()
      expect(state.points[`corner_${cornerA}_nonref_next`]).toBeDefined()
      // Check corner B points
      expect(state.points[`corner_${cornerB}_ref`]).toBeDefined()
      expect(state.points[`corner_${cornerB}_nonref_prev`]).toBeDefined()
      expect(state.points[`corner_${cornerB}_nonref_next`]).toBeDefined()
      // Check corner C points
      expect(state.points[`corner_${cornerC}_ref`]).toBeDefined()
      expect(state.points[`corner_${cornerC}_nonref_prev`]).toBeDefined()
      expect(state.points[`corner_${cornerC}_nonref_next`]).toBeDefined()
      // Check corner D points
      expect(state.points[`corner_${cornerD}_ref`]).toBeDefined()
      expect(state.points[`corner_${cornerD}_nonref_prev`]).toBeDefined()
      expect(state.points[`corner_${cornerD}_nonref_next`]).toBeDefined()
    })

    it('seeds point positions from model store geometry', () => {
      setupRectangleMocks(perimeterA)
      const actions = getGcsActions()

      actions.addPerimeterGeometry(perimeterA)

      const state = getGcsState()
      expect(state.points[`corner_${cornerA}_ref`].x).toBe(0)
      expect(state.points[`corner_${cornerA}_ref`].y).toBe(0)
      // The non-ref points have thickness offsets applied
      // Corner A's outsidePoint is [-420, 0] (x offset only, wall is horizontal)
      expect(state.points[`corner_${cornerA}_nonref_prev`].x).toBe(-420)
      expect(state.points[`corner_${cornerA}_nonref_prev`].y).toBe(0)
    })

    it('creates 2 lines for each wall (ref + nonref)', () => {
      setupRectangleMocks(perimeterA)
      const actions = getGcsActions()

      actions.addPerimeterGeometry(perimeterA)

      const state = getGcsState()
      expect(state.lines.find(l => l.id === `wall_${wallA}_ref`)).toBeDefined()
      expect(state.lines.find(l => l.id === `wall_${wallA}_nonref`)).toBeDefined()
      expect(state.lines.find(l => l.id === `wall_${wallB}_ref`)).toBeDefined()
      expect(state.lines.find(l => l.id === `wall_${wallB}_nonref`)).toBeDefined()
    })

    it('creates p2p_coincident constraints for non-colinear corners', () => {
      setupRectangleMocks(perimeterA)
      const actions = getGcsActions()

      actions.addPerimeterGeometry(perimeterA)

      const state = getGcsState()
      // For rectangle (all 90° interior angles), each corner gets 1 p2p_coincident constraint
      expect(state.constraints[`corner_${cornerA}_nonref_eq`]).toBeDefined()
      expect(state.constraints[`corner_${cornerA}_nonref_eq`].type).toBe('p2p_coincident')
      expect(state.constraints[`corner_${cornerB}_nonref_eq`]).toBeDefined()
      expect(state.constraints[`corner_${cornerB}_nonref_eq`].type).toBe('p2p_coincident')
    })

    it('creates perpendicular_pppp constraints for colinear corners', () => {
      setupRectangleMocks(perimeterA)
      const actions = getGcsActions()

      // Override corner B to be colinear (180° interior angle)
      mockGetPerimeterCornersById.mockImplementation((mockId: PerimeterId) => {
        if (mockId !== perimeterA) return []
        return [
          {
            id: cornerA,
            perimeterId: mockId,
            previousWallId: wallD,
            nextWallId: wallA,
            constructedByWall: 'next',
            referencePoint: [0, 0],
            insidePoint: [0, 0],
            outsidePoint: [-420, 0],
            interiorAngle: 90,
            exteriorAngle: 270,
            polygon: []
          },
          {
            id: cornerB,
            perimeterId: mockId,
            previousWallId: wallA,
            nextWallId: wallB,
            constructedByWall: 'next',
            referencePoint: [5000, 0],
            insidePoint: [5000, 0],
            outsidePoint: [5000, -420],
            interiorAngle: 180,
            exteriorAngle: 180,
            polygon: []
          },
          {
            id: cornerC,
            perimeterId: mockId,
            previousWallId: wallB,
            nextWallId: wallC,
            constructedByWall: 'next',
            referencePoint: [10000, 0],
            insidePoint: [10000, 0],
            outsidePoint: [10420, 0],
            interiorAngle: 90,
            exteriorAngle: 270,
            polygon: []
          },
          {
            id: cornerD,
            perimeterId: mockId,
            previousWallId: wallC,
            nextWallId: wallD,
            constructedByWall: 'next',
            referencePoint: [0, 3000],
            insidePoint: [0, 3000],
            outsidePoint: [0, 3420],
            interiorAngle: 90,
            exteriorAngle: 270,
            polygon: []
          }
        ]
      })
      mockGetPerimeterWallsById.mockImplementation((mockId: PerimeterId) => {
        if (mockId !== perimeterA) return []
        return [
          {
            id: wallA,
            perimeterId: mockId,
            startCornerId: cornerA,
            endCornerId: cornerB,
            entityIds: [],
            thickness: 420,
            wallAssemblyId: 'wall_assembly_1',
            insideLength: 5000,
            outsideLength: 5000,
            wallLength: 5000,
            direction: [1, 0],
            outsideDirection: [0, -1],
            insideLine: { start: [0, 0], end: [5000, 0] },
            outsideLine: { start: [-420, 0], end: [5000, -420] },
            polygon: { points: [] }
          },
          {
            id: wallB,
            perimeterId: mockId,
            startCornerId: cornerB,
            endCornerId: cornerC,
            entityIds: [],
            thickness: 420,
            wallAssemblyId: 'wall_assembly_1',
            insideLength: 5000,
            outsideLength: 5000,
            wallLength: 5000,
            direction: [1, 0],
            outsideDirection: [0, -1],
            insideLine: { start: [5000, 0], end: [10000, 0] },
            outsideLine: { start: [5000, -420], end: [10420, 0] },
            polygon: { points: [] }
          },
          {
            id: wallC,
            perimeterId: mockId,
            startCornerId: cornerC,
            endCornerId: cornerD,
            entityIds: [],
            thickness: 420,
            wallAssemblyId: 'wall_assembly_1',
            insideLength: 3000,
            outsideLength: 3000,
            wallLength: 3000,
            direction: [-1, 0],
            outsideDirection: [0, 1],
            insideLine: { start: [10000, 0], end: [0, 3000] },
            outsideLine: { start: [10420, 0], end: [0, 3420] },
            polygon: { points: [] }
          },
          {
            id: wallD,
            perimeterId: mockId,
            startCornerId: cornerD,
            endCornerId: cornerA,
            entityIds: [],
            thickness: 420,
            wallAssemblyId: 'wall_assembly_1',
            insideLength: 3000,
            outsideLength: 3000,
            wallLength: 3000,
            direction: [0, -1],
            outsideDirection: [-1, 0],
            insideLine: { start: [0, 3000], end: [0, 0] },
            outsideLine: { start: [0, 3420], end: [-420, 0] },
            polygon: { points: [] }
          }
        ]
      })

      actions.addPerimeterGeometry(perimeterA)

      const state = getGcsState()
      // Colinear corner B should have 2 perpendicular_pppp constraints
      expect(state.constraints[`corner_${cornerB}_nonref_perp1`]).toBeDefined()
      expect(state.constraints[`corner_${cornerB}_nonref_perp1`].type).toBe('perpendicular_pppp')
      expect(state.constraints[`corner_${cornerB}_nonref_perp2`]).toBeDefined()
      expect(state.constraints[`corner_${cornerB}_nonref_perp2`].type).toBe('perpendicular_pppp')
    })

    it('registers the perimeter in perimeterRegistry', () => {
      setupRectangleMocks(perimeterA)
      const actions = getGcsActions()

      actions.addPerimeterGeometry(perimeterA)

      const state = getGcsState()
      const entry = state.perimeterRegistry[perimeterA]
      expect(entry).toBeDefined()
      expect(entry.pointIds).toHaveLength(12)
      expect(entry.lineIds).toHaveLength(8)
      // 4 corners × 1 p2p_coincident constraint each = 4 structural constraints
      // 4 walls × 2 constraint each = 8
      expect(entry.constraintIds).toHaveLength(12)
    })

    it('handles upsert — removes old data before re-adding', () => {
      setupRectangleMocks(perimeterA)
      const actions = getGcsActions()

      actions.addPerimeterGeometry(perimeterA)

      // Add a building constraint referencing this perimeter's corners
      const constraint: Constraint = { id: 'constraint_test', type: 'horizontalWall', wall: wallA }
      actions.addBuildingConstraint(constraint)

      // Re-add with same data (upsert)
      actions.addPerimeterGeometry(perimeterA)

      const state = getGcsState()
      // Should still have exactly the right number of points (not doubled)
      expect(Object.keys(state.points)).toHaveLength(12)
      // Building constraints are NOT cascade-removed by the GCS store;
      // that responsibility belongs to gcsSync's constraint subscription.
      expect(Object.keys(state.buildingConstraints)).toHaveLength(1)
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
      expect(Object.keys(state.constraints)).toHaveLength(0)
    })

    it('removes the perimeter from the registry', () => {
      setupRectangleMocks(perimeterA)
      const actions = getGcsActions()

      actions.addPerimeterGeometry(perimeterA)
      actions.removePerimeterGeometry(perimeterA)

      expect(getGcsState().perimeterRegistry[perimeterA]).toBeUndefined()
    })

    it('does not cascade-remove building constraints (handled by gcsSync)', () => {
      setupRectangleMocks(perimeterA)
      const actions = getGcsActions()

      actions.addPerimeterGeometry(perimeterA)

      // Add building constraints referencing this perimeter
      const h: Constraint = { id: 'constraint_test1', type: 'horizontalWall', wall: wallA }
      const dist: Constraint = {
        id: 'constraint_test2',
        type: 'wallLength',
        wall: wallB,
        side: 'right',
        length: 3000
      }
      actions.addBuildingConstraint(h)
      actions.addBuildingConstraint(dist)

      expect(Object.keys(getGcsState().buildingConstraints)).toHaveLength(2)

      actions.removePerimeterGeometry(perimeterA)

      // Building constraints remain in the GCS store; cascade removal is
      // handled by gcsSync's constraint subscription, not by removePerimeterGeometry.
      expect(Object.keys(getGcsState().buildingConstraints)).toHaveLength(2)
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
      const originalWallByIdImpl = mockGetPerimeterWallById.getMockImplementation()!

      mockGetPerimeterCornersById.mockImplementation((id: PerimeterId) => {
        if (id === perimeterB) {
          return [
            {
              id: cornerE,
              perimeterId: id,
              previousWallId: wallF,
              nextWallId: wallE,
              constructedByWall: 'next',
              referencePoint: [10000, 0],
              insidePoint: [10000, 0],
              outsidePoint: [10000, -420],
              interiorAngle: 90,
              exteriorAngle: 270,
              polygon: []
            },
            {
              id: cornerF,
              perimeterId: id,
              previousWallId: wallE,
              nextWallId: wallF,
              constructedByWall: 'next',
              referencePoint: [15000, 0],
              insidePoint: [15000, 0],
              outsidePoint: [15000, -420],
              interiorAngle: 90,
              exteriorAngle: 270,
              polygon: []
            }
          ]
        }
        return originalImpl(id)
      })
      mockGetPerimeterWallsById.mockImplementation((id: PerimeterId) => {
        if (id === perimeterB) {
          return [
            {
              id: wallE,
              perimeterId: id,
              startCornerId: cornerE,
              endCornerId: cornerF,
              entityIds: [],
              thickness: 420,
              wallAssemblyId: 'wall_assembly_1'
            },
            {
              id: wallF,
              perimeterId: id,
              startCornerId: cornerF,
              endCornerId: cornerE,
              entityIds: [],
              thickness: 420,
              wallAssemblyId: 'wall_assembly_1'
            }
          ]
        }
        return originalWallImpl(id)
      })
      mockGetPerimeterById.mockImplementation((id: PerimeterId) => {
        if (id === perimeterB) {
          return {
            id: perimeterB,
            storeyId: 'storey_1',
            wallIds: [wallE, wallF],
            cornerIds: [cornerE, cornerF],
            roomIds: [],
            wallNodeIds: [],
            intermediateWallIds: [],
            referenceSide: 'inside'
          }
        }
        return originalPerimImpl(id)
      })
      mockGetPerimeterWallById.mockImplementation((wallId: PerimeterWallId) => {
        if (wallId === wallE || wallId === wallF) {
          const walls: Record<
            string,
            { id: PerimeterWallId; startCornerId: PerimeterCornerId; endCornerId: PerimeterCornerId }
          > = {
            [wallE]: { id: wallE, startCornerId: cornerE, endCornerId: cornerF },
            [wallF]: { id: wallF, startCornerId: cornerF, endCornerId: cornerE }
          }
          return walls[wallId]
        }
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        return originalWallByIdImpl!(wallId)
      })

      const actions = getGcsActions()
      actions.addPerimeterGeometry(perimeterA)
      actions.addPerimeterGeometry(perimeterB)

      // Remove only perimeterA
      actions.removePerimeterGeometry(perimeterA)

      const state = getGcsState()
      // PerimeterB should still be intact
      expect(state.perimeterRegistry[perimeterB]).toBeDefined()
      expect(state.points[`corner_${cornerE}_ref`]).toBeDefined()
      expect(state.lines.find(l => l.id === `wall_${wallE}_ref`)).toBeDefined()
      // PerimeterA should be gone
      expect(state.perimeterRegistry[perimeterA]).toBeUndefined()
      expect(state.points[`corner_${cornerA}_ref`]).toBeUndefined()
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
      actions.removeConstraints([])

      expect(getGcsState().points.p1).toBeDefined()
    })
  })
})
