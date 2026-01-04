import { describe, expect, it } from 'vitest'

import {
  createPerimeterId,
  createPerimeterWallId,
  createRingBeamAssemblyId,
  createStoreyId,
  createWallAssemblyId
} from '@/building/model/ids'
import type { Perimeter } from '@/building/model/model'
import { ZERO_VEC2, newVec2 } from '@/shared/geometry'

import { getRingBeamAssemblyUsage, getWallAssemblyUsage } from './usage'

describe('Assembly Usage Detection', () => {
  const storeyId = createStoreyId()

  describe('getRingBeamAssemblyUsage', () => {
    it('should detect ring beam assembly not in use', () => {
      const assemblyId = createRingBeamAssemblyId()
      const perimeters: Perimeter[] = []

      const usage = getRingBeamAssemblyUsage(assemblyId, perimeters)

      expect(usage.isUsed).toBe(false)
      expect(usage.isDefaultBase).toBe(false)
      expect(usage.isDefaultTop).toBe(false)
      expect(usage.storeyIds).toEqual([])
    })

    it('should detect ring beam assembly used as base ring beam', () => {
      const assemblyId = createRingBeamAssemblyId()
      const perimeterId = createPerimeterId()

      const perimeter: Perimeter = {
        id: perimeterId,
        storeyId,
        referenceSide: 'inside',
        referencePolygon: [],
        walls: [
          {
            id: createPerimeterWallId(),
            thickness: 200,
            wallAssemblyId: createWallAssemblyId(),
            openings: [],
            posts: [],
            baseRingBeamAssemblyId: assemblyId,
            topRingBeamAssemblyId: undefined,
            insideLength: 100,
            outsideLength: 100,
            wallLength: 100,
            insideLine: { start: ZERO_VEC2, end: newVec2(100, 0) },
            outsideLine: { start: ZERO_VEC2, end: newVec2(100, 0) },
            direction: newVec2(1, 0),
            outsideDirection: newVec2(0, 1)
          }
        ],
        corners: []
      }

      const usage = getRingBeamAssemblyUsage(assemblyId, [perimeter])

      expect(usage.isUsed).toBe(true)
      expect(usage.isDefaultBase).toBe(false)
      expect(usage.isDefaultTop).toBe(false)
      expect(usage.storeyIds).toEqual([storeyId])
    })

    it('should detect ring beam assembly used as top ring beam', () => {
      const assemblyId = createRingBeamAssemblyId()
      const perimeterId = createPerimeterId()

      const perimeter: Perimeter = {
        id: perimeterId,
        storeyId,
        referenceSide: 'inside',
        referencePolygon: [],
        walls: [
          {
            id: createPerimeterWallId(),
            thickness: 200,
            wallAssemblyId: createWallAssemblyId(),
            openings: [],
            posts: [],
            baseRingBeamAssemblyId: undefined,
            topRingBeamAssemblyId: assemblyId,
            insideLength: 100,
            outsideLength: 100,
            wallLength: 100,
            insideLine: { start: ZERO_VEC2, end: newVec2(100, 0) },
            outsideLine: { start: ZERO_VEC2, end: newVec2(100, 0) },
            direction: newVec2(1, 0),
            outsideDirection: newVec2(0, 1)
          }
        ],
        corners: []
      }

      const usage = getRingBeamAssemblyUsage(assemblyId, [perimeter])

      expect(usage.isUsed).toBe(true)
      expect(usage.isDefaultBase).toBe(false)
      expect(usage.isDefaultTop).toBe(false)
      expect(usage.storeyIds).toEqual([storeyId])
    })

    it('should detect ring beam assembly used in multiple places', () => {
      const assemblyId = createRingBeamAssemblyId()
      const perimeter1Id = createPerimeterId()
      const perimeter2Id = createPerimeterId()

      const perimeter1: Perimeter = {
        id: perimeter1Id,
        storeyId,
        referenceSide: 'inside',
        referencePolygon: [],
        walls: [
          {
            id: createPerimeterWallId(),
            thickness: 200,
            wallAssemblyId: createWallAssemblyId(),
            openings: [],
            posts: [],
            baseRingBeamAssemblyId: assemblyId,
            topRingBeamAssemblyId: undefined,
            insideLength: 100,
            outsideLength: 100,
            wallLength: 100,
            insideLine: { start: ZERO_VEC2, end: newVec2(100, 0) },
            outsideLine: { start: ZERO_VEC2, end: newVec2(100, 0) },
            direction: newVec2(1, 0),
            outsideDirection: newVec2(0, 1)
          }
        ],
        corners: []
      }

      const perimeter2: Perimeter = {
        id: perimeter2Id,
        storeyId,
        referenceSide: 'inside',
        referencePolygon: [],
        walls: [
          {
            id: createPerimeterWallId(),
            thickness: 200,
            wallAssemblyId: createWallAssemblyId(),
            openings: [],
            posts: [],
            baseRingBeamAssemblyId: undefined,
            topRingBeamAssemblyId: assemblyId,
            insideLength: 100,
            outsideLength: 100,
            wallLength: 100,
            insideLine: { start: ZERO_VEC2, end: newVec2(100, 0) },
            outsideLine: { start: ZERO_VEC2, end: newVec2(100, 0) },
            direction: newVec2(1, 0),
            outsideDirection: newVec2(0, 1)
          }
        ],
        corners: []
      }

      const usage = getRingBeamAssemblyUsage(assemblyId, [perimeter1, perimeter2])

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
      const perimeterId = createPerimeterId()

      const perimeter: Perimeter = {
        id: perimeterId,
        storeyId,
        referenceSide: 'inside',
        referencePolygon: [],
        walls: [
          {
            id: createPerimeterWallId(),
            thickness: 420,
            wallAssemblyId: assemblyId,
            openings: [],
            posts: [],
            insideLength: 1000,
            outsideLength: 1000,
            wallLength: 1000,
            insideLine: { start: ZERO_VEC2, end: newVec2(1000, 0) },
            outsideLine: { start: newVec2(0, 420), end: newVec2(1000, 420) },
            direction: newVec2(1, 0),
            outsideDirection: newVec2(0, 1)
          },
          {
            id: createPerimeterWallId(),
            thickness: 420,
            wallAssemblyId: createWallAssemblyId(), // Different assembly
            openings: [],
            posts: [],
            insideLength: 1000,
            outsideLength: 1000,
            wallLength: 1000,
            insideLine: { start: newVec2(1000, 0), end: newVec2(1000, 1000) },
            outsideLine: { start: newVec2(1440, 0), end: newVec2(1440, 1000) },
            direction: newVec2(0, 1),
            outsideDirection: newVec2(1, 0)
          },
          {
            id: createPerimeterWallId(),
            thickness: 420,
            wallAssemblyId: assemblyId, // Same assembly as first wall
            openings: [],
            posts: [],
            insideLength: 1000,
            outsideLength: 1000,
            wallLength: 1000,
            insideLine: { start: newVec2(1000, 1000), end: newVec2(0, 1000) },
            outsideLine: { start: newVec2(1000, 1440), end: newVec2(0, 1440) },
            direction: newVec2(-1, 0),
            outsideDirection: newVec2(0, 1)
          }
        ],
        corners: []
      }

      const usage = getWallAssemblyUsage(assemblyId, [perimeter])

      expect(usage.isUsed).toBe(true)
      expect(usage.isDefault).toBe(false)
      expect(usage.storeyIds).toEqual([storeyId])
    })
  })
})
