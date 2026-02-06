import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Perimeter, PerimeterId, StoreyId } from '@/building/model'

// --- Mock state ---

let mockActiveStoreyId: StoreyId = 'storey_1' as StoreyId
const mockPerimetersByStorey: Record<StoreyId, Perimeter[]> = {}
const mockPerimeterRegistry: Record<PerimeterId, unknown> = {}

// Captured subscription callbacks
let capturedStoreySelector: ((state: unknown) => unknown) | null = null
let capturedStoreyListener: ((newVal: unknown, oldVal: unknown) => void) | null = null
let capturedPerimeterCallback: ((current?: Perimeter, previous?: Perimeter) => void) | null = null

// Mock GCS actions
const mockAddPerimeterGeometry = vi.fn()
const mockRemovePerimeterGeometry = vi.fn()

// Mock building store
vi.mock('@/building/store', () => ({
  getModelActions: () => ({
    getActiveStoreyId: () => mockActiveStoreyId,
    getPerimetersByStorey: (storeyId: StoreyId) => mockPerimetersByStorey[storeyId] ?? []
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
  }
}))

// Mock GCS store
vi.mock('./store', () => ({
  getGcsActions: () => ({
    addPerimeterGeometry: (...args: unknown[]) => mockAddPerimeterGeometry(...args),
    removePerimeterGeometry: (...args: unknown[]) => mockRemovePerimeterGeometry(...args)
  }),
  getGcsState: () => ({
    perimeterRegistry: mockPerimeterRegistry
  })
}))

// Reset state before each test
beforeEach(() => {
  vi.clearAllMocks()
  capturedStoreySelector = null
  capturedStoreyListener = null
  capturedPerimeterCallback = null
  mockActiveStoreyId = 'storey_1' as StoreyId

  // Clear mutable objects
  for (const key of Object.keys(mockPerimetersByStorey) as StoreyId[]) {
    delete mockPerimetersByStorey[key]
  }
  for (const key of Object.keys(mockPerimeterRegistry) as PerimeterId[]) {
    delete mockPerimeterRegistry[key]
  }
})

function importGcsSync(): Promise<void> {
  // Reset the module registry so the constructor runs fresh each time
  vi.resetModules()
  return import('./gcsSync') as unknown as Promise<void>
}

function makePerimeter(id: string, storeyId: string, cornerIds: string[] = [], wallIds: string[] = []): Perimeter {
  return {
    id: id as PerimeterId,
    storeyId: storeyId as StoreyId,
    cornerIds: cornerIds as Perimeter['cornerIds'],
    wallIds: wallIds as Perimeter['wallIds']
  } as Perimeter
}

describe('GcsSyncService', () => {
  describe('initialization', () => {
    it('sets up subscriptions on import', async () => {
      await importGcsSync()

      // Both subscription callbacks should have been captured
      expect(capturedStoreyListener).toBeTypeOf('function')
      expect(capturedPerimeterCallback).toBeTypeOf('function')
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

  describe('edge cases', () => {
    it('handles callback with both current and previous undefined (no-op)', async () => {
      await importGcsSync()

      // Should not throw
      capturedPerimeterCallback!(undefined, undefined)

      expect(mockAddPerimeterGeometry).not.toHaveBeenCalled()
      expect(mockRemovePerimeterGeometry).not.toHaveBeenCalled()
    })
  })
})
