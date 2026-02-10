import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  Constraint,
  ConstraintId,
  Perimeter,
  PerimeterCorner,
  PerimeterCornerWithGeometry,
  PerimeterId,
  PerimeterWall,
  PerimeterWallId
} from '@/building/model'
import type { PerimeterCornerId } from '@/building/model/ids'
import { newVec2 } from '@/shared/geometry'

// --- Mock state ---

const mockPerimeterRegistry: Record<PerimeterId, unknown> = {}
const mockPerimetersById: Record<PerimeterId, Perimeter> = {}
const mockBuildingConstraints: Record<ConstraintId, Constraint> = {}

// Captured subscription callbacks
let capturedPerimeterCallback: ((id: PerimeterId, current?: Perimeter, previous?: Perimeter) => void) | null = null
let capturedConstraintCallback: ((id: ConstraintId, current?: Constraint, previous?: Constraint) => void) | null = null
let capturedCornerCallback:
  | ((id: PerimeterCornerId, current?: PerimeterCorner, previous?: PerimeterCorner) => void)
  | null = null
let capturedWallCallback: ((id: PerimeterWallId, current?: PerimeterWall, previous?: PerimeterWall) => void) | null =
  null

// Mock GCS actions
const mockAddPerimeterGeometry = vi.fn()
const mockRemovePerimeterGeometry = vi.fn()
const mockGcsAddBuildingConstraint = vi.fn()
const mockGcsRemoveBuildingConstraint = vi.fn()
const mockUpdatePointPosition = vi.fn()

// Mock corner geometry lookup
const mockCornerGeometries: Record<string, PerimeterCornerWithGeometry> = {}

// Mock building store
vi.mock('@/building/store', () => ({
  getModelActions: () => ({
    getAllPerimeters: () => Object.values(mockPerimetersById),
    getPerimeterById: (perimeterId: PerimeterId) => mockPerimetersById[perimeterId],
    getPerimeterCornerById: (cornerId: string) => mockCornerGeometries[cornerId],
    getAllBuildingConstraints: () => Object.values(mockBuildingConstraints)
  }),
  subscribeToPerimeters: (cb: (id: string, current?: Perimeter, previous?: Perimeter) => void) => {
    capturedPerimeterCallback = cb
    return vi.fn() // unsubscribe
  },
  subscribeToConstraints: (cb: (id: string, current?: Constraint, previous?: Constraint) => void) => {
    capturedConstraintCallback = cb
    return vi.fn() // unsubscribe
  },
  subscribeToCorners: (cb: (id: string, current?: PerimeterCorner, previous?: PerimeterCorner) => void) => {
    capturedCornerCallback = cb
    return vi.fn() // unsubscribe
  },
  subscribeToWalls: (cb: (id: string, current?: PerimeterWall, previous?: PerimeterWall) => void) => {
    capturedWallCallback = cb
    return vi.fn() // unsubscribe
  },
  subscribeToWallOpenings: () => vi.fn(),
  subscribeToWallPosts: () => vi.fn(),
  subscribeToOpeningGeometry: () => vi.fn(),
  subscribeToWallPostGeometry: () => vi.fn()
}))

// Mock GCS store
vi.mock('./store', () => ({
  getGcsActions: () => ({
    addPerimeterGeometry: (...args: unknown[]) => mockAddPerimeterGeometry(...args),
    removePerimeterGeometry: (...args: unknown[]) => mockRemovePerimeterGeometry(...args),
    addBuildingConstraint: (...args: unknown[]) => mockGcsAddBuildingConstraint(...args),
    removeBuildingConstraint: (...args: unknown[]) => mockGcsRemoveBuildingConstraint(...args),
    updatePointPosition: (...args: unknown[]) => mockUpdatePointPosition(...args)
  }),
  getGcsState: () => ({
    perimeterRegistry: mockPerimeterRegistry
  })
}))

// Reset state before each test
beforeEach(() => {
  vi.resetAllMocks()
  capturedPerimeterCallback = null
  capturedConstraintCallback = null
  capturedCornerCallback = null
  capturedWallCallback = null

  // Clear mutable objects
  for (const key of Object.keys(mockPerimeterRegistry) as PerimeterId[]) {
    delete mockPerimeterRegistry[key]
  }
  for (const key of Object.keys(mockPerimetersById) as PerimeterId[]) {
    delete mockPerimetersById[key]
  }
  for (const key of Object.keys(mockBuildingConstraints) as ConstraintId[]) {
    delete mockBuildingConstraints[key]
  }
  for (const key of Object.keys(mockCornerGeometries)) {
    delete mockCornerGeometries[key]
  }
})

