import { describe, expect, it } from 'vitest'

import {
  DEFAULT_FLOOR_ASSEMBLY_ID,
  createPerimeterId,
  createPerimeterWallId,
  createRingBeamAssemblyId,
  createStoreyId,
  createWallAssemblyId
} from '@/building/model/ids'
import type { Perimeter, Storey } from '@/building/model/model'
import { createStoreyLevel } from '@/building/model/model'
import { ZERO_VEC2, newVec2 } from '@/shared/geometry'

import { getRingBeamAssemblyUsage, getWallAssemblyUsage } from './usage'

describe('Assembly Usage Detection', () => {
  const storeyId = createStoreyId()
  const storey: Storey = {
    id: storeyId,
    name: 'Test Floor',
    level: createStoreyLevel(0),
    floorHeight: 3000,
    floorAssemblyId: DEFAULT_FLOOR_ASSEMBLY_ID
  }

  describe('getRingBeamAssemblyUsage', () => {
    it('should detect ring beam assembly not in use', () => {
      const assemblyId = createRingBeamAssemblyId()
      const perimeters: Perimeter[] = []
      const storeys = [storey]

      const usage = getRingBeamAssemblyUsage(assemblyId, perimeters, storeys)

      expect(usage.isUsed).toBe(false)
      expect(usage.usedByPerimeters).toEqual([])
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

      const usage = getRingBeamAssemblyUsage(assemblyId, [perimeter], [storey])

      expect(usage.isUsed).toBe(true)
      expect(usage.usedByPerimeters).toEqual(['Test Floor - Wall 1 (Base Plate)'])
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

      const usage = getRingBeamAssemblyUsage(assemblyId, [perimeter], [storey])

      expect(usage.isUsed).toBe(true)
      expect(usage.usedByPerimeters).toEqual(['Test Floor - Wall 1 (Top Plate)'])
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

      const usage = getRingBeamAssemblyUsage(assemblyId, [perimeter1, perimeter2], [storey])

      expect(usage.isUsed).toBe(true)
      expect(usage.usedByPerimeters).toHaveLength(2)
      expect(usage.usedByPerimeters).toContain('Test Floor - Wall 1 (Base Plate)')
      expect(usage.usedByPerimeters).toContain('Test Floor - Wall 1 (Top Plate)')
    })
  })

  describe('getWallAssemblyUsage', () => {
    it('should detect wall assembly not in use', () => {
      const assemblyId = createWallAssemblyId()

      const usage = getWallAssemblyUsage(assemblyId, [], [storey])

      expect(usage.isUsed).toBe(false)
      expect(usage.usedByWalls).toEqual([])
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

      const usage = getWallAssemblyUsage(assemblyId, [perimeter], [storey])

      expect(usage.isUsed).toBe(true)
      expect(usage.usedByWalls).toEqual(['Test Floor - Wall 1', 'Test Floor - Wall 3'])
    })
  })
})
