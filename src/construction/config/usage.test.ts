import { describe, expect, it } from 'vitest'

import {
  DEFAULT_SLAB_CONFIG_ID,
  createPerimeterConstructionMethodId,
  createPerimeterId,
  createPerimeterWallId,
  createRingBeamConstructionMethodId,
  createStoreyId
} from '@/building/model/ids'
import type { Perimeter, Storey } from '@/building/model/model'
import { createStoreyLevel } from '@/building/model/model'
import { createLength } from '@/shared/geometry'

import { getPerimeterConfigUsage, getRingBeamConfigUsage } from './usage'

describe('Config Usage Detection', () => {
  const storeyId = createStoreyId()
  const storey: Storey = {
    id: storeyId,
    name: 'Test Floor',
    level: createStoreyLevel(0),
    height: createLength(3000),
    slabConstructionConfigId: DEFAULT_SLAB_CONFIG_ID
  }

  describe('getRingBeamConfigUsage', () => {
    it('should detect ring beam config not in use', () => {
      const ringBeamId = createRingBeamConstructionMethodId()
      const perimeters: Perimeter[] = []
      const storeys = [storey]

      const usage = getRingBeamConfigUsage(ringBeamId, perimeters, storeys)

      expect(usage.isUsed).toBe(false)
      expect(usage.usedByPerimeters).toEqual([])
    })

    it('should detect ring beam config used as base ring beam', () => {
      const ringBeamId = createRingBeamConstructionMethodId()
      const perimeterId = createPerimeterId()

      const perimeter: Perimeter = {
        id: perimeterId,
        storeyId,
        walls: [],
        corners: [],
        baseRingBeamMethodId: ringBeamId,
        topRingBeamMethodId: undefined
      }

      const usage = getRingBeamConfigUsage(ringBeamId, [perimeter], [storey])

      expect(usage.isUsed).toBe(true)
      expect(usage.usedByPerimeters).toEqual(['Test Floor - Base Ring Beam'])
    })

    it('should detect ring beam config used as top ring beam', () => {
      const ringBeamId = createRingBeamConstructionMethodId()
      const perimeterId = createPerimeterId()

      const perimeter: Perimeter = {
        id: perimeterId,
        storeyId,
        walls: [],
        corners: [],
        baseRingBeamMethodId: undefined,
        topRingBeamMethodId: ringBeamId
      }

      const usage = getRingBeamConfigUsage(ringBeamId, [perimeter], [storey])

      expect(usage.isUsed).toBe(true)
      expect(usage.usedByPerimeters).toEqual(['Test Floor - Top Ring Beam'])
    })

    it('should detect ring beam config used in multiple places', () => {
      const ringBeamId = createRingBeamConstructionMethodId()
      const perimeter1Id = createPerimeterId()
      const perimeter2Id = createPerimeterId()

      const perimeter1: Perimeter = {
        id: perimeter1Id,
        storeyId,
        walls: [],
        corners: [],
        baseRingBeamMethodId: ringBeamId,
        topRingBeamMethodId: undefined
      }

      const perimeter2: Perimeter = {
        id: perimeter2Id,
        storeyId,
        walls: [],
        corners: [],
        baseRingBeamMethodId: undefined,
        topRingBeamMethodId: ringBeamId
      }

      const usage = getRingBeamConfigUsage(ringBeamId, [perimeter1, perimeter2], [storey])

      expect(usage.isUsed).toBe(true)
      expect(usage.usedByPerimeters).toHaveLength(2)
      expect(usage.usedByPerimeters).toContain('Test Floor - Base Ring Beam')
      expect(usage.usedByPerimeters).toContain('Test Floor - Top Ring Beam')
    })
  })

  describe('getPerimeterConfigUsage', () => {
    it('should detect perimeter config not in use', () => {
      const perimeterId = createPerimeterConstructionMethodId()

      const usage = getPerimeterConfigUsage(perimeterId, [], [storey])

      expect(usage.isUsed).toBe(false)
      expect(usage.usedByWalls).toEqual([])
    })

    it('should detect perimeter config used by walls', () => {
      const configId = createPerimeterConstructionMethodId()
      const perimeterId = createPerimeterId()

      const perimeter: Perimeter = {
        id: perimeterId,
        storeyId,
        walls: [
          {
            id: createPerimeterWallId(),
            thickness: createLength(440),
            constructionMethodId: configId,
            openings: [],
            insideLength: createLength(1000),
            outsideLength: createLength(1000),
            wallLength: createLength(1000),
            insideLine: { start: [0, 0], end: [1000, 0] },
            outsideLine: { start: [0, 440], end: [1000, 440] },
            direction: [1, 0],
            outsideDirection: [0, 1]
          },
          {
            id: createPerimeterWallId(),
            thickness: createLength(440),
            constructionMethodId: createPerimeterConstructionMethodId(), // Different config
            openings: [],
            insideLength: createLength(1000),
            outsideLength: createLength(1000),
            wallLength: createLength(1000),
            insideLine: { start: [1000, 0], end: [1000, 1000] },
            outsideLine: { start: [1440, 0], end: [1440, 1000] },
            direction: [0, 1],
            outsideDirection: [1, 0]
          },
          {
            id: createPerimeterWallId(),
            thickness: createLength(440),
            constructionMethodId: configId, // Same config as first wall
            openings: [],
            insideLength: createLength(1000),
            outsideLength: createLength(1000),
            wallLength: createLength(1000),
            insideLine: { start: [1000, 1000], end: [0, 1000] },
            outsideLine: { start: [1000, 1440], end: [0, 1440] },
            direction: [-1, 0],
            outsideDirection: [0, 1]
          }
        ],
        corners: []
      }

      const usage = getPerimeterConfigUsage(configId, [perimeter], [storey])

      expect(usage.isUsed).toBe(true)
      expect(usage.usedByWalls).toEqual(['Test Floor - Wall 1', 'Test Floor - Wall 3'])
    })
  })
})