function importGcsSync(): Promise<void> {
  // Reset the module registry so the constructor runs fresh each time
  vi.resetModules()
  return import('./gcsSync') as unknown as Promise<void>
}

function makePerimeter(id: string, cornerIds: string[] = [], wallIds: string[] = []): Perimeter {
  const perimeter = {
    id: id as PerimeterId,
    storeyId: 'storey_1' as const,
    cornerIds: cornerIds as Perimeter['cornerIds'],
    wallIds: wallIds as Perimeter['wallIds'],
    referenceSide: 'inside' as Perimeter['referenceSide'],
    roomIds: [] as Perimeter['roomIds'],
    wallNodeIds: [] as Perimeter['wallNodeIds'],
    intermediateWallIds: [] as Perimeter['intermediateWallIds']
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
      expect(capturedPerimeterCallback).toBeTypeOf('function')
      expect(capturedConstraintCallback).toBeTypeOf('function')
      expect(capturedCornerCallback).toBeTypeOf('function')
    })

    it('initializes all existing perimeters on import', async () => {
      // Set up some perimeters before importing
      makePerimeter('p1', ['outcorner_c1'], ['outwall_w1'])
      makePerimeter('p2', ['outcorner_c2'], ['outwall_w2'])

      await importGcsSync()

      // Should have added geometry for both perimeters
      expect(mockAddPerimeterGeometry).toHaveBeenCalledWith('p1')
      expect(mockAddPerimeterGeometry).toHaveBeenCalledWith('p2')
      expect(mockAddPerimeterGeometry).toHaveBeenCalledTimes(2)
    })
  })

  describe('perimeter addition', () => {
    it('calls addPerimeterGeometry when a perimeter is added', async () => {
      await importGcsSync()

      const perimeter = makePerimeter('p1')
      capturedPerimeterCallback!('p1' as PerimeterId, perimeter, undefined)

      expect(mockAddPerimeterGeometry).toHaveBeenCalledWith('p1')
      expect(mockAddPerimeterGeometry).toHaveBeenCalledTimes(1)
    })
  })

  describe('perimeter removal', () => {
    it('calls removePerimeterGeometry when a tracked perimeter is removed', async () => {
      // Simulate that 'p1' is already in the GCS registry
      mockPerimeterRegistry['p1' as PerimeterId] = { pointIds: [] }

      await importGcsSync()

      const perimeter = makePerimeter('p1')
      capturedPerimeterCallback!(perimeter.id, undefined, perimeter)

      expect(mockRemovePerimeterGeometry).toHaveBeenCalledWith('p1')
      expect(mockRemovePerimeterGeometry).toHaveBeenCalledTimes(1)
    })

    it('does not call removePerimeterGeometry when an untracked perimeter is removed', async () => {
      // Registry is empty — perimeter is not tracked
      await importGcsSync()

      const perimeter = makePerimeter('p1')
      capturedPerimeterCallback!(perimeter.id, undefined, perimeter)

      expect(mockRemovePerimeterGeometry).not.toHaveBeenCalled()
    })
  })

  describe('perimeter update', () => {
    it('calls addPerimeterGeometry (upsert) when a perimeter is updated', async () => {
      await importGcsSync()

      const prev = makePerimeter('p1', ['c1', 'c2'])
      const curr = makePerimeter('p1', ['c1', 'c2', 'c3'])
      capturedPerimeterCallback!('p1' as PerimeterId, curr, prev)

      expect(mockAddPerimeterGeometry).toHaveBeenCalledWith('p1')
      expect(mockAddPerimeterGeometry).toHaveBeenCalledTimes(1)
    })
  })

  describe('constraint propagation', () => {
    const makeConstraint = (id: string, wallId: string): Constraint => ({
      id: `constraint_${id}`,
      type: 'horizontalWall',
      wall: wallId as PerimeterWallId
    })

    it('adds constraint to GCS store when a new constraint appears in model store', async () => {
      await importGcsSync()

      const constraint = makeConstraint('1', 'outwall_w1')
      capturedConstraintCallback!('constraint_1' as ConstraintId, constraint, undefined)

      expect(mockGcsAddBuildingConstraint).toHaveBeenCalledTimes(1)
      expect(mockGcsAddBuildingConstraint).toHaveBeenCalledWith(constraint)
    })

    it('removes constraint from GCS store when a constraint is removed from model store', async () => {
      await importGcsSync()

      const constraint = makeConstraint('1', 'outwall_w1')
      capturedConstraintCallback!('constraint_1' as ConstraintId, undefined, constraint)

      expect(mockGcsRemoveBuildingConstraint).toHaveBeenCalledTimes(1)
      // The key is derived from the constraint input (buildingConstraintKey)
      expect(mockGcsRemoveBuildingConstraint).toHaveBeenCalledWith(expect.any(String))
    })

    it('removes old and adds new constraint when a constraint is updated', async () => {
      await importGcsSync()

      const prev = makeConstraint('1', 'outwall_w1')
      const curr: Constraint = {
        id: `constraint_1` as Constraint['id'],
        type: 'verticalWall',
        wall: 'outwall_w1' as PerimeterWallId
      }
      capturedConstraintCallback!('constraint_1' as ConstraintId, curr, prev)

      expect(mockGcsRemoveBuildingConstraint).toHaveBeenCalledTimes(1)
      expect(mockGcsAddBuildingConstraint).toHaveBeenCalledTimes(1)
      const calledWith = mockGcsAddBuildingConstraint.mock.calls[0][0]
      expect(calledWith).toEqual(curr)
    })

    it('warns but does not throw when GCS geometry does not exist yet', async () => {
      mockGcsAddBuildingConstraint.mockImplementation(() => {
        throw new Error('corner not found')
      })
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(vi.fn())

      await importGcsSync()

      const constraint = makeConstraint('1', 'outwall_w1')

      // Should not throw
      expect(() => {
        capturedConstraintCallback!('constraint_1' as ConstraintId, constraint, undefined)
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

      capturedConstraintCallback!('some_id' as ConstraintId, undefined, undefined)

      expect(mockGcsAddBuildingConstraint).not.toHaveBeenCalled()
      expect(mockGcsRemoveBuildingConstraint).not.toHaveBeenCalled()
    })
  })

  describe('constraint re-sync after perimeter geometry creation', () => {
    const makeWallConstraint = (id: string, wallId: string): Constraint => ({
      id: `constraint_${id}`,
      type: 'horizontalWall',
      wall: wallId as PerimeterWallId
    })

    it('syncs building constraints referencing a perimeter after adding it', async () => {
      // Set up a perimeter with proper wall IDs
      const perimeter = makePerimeter('p1', ['outcorner_c1', 'outcorner_c2'], ['outwall_w1'])
      mockPerimetersById['p1' as PerimeterId] = perimeter

      // Set up a model-store constraint that references the perimeter's wall
      const constraint = makeWallConstraint('1', 'outwall_w1')
      mockBuildingConstraints[constraint.id] = constraint

      await importGcsSync()

      // Clear the mock from initialization so we only test the callback
      mockAddPerimeterGeometry.mockClear()
      mockGcsAddBuildingConstraint.mockClear()

      // Trigger perimeter addition
      capturedPerimeterCallback!('p1' as PerimeterId, perimeter, undefined)

      // addPerimeterGeometry should be called first, then addBuildingConstraint for the matching constraint
      expect(mockAddPerimeterGeometry).toHaveBeenCalledWith('p1')
      expect(mockGcsAddBuildingConstraint).toHaveBeenCalledTimes(1)
      expect(mockGcsAddBuildingConstraint).toHaveBeenCalledWith(constraint)
    })

    it('does not sync constraints that do not reference the perimeter', async () => {
      // Perimeter with walls w1
      const perimeter = makePerimeter('p1', ['outcorner_c1', 'outcorner_c2'], ['outwall_w1'])
      mockPerimetersById['p1' as PerimeterId] = perimeter

      // Constraint referencing a wall from a different perimeter
      const unrelatedConstraint = makeWallConstraint('1', 'outwall_w99')
      mockBuildingConstraints[unrelatedConstraint.id] = unrelatedConstraint

      await importGcsSync()

      capturedPerimeterCallback!('p1' as PerimeterId, perimeter, undefined)

      expect(mockAddPerimeterGeometry).toHaveBeenCalledWith('p1')
      // Should NOT have synced the unrelated constraint
      expect(mockGcsAddBuildingConstraint).not.toHaveBeenCalled()
    })

    it('syncs constraints after perimeter upsert (update)', async () => {
      const prev = makePerimeter('p1', ['outcorner_c1', 'outcorner_c2'], ['outwall_w1'])
      const curr = makePerimeter('p1', ['outcorner_c1', 'outcorner_c2', 'outcorner_c3'], ['outwall_w1', 'outwall_w2'])
      mockPerimetersById['p1' as PerimeterId] = curr

      const constraint = makeWallConstraint('1', 'outwall_w2')
      mockBuildingConstraints[constraint.id] = constraint

      await importGcsSync()

      // Clear the mock from initialization
      mockAddPerimeterGeometry.mockClear()
      mockGcsAddBuildingConstraint.mockClear()

      capturedPerimeterCallback!('p1' as PerimeterId, curr, prev)

      expect(mockAddPerimeterGeometry).toHaveBeenCalledWith('p1')
      expect(mockGcsAddBuildingConstraint).toHaveBeenCalledTimes(1)
      expect(mockGcsAddBuildingConstraint).toHaveBeenCalledWith(constraint)
    })

    it('warns but does not throw when constraint sync fails for cross-perimeter constraint', async () => {
      const perimeter = makePerimeter('p1', ['outcorner_c1', 'outcorner_c2'], ['outwall_w1'])
      mockPerimetersById['p1' as PerimeterId] = perimeter

      // Constraint references w1 from this perimeter — but addBuildingConstraint will fail
      // (simulating a scenario where the GCS geometry is incomplete)
      const constraint = makeWallConstraint('1', 'outwall_w1')
      mockBuildingConstraints[constraint.id] = constraint

      // addBuildingConstraint will fail
      mockGcsAddBuildingConstraint.mockImplementation(() => {
        throw new Error('wall geometry not found')
      })
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(vi.fn())

      await importGcsSync()

      // Clear the mock from initialization
      mockAddPerimeterGeometry.mockClear()
      mockGcsAddBuildingConstraint.mockClear()

      // Should not throw
      expect(() => {
        capturedPerimeterCallback!('p1' as PerimeterId, perimeter, undefined)
      }).not.toThrow()

      // Should have attempted to add the constraint and warned
      expect(mockGcsAddBuildingConstraint).toHaveBeenCalledTimes(1)
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to sync building constraint'),
        expect.any(Error)
      )

      warnSpy.mockRestore()
    })
  })

  describe('corner position sync', () => {
    function makeCorner(id: string, perimeterId: string): PerimeterCorner {
      return {
        id: id as PerimeterCornerId,
        perimeterId: perimeterId as PerimeterId,
        previousWallId: 'outwall_w1',
        nextWallId: 'outwall_w2',
        referencePoint: newVec2(0, 0),
        constructedByWall: 'previous'
      } as PerimeterCorner
    }

    function registerCornerGeometry(
      cornerId: string,
      insideX: number,
      insideY: number,
      outsideX: number,
      outsideY: number
    ): void {
      mockCornerGeometries[cornerId] = {
        id: cornerId as PerimeterCornerId,
        perimeterId: 'p1' as PerimeterId,
        previousWallId: 'outwall_w1' as PerimeterWallId,
        nextWallId: 'outwall_w2' as PerimeterWallId,
        referencePoint: newVec2(insideX, insideY),
        constructedByWall: 'previous',
        interiorAngle: 90,
        exteriorAngle: 270,
        polygon: { points: [] },
        insidePoint: newVec2(insideX, insideY),
        outsidePoint: newVec2(outsideX, outsideY)
      } as PerimeterCornerWithGeometry
    }

    it('updates GCS point positions when a tracked corner referencePoint changes', async () => {
      // Perimeter is tracked in GCS registry
      mockPerimeterRegistry['p1' as PerimeterId] = {
        pointIds: ['corner_outcorner_c1_ref', 'corner_outcorner_c1_nonref_prev', 'corner_outcorner_c1_nonref_next']
      }

      // Register perimeter in mock so getPerimeterById can find it
      mockPerimetersById['p1' as PerimeterId] = {
        id: 'p1' as PerimeterId,
        storeyId: 'storey_1' as const,
        cornerIds: ['outcorner_c1' as PerimeterCornerId],
        wallIds: ['outwall_w1' as PerimeterWallId],
        referenceSide: 'inside' as Perimeter['referenceSide'],
        roomIds: [] as Perimeter['roomIds'],
        wallNodeIds: [] as Perimeter['wallNodeIds'],
        intermediateWallIds: [] as Perimeter['intermediateWallIds']
      } as Perimeter

      // Register corner geometry that getPerimeterCornerById will return
      registerCornerGeometry('outcorner_c1', 100, 200, 110, 210)

      await importGcsSync()

      const prev = makeCorner('outcorner_c1', 'p1')
      const curr = { ...prev, referencePoint: newVec2(100, 200) }
      capturedCornerCallback!('outcorner_c1' as PerimeterCornerId, curr, prev)

      expect(mockUpdatePointPosition).toHaveBeenCalledTimes(3)
      expect(mockUpdatePointPosition).toHaveBeenCalledWith('corner_outcorner_c1_ref', newVec2(100, 200))
      expect(mockUpdatePointPosition).toHaveBeenCalledWith('corner_outcorner_c1_nonref_prev', newVec2(110, 210))
      expect(mockUpdatePointPosition).toHaveBeenCalledWith('corner_outcorner_c1_nonref_next', newVec2(110, 210))
    })

    it('does not update positions for untracked perimeters', async () => {
      // Registry is empty — perimeter not tracked
      await importGcsSync()

      const prev = makeCorner('outcorner_c1', 'p_untracked')
      const curr = { ...prev, referencePoint: newVec2(50, 60) }
      capturedCornerCallback!('outcorner_c1' as PerimeterCornerId, curr, prev)

      expect(mockUpdatePointPosition).not.toHaveBeenCalled()
    })

    it('does not update positions when a corner is added (no previous)', async () => {
      mockPerimeterRegistry['p1' as PerimeterId] = { pointIds: [] }

      await importGcsSync()

      const curr = makeCorner('outcorner_c1', 'p1')
      capturedCornerCallback!('outcorner_c1' as PerimeterCornerId, curr, undefined)

      expect(mockUpdatePointPosition).not.toHaveBeenCalled()
    })

    it('does not update positions when a corner is removed (no current)', async () => {
      mockPerimeterRegistry['p1' as PerimeterId] = { pointIds: [] }

      await importGcsSync()

      const prev = makeCorner('outcorner_c1', 'p1')
      capturedCornerCallback!('outcorner_c1' as PerimeterCornerId, undefined, prev)

      expect(mockUpdatePointPosition).not.toHaveBeenCalled()
    })
  })

  describe('wall thickness sync', () => {
    function makeWall(id: string, perimeterId: string, thickness: number): PerimeterWall {
      return {
        id: id as PerimeterWallId,
        perimeterId: perimeterId as PerimeterId,
        startCornerId: 'outcorner_c1' as PerimeterCornerId,
        endCornerId: 'outcorner_c2' as PerimeterCornerId,
        entityIds: [] as PerimeterWall['entityIds'],
        thickness,
        wallAssemblyId: 'assembly_1' as PerimeterWall['wallAssemblyId']
      } as PerimeterWall
    }

    it('rebuilds perimeter geometry when wall thickness changes', async () => {
      // Perimeter is tracked in GCS registry
      mockPerimeterRegistry['p1' as PerimeterId] = { pointIds: [], lineIds: [], constraintIds: [] }

      // Register perimeter in mock so getPerimeterById can find it
      mockPerimetersById['p1' as PerimeterId] = {
        id: 'p1' as PerimeterId,
        storeyId: 'storey_1' as const,
        cornerIds: ['outcorner_c1' as PerimeterCornerId, 'outcorner_c2' as PerimeterCornerId],
        wallIds: ['outwall_w1' as PerimeterWallId],
        referenceSide: 'inside' as Perimeter['referenceSide'],
        roomIds: [] as Perimeter['roomIds'],
        wallNodeIds: [] as Perimeter['wallNodeIds'],
        intermediateWallIds: [] as Perimeter['intermediateWallIds']
      } as Perimeter

      await importGcsSync()

      // Clear mock from initialization
      mockAddPerimeterGeometry.mockClear()

      // Simulate wall thickness change
      const prevWall = makeWall('outwall_w1', 'p1', 400)
      const currWall = makeWall('outwall_w1', 'p1', 500)
      capturedWallCallback!('outwall_w1' as PerimeterWallId, currWall, prevWall)

      // Should have called addPerimeterGeometry to rebuild perimeter with new thickness
      expect(mockAddPerimeterGeometry).toHaveBeenCalledWith('p1')
      expect(mockAddPerimeterGeometry).toHaveBeenCalledTimes(1)
    })

    it('does nothing when wall thickness does not change', async () => {
      // Perimeter is tracked in GCS registry
      mockPerimeterRegistry['p1' as PerimeterId] = { pointIds: [], lineIds: [], constraintIds: [] }

      mockPerimetersById['p1' as PerimeterId] = {
        id: 'p1' as PerimeterId,
        storeyId: 'storey_1' as const,
        cornerIds: ['outcorner_c1' as PerimeterCornerId],
        wallIds: ['outwall_w1' as PerimeterWallId],
        referenceSide: 'inside' as Perimeter['referenceSide'],
        roomIds: [] as Perimeter['roomIds'],
        wallNodeIds: [] as Perimeter['wallNodeIds'],
        intermediateWallIds: [] as Perimeter['intermediateWallIds']
      } as Perimeter

      await importGcsSync()

      // Clear mock from initialization
      mockAddPerimeterGeometry.mockClear()

      // Simulate wall update without thickness change
      const prevWall = makeWall('outwall_w1', 'p1', 400)
      const currWall = makeWall('outwall_w1', 'p1', 400)
      capturedWallCallback!('outwall_w1' as PerimeterWallId, currWall, prevWall)

      // Should NOT have called addPerimeterGeometry since thickness didn't change
      expect(mockAddPerimeterGeometry).not.toHaveBeenCalled()
    })

    it('does nothing when wall is added (no previous)', async () => {
      // Perimeter is tracked in GCS registry
      mockPerimeterRegistry['p1' as PerimeterId] = { pointIds: [], lineIds: [], constraintIds: [] }

      await importGcsSync()

      // Clear mock from initialization
      mockAddPerimeterGeometry.mockClear()

      // Simulate wall addition
      const wall = makeWall('outwall_w1', 'p1', 400)
      capturedWallCallback!('outwall_w1' as PerimeterWallId, wall, undefined)

      // Should NOT have called addPerimeterGeometry - perimeter subscription handles additions
      expect(mockAddPerimeterGeometry).not.toHaveBeenCalled()
    })

    it('does nothing when wall is removed (no current)', async () => {
      // Perimeter is tracked in GCS registry
      mockPerimeterRegistry['p1' as PerimeterId] = { pointIds: [], lineIds: [], constraintIds: [] }

      await importGcsSync()

      // Clear mock from initialization
      mockAddPerimeterGeometry.mockClear()

      // Simulate wall removal
      const wall = makeWall('outwall_w1', 'p1', 400)
      capturedWallCallback!('outwall_w1' as PerimeterWallId, undefined, wall)

      // Should NOT have called addPerimeterGeometry - perimeter subscription handles removals
      expect(mockAddPerimeterGeometry).not.toHaveBeenCalled()
    })

    it('does nothing for untracked perimeters', async () => {
      // Registry is empty — perimeter not tracked
      await importGcsSync()

      // Clear mock from initialization
      mockAddPerimeterGeometry.mockClear()

      // Simulate wall thickness change for untracked perimeter
      const prevWall = makeWall('outwall_w1', 'p_untracked', 400)
      const currWall = makeWall('outwall_w1', 'p_untracked', 500)
      capturedWallCallback!('outwall_w1' as PerimeterWallId, currWall, prevWall)

      // Should NOT have called addPerimeterGeometry
      expect(mockAddPerimeterGeometry).not.toHaveBeenCalled()
    })
  })
})
