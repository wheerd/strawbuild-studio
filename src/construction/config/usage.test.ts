import { vec2 } from 'gl-matrix'
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
import '@/shared/geometry'

import { getRingBeamAssemblyUsage, getWallAssemblyUsage } from './usage'

describe('Assembly Usage Detection', () => {
  const storeyId = createStoreyId()
  const storey: Storey = {
    id: storeyId,
    name: 'Test Floor',
    level: createStoreyLevel(0),
    height: 3000,
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
        walls: [],
        corners: [],
        baseRingBeamAssemblyId: assemblyId,
        topRingBeamAssemblyId: undefined
      }

      const usage = getRingBeamAssemblyUsage(assemblyId, [perimeter], [storey])

      expect(usage.isUsed).toBe(true)
      expect(usage.usedByPerimeters).toEqual(['Test Floor - Base Ring Beam'])
    })

    it('should detect ring beam assembly used as top ring beam', () => {
      const assemblyId = createRingBeamAssemblyId()
      const perimeterId = createPerimeterId()

      const perimeter: Perimeter = {
        id: perimeterId,
        storeyId,
        walls: [],
        corners: [],
        baseRingBeamAssemblyId: undefined,
        topRingBeamAssemblyId: assemblyId
      }

      const usage = getRingBeamAssemblyUsage(assemblyId, [perimeter], [storey])

      expect(usage.isUsed).toBe(true)
      expect(usage.usedByPerimeters).toEqual(['Test Floor - Top Ring Beam'])
    })

    it('should detect ring beam assembly used in multiple places', () => {
      const assemblyId = createRingBeamAssemblyId()
      const perimeter1Id = createPerimeterId()
      const perimeter2Id = createPerimeterId()

      const perimeter1: Perimeter = {
        id: perimeter1Id,
        storeyId,
        walls: [],
        corners: [],
        baseRingBeamAssemblyId: assemblyId,
        topRingBeamAssemblyId: undefined
      }

      const perimeter2: Perimeter = {
        id: perimeter2Id,
        storeyId,
        walls: [],
        corners: [],
        baseRingBeamAssemblyId: undefined,
        topRingBeamAssemblyId: assemblyId
      }

      const usage = getRingBeamAssemblyUsage(assemblyId, [perimeter1, perimeter2], [storey])

      expect(usage.isUsed).toBe(true)
      expect(usage.usedByPerimeters).toHaveLength(2)
      expect(usage.usedByPerimeters).toContain('Test Floor - Base Ring Beam')
      expect(usage.usedByPerimeters).toContain('Test Floor - Top Ring Beam')
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
        walls: [
          {
            id: createPerimeterWallId(),
            thickness: 420,
            wallAssemblyId: assemblyId,
            openings: [],
            insideLength: 1000,
            outsideLength: 1000,
            wallLength: 1000,
            insideLine: { start: vec2.fromValues(0, 0), end: vec2.fromValues(1000, 0) },
            outsideLine: { start: vec2.fromValues(0, 420), end: vec2.fromValues(1000, 420) },
            direction: vec2.fromValues(1, 0),
            outsideDirection: vec2.fromValues(0, 1)
          },
          {
            id: createPerimeterWallId(),
            thickness: 420,
            wallAssemblyId: createWallAssemblyId(), // Different assembly
            openings: [],
            insideLength: 1000,
            outsideLength: 1000,
            wallLength: 1000,
            insideLine: { start: vec2.fromValues(1000, 0), end: vec2.fromValues(1000, 1000) },
            outsideLine: { start: vec2.fromValues(1440, 0), end: vec2.fromValues(1440, 1000) },
            direction: vec2.fromValues(0, 1),
            outsideDirection: vec2.fromValues(1, 0)
          },
          {
            id: createPerimeterWallId(),
            thickness: 420,
            wallAssemblyId: assemblyId, // Same assembly as first wall
            openings: [],
            insideLength: 1000,
            outsideLength: 1000,
            wallLength: 1000,
            insideLine: { start: vec2.fromValues(1000, 1000), end: vec2.fromValues(0, 1000) },
            outsideLine: { start: vec2.fromValues(1000, 1440), end: vec2.fromValues(0, 1440) },
            direction: vec2.fromValues(-1, 0),
            outsideDirection: vec2.fromValues(0, 1)
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
