import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Constraint, ConstraintId, NodeId, Perimeter, PerimeterId, StoreyId } from '@/building/model'

// --- Mock state ---

let mockActiveStoreyId: StoreyId = 'storey_1' as StoreyId
const mockPerimetersByStorey: Record<StoreyId, Perimeter[]> = {}
const mockPerimeterRegistry: Record<PerimeterId, unknown> = {}
const mockPerimetersById: Record<PerimeterId, Perimeter> = {}
const mockBuildingConstraints: Record<ConstraintId, Constraint> = {}

// Captured subscription callbacks
let capturedStoreySelector: ((state: unknown) => unknown) | null = null
let capturedStoreyListener: ((newVal: unknown, oldVal: unknown) => void) | null = null
let capturedPerimeterCallback: ((current?: Perimeter, previous?: Perimeter) => void) | null = null
let capturedConstraintCallback: ((current?: Constraint, previous?: Constraint) => void) | null = null

// Mock GCS actions
const mockAddPerimeterGeometry = vi.fn()
const mockRemovePerimeterGeometry = vi.fn()
const mockGcsAddBuildingConstraint = vi.fn()
const mockGcsRemoveBuildingConstraint = vi.fn()

// Mock building store
vi.mock('@/building/store', () => ({
  getModelActions: () => ({
    getActiveStoreyId: () => mockActiveStoreyId,
    getPerimetersByStorey: (storeyId: StoreyId) => mockPerimetersByStorey[storeyId] ?? [],
    getPerimeterById: (perimeterId: PerimeterId) => mockPerimetersById[perimeterId],
    getAllBuildingConstraints: () => mockBuildingConstraints
  }),
  subscribeToModelChanges: (
    selector: (state: unknown) => unknown,
    listener: (newVal: unknown, oldVal: unknown) => void
  ) => {
    capturedStoreySelector = selector
    capturedStoreyListener = listener
    return vi.fn() // unsubscribe
  },
  subscribeToPerimeters: (cb: (current?: Perimeter, previous?: Perimeter) => void) => {
    capturedPerimeterCallback = cb
    return vi.fn() // unsubscribe
  },
  subscribeToConstraints: (cb: (current?: Constraint, previous?: Constraint) => void) => {
    capturedConstraintCallback = cb
    return vi.fn() // unsubscribe
  }
}))

// Mock GCS store
vi.mock('./store', () => ({
  getGcsActions: () => ({
    addPerimeterGeometry: (...args: unknown[]) => mockAddPerimeterGeometry(...args),
    removePerimeterGeometry: (...args: unknown[]) => mockRemovePerimeterGeometry(...args),
    addBuildingConstraint: (...args: unknown[]) => mockGcsAddBuildingConstraint(...args),
    removeBuildingConstraint: (...args: unknown[]) => mockGcsRemoveBuildingConstraint(...args)
  }),
  getGcsState: () => ({
    perimeterRegistry: mockPerimeterRegistry
  })
}))

// Reset state before each test
beforeEach(() => {
  vi.resetAllMocks()
  capturedStoreySelector = null
  capturedStoreyListener = null
  capturedPerimeterCallback = null
  capturedConstraintCallback = null
  mockActiveStoreyId = 'storey_1' as StoreyId

  // Clear mutable objects
  for (const key of Object.keys(mockPerimetersByStorey) as StoreyId[]) {
    delete mockPerimetersByStorey[key]
  }
  for (const key of Object.keys(mockPerimeterRegistry) as PerimeterId[]) {
    delete mockPerimeterRegistry[key]
  }
  for (const key of Object.keys(mockPerimetersById) as PerimeterId[]) {
    delete mockPerimetersById[key]
  }
  for (const key of Object.keys(mockBuildingConstraints) as ConstraintId[]) {
    delete mockBuildingConstraints[key]
  }
})

function importGcsSync(): Promise<void> {
  // Reset the module registry so the constructor runs fresh each time
  vi.resetModules()
  return import('./gcsSync') as unknown as Promise<void>
}

