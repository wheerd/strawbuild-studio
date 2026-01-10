import { describe, expect, it, vi } from 'vitest'

import type { PerimeterWallWithGeometry, PerimeterWithGeometry } from '@/building/model'
import { createRingBeamAssemblyId, createStoreyId, createWallAssemblyId } from '@/building/model/ids'
import { getModelActions } from '@/building/store'
import { partial } from '@/test/helpers'

import { getRingBeamAssemblyUsage, getWallAssemblyUsage } from './usage'

vi.mock('@/building/store', () => ({
  getModelActions: vi.fn()
}))

const mockedGetPerimeterById = vi.fn()

vi.mocked(getModelActions).mockReturnValue({
  getPerimeterById: mockedGetPerimeterById
} as any)

describe('Assembly Usage Detection', () => {
  const storeyId = createStoreyId()

  beforeEach(() => {
    mockedGetPerimeterById.mockReturnValue(
      partial<PerimeterWithGeometry>({
        storeyId
      })
    )
  })

  describe('getRingBeamAssemblyUsage', () => {
    it('should detect ring beam assembly not in use', () => {
      const assemblyId = createRingBeamAssemblyId()
      const walls: PerimeterWallWithGeometry[] = []

      const usage = getRingBeamAssemblyUsage(assemblyId, walls)

      expect(usage.isUsed).toBe(false)
      expect(usage.isDefaultBase).toBe(false)
      expect(usage.isDefaultTop).toBe(false)
      expect(usage.storeyIds).toEqual([])
    })

    it('should detect ring beam assembly used as base ring beam', () => {
      const assemblyId = createRingBeamAssemblyId()

      const wall = partial<PerimeterWallWithGeometry>({
        baseRingBeamAssemblyId: assemblyId,
        topRingBeamAssemblyId: undefined
      })

      const usage = getRingBeamAssemblyUsage(assemblyId, [wall])

      expect(usage.isUsed).toBe(true)
      expect(usage.isDefaultBase).toBe(false)
      expect(usage.isDefaultTop).toBe(false)
      expect(usage.storeyIds).toEqual([storeyId])
    })

    it('should detect ring beam assembly used as top ring beam', () => {
      const assemblyId = createRingBeamAssemblyId()

      const wall = partial<PerimeterWallWithGeometry>({
        baseRingBeamAssemblyId: undefined,
        topRingBeamAssemblyId: assemblyId
      })

      const usage = getRingBeamAssemblyUsage(assemblyId, [wall])

      expect(usage.isUsed).toBe(true)
      expect(usage.isDefaultBase).toBe(false)
      expect(usage.isDefaultTop).toBe(false)
      expect(usage.storeyIds).toEqual([storeyId])
    })

    it('should detect ring beam assembly used in multiple places', () => {
      const assemblyId = createRingBeamAssemblyId()

      const wall1 = partial<PerimeterWallWithGeometry>({
        baseRingBeamAssemblyId: assemblyId,
        topRingBeamAssemblyId: undefined
      })

      const wall2 = partial<PerimeterWallWithGeometry>({
        baseRingBeamAssemblyId: undefined,
        topRingBeamAssemblyId: assemblyId
      })

      const usage = getRingBeamAssemblyUsage(assemblyId, [wall1, wall2])

      expect(usage.isUsed).toBe(true)
      expect(usage.isDefaultBase).toBe(false)
      expect(usage.isDefaultTop).toBe(false)
      expect(usage.storeyIds).toEqual([storeyId])
    })
  })

  describe('getWallAssemblyUsage', () => {
    it('should detect wall assembly not in use', () => {
      const assemblyId = createWallAssemblyId()

      const usage = getWallAssemblyUsage(assemblyId, [])

      expect(usage.isUsed).toBe(false)
      expect(usage.isDefault).toBe(false)
      expect(usage.storeyIds).toEqual([])
    })

    it('should detect wall assembly used by walls', () => {
      const assemblyId = createWallAssemblyId()

      const walls = [
        partial<PerimeterWallWithGeometry>({
          wallAssemblyId: assemblyId
        }),
        partial<PerimeterWallWithGeometry>({
          wallAssemblyId: createWallAssemblyId() // Different assembly
        }),
        partial<PerimeterWallWithGeometry>({
          wallAssemblyId: assemblyId // Same assembly as first wall
        })
      ]

      const usage = getWallAssemblyUsage(assemblyId, walls)

      expect(usage.isUsed).toBe(true)
      expect(usage.isDefault).toBe(false)
      expect(usage.storeyIds).toEqual([storeyId])
    })
  })
})