function makePerimeter(id: string, storeyId: string, cornerIds: string[] = [], wallIds: string[] = []): Perimeter {
  const perimeter = {
    id: id as PerimeterId,
    storeyId: storeyId as StoreyId,
    cornerIds: cornerIds as Perimeter['cornerIds'],
    wallIds: wallIds as Perimeter['wallIds']
  } as Perimeter

  // Also register in the mock so getPerimeterById returns it
  mockPerimetersById[id as PerimeterId] = perimeter

  return perimeter
}

describe('GcsSyncService', () => {
  describe('initialization', () => {
    it('sets up subscriptions on import', async () => {
      await importGcsSync()

      // All subscription callbacks should have been captured
      expect(capturedStoreyListener).toBeTypeOf('function')
      expect(capturedPerimeterCallback).toBeTypeOf('function')
      expect(capturedConstraintCallback).toBeTypeOf('function')
    })

    it('captures a storey selector that selects activeStoreyId', async () => {
      await importGcsSync()

      expect(capturedStoreySelector).toBeTypeOf('function')
      const result = capturedStoreySelector!({ activeStoreyId: 'test_storey' })
      expect(result).toBe('test_storey')
    })
  })

  describe('perimeter addition', () => {
    it('calls addPerimeterGeometry when a perimeter is added to the active storey', async () => {
      await importGcsSync()

      const perimeter = makePerimeter('p1', 'storey_1')
      capturedPerimeterCallback!(perimeter, undefined)

      expect(mockAddPerimeterGeometry).toHaveBeenCalledWith('p1')
      expect(mockAddPerimeterGeometry).toHaveBeenCalledTimes(1)
    })

    it('ignores perimeters added to a non-active storey', async () => {
      await importGcsSync()

      const perimeter = makePerimeter('p1', 'storey_other')
      capturedPerimeterCallback!(perimeter, undefined)

      expect(mockAddPerimeterGeometry).not.toHaveBeenCalled()
    })
  })

  describe('perimeter removal', () => {
    it('calls removePerimeterGeometry when a tracked perimeter is removed', async () => {
      // Simulate that 'p1' is already in the GCS registry
      mockPerimeterRegistry['p1' as PerimeterId] = { pointIds: [] }

      await importGcsSync()

      const perimeter = makePerimeter('p1', 'storey_1')
      capturedPerimeterCallback!(undefined, perimeter)

      expect(mockRemovePerimeterGeometry).toHaveBeenCalledWith('p1')
      expect(mockRemovePerimeterGeometry).toHaveBeenCalledTimes(1)
    })

    it('does not call removePerimeterGeometry when an untracked perimeter is removed', async () => {
      // Registry is empty — perimeter is not tracked
      await importGcsSync()

      const perimeter = makePerimeter('p1', 'storey_1')
      capturedPerimeterCallback!(undefined, perimeter)

      expect(mockRemovePerimeterGeometry).not.toHaveBeenCalled()
    })
  })

  describe('perimeter update', () => {
    it('calls addPerimeterGeometry (upsert) when a perimeter in active storey is updated', async () => {
      await importGcsSync()

      const prev = makePerimeter('p1', 'storey_1', ['c1', 'c2'])
      const curr = makePerimeter('p1', 'storey_1', ['c1', 'c2', 'c3'])
      capturedPerimeterCallback!(curr, prev)

      expect(mockAddPerimeterGeometry).toHaveBeenCalledWith('p1')
      expect(mockAddPerimeterGeometry).toHaveBeenCalledTimes(1)
    })

    it('removes perimeter if updated storeyId moves it away from active storey', async () => {
      // Perimeter is currently tracked
      mockPerimeterRegistry['p1' as PerimeterId] = { pointIds: [] }

      await importGcsSync()

      const prev = makePerimeter('p1', 'storey_1')
      const curr = makePerimeter('p1', 'storey_other')
      capturedPerimeterCallback!(curr, prev)

      expect(mockRemovePerimeterGeometry).toHaveBeenCalledWith('p1')
      expect(mockAddPerimeterGeometry).not.toHaveBeenCalled()
    })

    it('does not remove untracked perimeter when storey changes away', async () => {
      // Registry is empty
      await importGcsSync()

      const prev = makePerimeter('p1', 'storey_1')
      const curr = makePerimeter('p1', 'storey_other')
      capturedPerimeterCallback!(curr, prev)

      expect(mockRemovePerimeterGeometry).not.toHaveBeenCalled()
      expect(mockAddPerimeterGeometry).not.toHaveBeenCalled()
    })
  })

  describe('active storey change', () => {
    it('removes all tracked perimeters and adds perimeters of the new storey', async () => {
      // Two perimeters currently tracked in registry
      mockPerimeterRegistry['p1' as PerimeterId] = { pointIds: [] }
      mockPerimeterRegistry['p2' as PerimeterId] = { pointIds: [] }

      // New storey has two different perimeters
      const newStoreyId = 'storey_2' as StoreyId
      mockPerimetersByStorey[newStoreyId] = [makePerimeter('p3', 'storey_2'), makePerimeter('p4', 'storey_2')]

      await importGcsSync()

      // Simulate active storey change
      capturedStoreyListener!(newStoreyId, 'storey_1')

      // Should have removed both old perimeters
      expect(mockRemovePerimeterGeometry).toHaveBeenCalledWith('p1')
      expect(mockRemovePerimeterGeometry).toHaveBeenCalledWith('p2')
      expect(mockRemovePerimeterGeometry).toHaveBeenCalledTimes(2)

      // Should have added both new perimeters
      expect(mockAddPerimeterGeometry).toHaveBeenCalledWith('p3')
      expect(mockAddPerimeterGeometry).toHaveBeenCalledWith('p4')
      expect(mockAddPerimeterGeometry).toHaveBeenCalledTimes(2)
    })

    it('does nothing if new storey has no perimeters and registry is empty', async () => {
      const newStoreyId = 'storey_empty' as StoreyId

      await importGcsSync()

      capturedStoreyListener!(newStoreyId, 'storey_1')

      expect(mockRemovePerimeterGeometry).not.toHaveBeenCalled()
      expect(mockAddPerimeterGeometry).not.toHaveBeenCalled()
    })

    it('updates internal activeStoreyId so subsequent perimeter additions use new storey', async () => {
      const newStoreyId = 'storey_2' as StoreyId
      mockPerimetersByStorey[newStoreyId] = []

      await importGcsSync()

      // Switch to storey_2
      capturedStoreyListener!(newStoreyId, 'storey_1')
      mockAddPerimeterGeometry.mockClear()

      // Now a perimeter added to storey_2 should be picked up
      const perimeter = makePerimeter('p5', 'storey_2')
      capturedPerimeterCallback!(perimeter, undefined)
      expect(mockAddPerimeterGeometry).toHaveBeenCalledWith('p5')

      // But a perimeter added to storey_1 (old) should be ignored
      mockAddPerimeterGeometry.mockClear()
      const oldPerimeter = makePerimeter('p6', 'storey_1')
      capturedPerimeterCallback!(oldPerimeter, undefined)
      expect(mockAddPerimeterGeometry).not.toHaveBeenCalled()
    })
  })

  describe('constraint propagation', () => {
    const makeConstraint = (id: string, nodeA: string, nodeB: string): Constraint => ({
      id: `constraint_${id}`,
      type: 'horizontal',
      nodeA: nodeA as NodeId,
      nodeB: nodeB as NodeId
    })

    it('adds constraint to GCS store when a new constraint appears in model store', async () => {
      await importGcsSync()

      const constraint = makeConstraint('1', 'cornerA', 'cornerB')
      capturedConstraintCallback!(constraint, undefined)

      expect(mockGcsAddBuildingConstraint).toHaveBeenCalledTimes(1)
      // Should strip `id` field
      const calledWith = mockGcsAddBuildingConstraint.mock.calls[0][0]
      expect(calledWith).toEqual({ type: 'horizontal', nodeA: 'cornerA', nodeB: 'cornerB' })
      expect(calledWith).not.toHaveProperty('id')
    })

    it('removes constraint from GCS store when a constraint is removed from model store', async () => {
      await importGcsSync()

      const constraint = makeConstraint('1', 'cornerA', 'cornerB')
      capturedConstraintCallback!(undefined, constraint)

      expect(mockGcsRemoveBuildingConstraint).toHaveBeenCalledTimes(1)
      // The key is derived from the constraint input (buildingConstraintKey)
      expect(mockGcsRemoveBuildingConstraint).toHaveBeenCalledWith(expect.any(String))
    })

    it('removes old and adds new constraint when a constraint is updated', async () => {
      await importGcsSync()

      const prev = makeConstraint('1', 'cornerA', 'cornerB')
      const curr: Constraint = {
        id: `constraint_1` as Constraint['id'],
        type: 'vertical',
        nodeA: 'cornerA' as NodeId,
        nodeB: 'cornerB' as NodeId
      }
      capturedConstraintCallback!(curr, prev)

      expect(mockGcsRemoveBuildingConstraint).toHaveBeenCalledTimes(1)
      expect(mockGcsAddBuildingConstraint).toHaveBeenCalledTimes(1)
      const calledWith = mockGcsAddBuildingConstraint.mock.calls[0][0]
      expect(calledWith).toEqual({ type: 'vertical', nodeA: 'cornerA', nodeB: 'cornerB' })
    })

    it('warns but does not throw when GCS geometry does not exist yet', async () => {
      mockGcsAddBuildingConstraint.mockImplementation(() => {
        throw new Error('corner not found')
      })
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(vi.fn())

      await importGcsSync()

      const constraint = makeConstraint('1', 'cornerA', 'cornerB')

      // Should not throw
      expect(() => {
        capturedConstraintCallback!(constraint, undefined)
      }).not.toThrow()

      // Should have logged a warning
      expect(warnSpy).toHaveBeenCalledTimes(1)
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to add building constraint'),
        expect.any(Error)
      )

      warnSpy.mockRestore()
    })

    it('does nothing when both current and previous are undefined', async () => {
      await importGcsSync()

      capturedConstraintCallback!(undefined, undefined)

      expect(mockGcsAddBuildingConstraint).not.toHaveBeenCalled()
      expect(mockGcsRemoveBuildingConstraint).not.toHaveBeenCalled()
    })
  })

  describe('constraint re-sync after perimeter geometry creation', () => {
    const makeConstraintWithCorners = (id: string, nodeA: string, nodeB: string): Constraint => ({
      id: `constraint_${id}`,
      type: 'horizontal',
      nodeA: nodeA as NodeId,
      nodeB: nodeB as NodeId
    })

    it('syncs building constraints referencing a perimeter after adding it', async () => {
      // Set up a perimeter with proper corner IDs
      const perimeter = makePerimeter('p1', 'storey_1', ['outcorner_c1', 'outcorner_c2'], ['outwall_w1'])
      mockPerimetersById['p1' as PerimeterId] = perimeter

      // Set up a model-store constraint that references the perimeter's corners
      const constraint = makeConstraintWithCorners('1', 'outcorner_c1', 'outcorner_c2')
      mockBuildingConstraints[constraint.id] = constraint

      await importGcsSync()

      // Trigger perimeter addition
      capturedPerimeterCallback!(perimeter, undefined)

      // addPerimeterGeometry should be called first, then addBuildingConstraint for the matching constraint
      expect(mockAddPerimeterGeometry).toHaveBeenCalledWith('p1')
      expect(mockGcsAddBuildingConstraint).toHaveBeenCalledTimes(1)
      expect(mockGcsAddBuildingConstraint).toHaveBeenCalledWith({
        type: 'horizontal',
        nodeA: 'outcorner_c1',
        nodeB: 'outcorner_c2'
      })
    })

    it('does not sync constraints that do not reference the perimeter', async () => {
      // Perimeter with corners c1, c2
      const perimeter = makePerimeter('p1', 'storey_1', ['outcorner_c1', 'outcorner_c2'])
      mockPerimetersById['p1' as PerimeterId] = perimeter

      // Constraint referencing corners from a different perimeter
      const unrelatedConstraint = makeConstraintWithCorners('1', 'outcorner_c3', 'outcorner_c4')
      mockBuildingConstraints[unrelatedConstraint.id] = unrelatedConstraint

      await importGcsSync()

      capturedPerimeterCallback!(perimeter, undefined)

      expect(mockAddPerimeterGeometry).toHaveBeenCalledWith('p1')
      // Should NOT have synced the unrelated constraint
      expect(mockGcsAddBuildingConstraint).not.toHaveBeenCalled()
    })

    it('syncs constraints after perimeter upsert (update)', async () => {
      const prev = makePerimeter('p1', 'storey_1', ['outcorner_c1', 'outcorner_c2'])
      const curr = makePerimeter('p1', 'storey_1', ['outcorner_c1', 'outcorner_c2', 'outcorner_c3'])
      mockPerimetersById['p1' as PerimeterId] = curr

      const constraint = makeConstraintWithCorners('1', 'outcorner_c1', 'outcorner_c3')
      mockBuildingConstraints[constraint.id] = constraint

      await importGcsSync()

      capturedPerimeterCallback!(curr, prev)

      expect(mockAddPerimeterGeometry).toHaveBeenCalledWith('p1')
      expect(mockGcsAddBuildingConstraint).toHaveBeenCalledTimes(1)
      expect(mockGcsAddBuildingConstraint).toHaveBeenCalledWith({
        type: 'horizontal',
        nodeA: 'outcorner_c1',
        nodeB: 'outcorner_c3'
      })
    })

    it('syncs constraints during active storey change', async () => {
      mockPerimeterRegistry['p_old' as PerimeterId] = { pointIds: [] }

      const newStoreyId = 'storey_2' as StoreyId
      const perimeter = makePerimeter('p3', 'storey_2', ['outcorner_c1', 'outcorner_c2'])
      mockPerimetersByStorey[newStoreyId] = [perimeter]
      mockPerimetersById['p3' as PerimeterId] = perimeter

      const constraint = makeConstraintWithCorners('1', 'outcorner_c1', 'outcorner_c2')
      mockBuildingConstraints[constraint.id] = constraint

      await importGcsSync()

      capturedStoreyListener!(newStoreyId, 'storey_1')

      expect(mockAddPerimeterGeometry).toHaveBeenCalledWith('p3')
      expect(mockGcsAddBuildingConstraint).toHaveBeenCalledTimes(1)
      expect(mockGcsAddBuildingConstraint).toHaveBeenCalledWith({
        type: 'horizontal',
        nodeA: 'outcorner_c1',
        nodeB: 'outcorner_c2'
      })
    })

    it('warns but does not throw when constraint sync fails for cross-perimeter constraint', async () => {
      const perimeter = makePerimeter('p1', 'storey_1', ['outcorner_c1', 'outcorner_c2'])
      mockPerimetersById['p1' as PerimeterId] = perimeter

      // Constraint references c1 from this perimeter but also c3 from another (missing) perimeter
      const constraint = makeConstraintWithCorners('1', 'outcorner_c1', 'outcorner_c3')
      mockBuildingConstraints[constraint.id] = constraint

      // addBuildingConstraint will fail because c3's geometry doesn't exist
      mockGcsAddBuildingConstraint.mockImplementation(() => {
        throw new Error('corner "outcorner_c3" not found')
      })
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(vi.fn())

      await importGcsSync()

      // Should not throw
      expect(() => {
        capturedPerimeterCallback!(perimeter, undefined)
      }).not.toThrow()

      // Should have attempted to add the constraint and warned
      expect(mockGcsAddBuildingConstraint).toHaveBeenCalledTimes(1)
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to sync building constraint'),
        expect.any(Error)
      )

      warnSpy.mockRestore()
    })

    it('does not sync constraints when perimeter is added to non-active storey', async () => {
      const perimeter = makePerimeter('p1', 'storey_other', ['outcorner_c1', 'outcorner_c2'])
      mockPerimetersById['p1' as PerimeterId] = perimeter

      const constraint = makeConstraintWithCorners('1', 'outcorner_c1', 'outcorner_c2')
      mockBuildingConstraints[constraint.id] = constraint

      await importGcsSync()

      capturedPerimeterCallback!(perimeter, undefined)

      expect(mockAddPerimeterGeometry).not.toHaveBeenCalled()
      expect(mockGcsAddBuildingConstraint).not.toHaveBeenCalled()
    })
  })
})
