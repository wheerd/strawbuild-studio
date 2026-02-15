import { describe, expect, it } from 'vitest'

import type { PerimeterId, RoofId, StoreyId, WallId } from '@/building/model/ids'
import type { ConstructionElementId } from '@/construction/elements'
import type { MaterialId } from '@/construction/materials/material'
import { newVec3 } from '@/shared/geometry'

import { aggregateParts } from './hooks'
import type { PartDefinition, PartId, PartOccurrence, PartsFilter } from './types'

const createPartId = (id: string): PartId => id as PartId
const createMaterialId = (id: string): MaterialId => id as MaterialId
const createElementId = (id: string): ConstructionElementId => id as ConstructionElementId
const createStoreyId = (id: string): StoreyId => `storey_${id}`
const createPerimeterId = (id: string): PerimeterId => `perimeter_${id}`
const createWallId = (id: string): WallId => `wall_${id}` as WallId
const createRoofId = (id: string): RoofId => `roof_${id}`

const createOccurrence = (partial: Partial<PartOccurrence>): PartOccurrence => ({
  elementId: createElementId('e-default'),
  partId: createPartId('p-default'),
  virtual: false,
  ...partial
})

const createDefinition = (partial: Partial<PartDefinition>): PartDefinition => ({
  partId: createPartId('p-default'),
  source: 'element',
  type: 'post',
  size: newVec3(100, 100, 100),
  volume: 1000,
  ...partial
})

describe('aggregateParts', () => {
  describe('empty/no-match scenarios', () => {
    it('returns empty array when occurrences is empty', () => {
      const result = aggregateParts([], {}, {}, {})
      expect(result).toEqual([])
    })

    it('returns empty array when filter matches nothing', () => {
      const occurrences = [createOccurrence({ partId: createPartId('p1'), storeyId: createStoreyId('1') })]
      const definitions = { p1: createDefinition({ partId: createPartId('p1') }) }
      const filter: PartsFilter = { storeyId: createStoreyId('99') }

      const result = aggregateParts(occurrences, filter, definitions, {})

      expect(result).toEqual([])
    })
  })

  describe('basic aggregation', () => {
    it('groups multiple occurrences of same partId into one item', () => {
      const partId = createPartId('p1')
      const occurrences = [
        createOccurrence({ elementId: createElementId('e1'), partId }),
        createOccurrence({ elementId: createElementId('e2'), partId }),
        createOccurrence({ elementId: createElementId('e3'), partId })
      ]
      const definitions = { p1: createDefinition({ partId, volume: 1000 }) }

      const result = aggregateParts(occurrences, {}, definitions, {})

      expect(result).toHaveLength(1)
      expect(result[0].quantity).toBe(3)
    })

    it('creates separate items for different partIds', () => {
      const partId1 = createPartId('p1')
      const partId2 = createPartId('p2')
      const occurrences = [
        createOccurrence({ elementId: createElementId('e1'), partId: partId1 }),
        createOccurrence({ elementId: createElementId('e2'), partId: partId2 })
      ]
      const definitions = {
        p1: createDefinition({ partId: partId1, type: 'post' }),
        p2: createDefinition({ partId: partId2, type: 'beam' })
      }

      const result = aggregateParts(occurrences, {}, definitions, {})

      expect(result).toHaveLength(2)
      expect(result.find(r => r.partId === partId1)).toBeDefined()
      expect(result.find(r => r.partId === partId2)).toBeDefined()
    })

    it('correctly calculates quantity as count of occurrences', () => {
      const partId1 = createPartId('p1')
      const partId2 = createPartId('p2')
      const occurrences = [
        createOccurrence({ elementId: createElementId('e1'), partId: partId1 }),
        createOccurrence({ elementId: createElementId('e2'), partId: partId2 }),
        createOccurrence({ elementId: createElementId('e3'), partId: partId1 }),
        createOccurrence({ elementId: createElementId('e4'), partId: partId2 }),
        createOccurrence({ elementId: createElementId('e5'), partId: partId1 })
      ]
      const definitions = {
        p1: createDefinition({ partId: partId1 }),
        p2: createDefinition({ partId: partId2 })
      }

      const result = aggregateParts(occurrences, {}, definitions, {})

      expect(result.map(r => r.quantity).sort()).toEqual([2, 3])
    })

    it('collects all elementIds from occurrences', () => {
      const partId = createPartId('p1')
      const occurrences = [
        createOccurrence({ elementId: createElementId('e1'), partId }),
        createOccurrence({ elementId: createElementId('e2'), partId }),
        createOccurrence({ elementId: createElementId('e3'), partId })
      ]
      const definitions = { p1: createDefinition({ partId }) }

      const result = aggregateParts(occurrences, {}, definitions, {})

      expect(result[0].elementIds).toEqual(['e1', 'e2', 'e3'])
    })
  })

  describe('total calculations', () => {
    it('calculates totalVolume as quantity times part volume', () => {
      const partId = createPartId('p1')
      const occurrences = [
        createOccurrence({ elementId: createElementId('e1'), partId }),
        createOccurrence({ elementId: createElementId('e2'), partId })
      ]
      const definitions = { p1: createDefinition({ partId, volume: 500 }) }

      const result = aggregateParts(occurrences, {}, definitions, {})

      expect(result[0].totalVolume).toBe(1000)
    })

    it('calculates totalArea when part area exists', () => {
      const partId = createPartId('p1')
      const occurrences = [
        createOccurrence({ elementId: createElementId('e1'), partId }),
        createOccurrence({ elementId: createElementId('e2'), partId })
      ]
      const definitions = { p1: createDefinition({ partId, area: 200 }) }

      const result = aggregateParts(occurrences, {}, definitions, {})

      expect(result[0].totalArea).toBe(400)
    })

    it('omits totalArea when part area is undefined', () => {
      const partId = createPartId('p1')
      const occurrences = [createOccurrence({ elementId: createElementId('e1'), partId })]
      const definitions = { p1: createDefinition({ partId }) }

      const result = aggregateParts(occurrences, {}, definitions, {})

      expect(result[0].totalArea).toBeUndefined()
    })

    it('calculates totalLength when part length exists', () => {
      const partId = createPartId('p1')
      const occurrences = [
        createOccurrence({ elementId: createElementId('e1'), partId }),
        createOccurrence({ elementId: createElementId('e2'), partId })
      ]
      const definitions = { p1: createDefinition({ partId, length: 150 }) }

      const result = aggregateParts(occurrences, {}, definitions, {})

      expect(result[0].totalLength).toBe(300)
    })

    it('omits totalLength when definition.length is undefined', () => {
      const partId = createPartId('p1')
      const occurrences = [createOccurrence({ elementId: createElementId('e1'), partId })]
      const definitions = { p1: createDefinition({ partId }) }

      const result = aggregateParts(occurrences, {}, definitions, {})

      expect(result[0].totalLength).toBeUndefined()
    })
  })

  describe('label handling', () => {
    it('uses label from labels record when present', () => {
      const partId = createPartId('p1')
      const occurrences = [createOccurrence({ elementId: createElementId('e1'), partId })]
      const definitions = { p1: createDefinition({ partId }) }
      const labels = { p1: 'A' }

      const result = aggregateParts(occurrences, {}, definitions, labels)

      expect(result[0].label).toBe('A')
    })

    it('falls back to empty string when label not found', () => {
      const partId = createPartId('p1')
      const occurrences = [createOccurrence({ elementId: createElementId('e1'), partId })]
      const definitions = { p1: createDefinition({ partId }) }
      const labels: Record<PartId, string> = {}

      const result = aggregateParts(occurrences, {}, definitions, labels)

      expect(result[0].label).toBe('')
    })
  })

  describe('filtering', () => {
    it('filters by storeyId', () => {
      const partId = createPartId('p1')
      const storey1 = createStoreyId('1')
      const storey2 = createStoreyId('2')
      const occurrences = [
        createOccurrence({ elementId: createElementId('e1'), partId, storeyId: storey1 }),
        createOccurrence({ elementId: createElementId('e2'), partId, storeyId: storey1 }),
        createOccurrence({ elementId: createElementId('e3'), partId, storeyId: storey2 })
      ]
      const definitions = { p1: createDefinition({ partId }) }
      const filter: PartsFilter = { storeyId: storey1 }

      const result = aggregateParts(occurrences, filter, definitions, {})

      expect(result).toHaveLength(1)
      expect(result[0].quantity).toBe(2)
      expect(result[0].elementIds).not.toContain('e3')
    })

    it('filters by perimeterId', () => {
      const partId = createPartId('p1')
      const perimeter1 = createPerimeterId('1')
      const perimeter2 = createPerimeterId('2')
      const occurrences = [
        createOccurrence({ elementId: createElementId('e1'), partId, perimeterId: perimeter1 }),
        createOccurrence({ elementId: createElementId('e2'), partId, perimeterId: perimeter2 })
      ]
      const definitions = { p1: createDefinition({ partId }) }
      const filter: PartsFilter = { perimeterId: perimeter1 }

      const result = aggregateParts(occurrences, filter, definitions, {})

      expect(result).toHaveLength(1)
      expect(result[0].elementIds).toEqual(['e1'])
    })

    it('filters by wallId', () => {
      const partId = createPartId('p1')
      const wall1 = createWallId('1')
      const wall2 = createWallId('2')
      const occurrences = [
        createOccurrence({ elementId: createElementId('e1'), partId, wallId: wall1 }),
        createOccurrence({ elementId: createElementId('e2'), partId, wallId: wall2 })
      ]
      const definitions = { p1: createDefinition({ partId }) }
      const filter: PartsFilter = { wallId: wall1 }

      const result = aggregateParts(occurrences, filter, definitions, {})

      expect(result).toHaveLength(1)
      expect(result[0].elementIds).toEqual(['e1'])
    })

    it('filters by roofId', () => {
      const partId = createPartId('p1')
      const roof1 = createRoofId('1')
      const roof2 = createRoofId('2')
      const occurrences = [
        createOccurrence({ elementId: createElementId('e1'), partId, roofId: roof1 }),
        createOccurrence({ elementId: createElementId('e2'), partId, roofId: roof2 })
      ]
      const definitions = { p1: createDefinition({ partId }) }
      const filter: PartsFilter = { roofId: roof1 }

      const result = aggregateParts(occurrences, filter, definitions, {})

      expect(result).toHaveLength(1)
      expect(result[0].elementIds).toEqual(['e1'])
    })

    it('filters by virtual=true', () => {
      const partId = createPartId('p1')
      const occurrences = [
        createOccurrence({ elementId: createElementId('e1'), partId, virtual: false }),
        createOccurrence({ elementId: createElementId('e2'), partId, virtual: true }),
        createOccurrence({ elementId: createElementId('e3'), partId, virtual: true })
      ]
      const definitions = { p1: createDefinition({ partId }) }
      const filter: PartsFilter = { virtual: true }

      const result = aggregateParts(occurrences, filter, definitions, {})

      expect(result).toHaveLength(1)
      expect(result[0].quantity).toBe(2)
      expect(result[0].elementIds).not.toContain('e1')
    })

    it('filters by virtual=false', () => {
      const partId = createPartId('p1')
      const occurrences = [
        createOccurrence({ elementId: createElementId('e1'), partId, virtual: false }),
        createOccurrence({ elementId: createElementId('e2'), partId, virtual: false }),
        createOccurrence({ elementId: createElementId('e3'), partId, virtual: true })
      ]
      const definitions = { p1: createDefinition({ partId }) }
      const filter: PartsFilter = { virtual: false }

      const result = aggregateParts(occurrences, filter, definitions, {})

      expect(result).toHaveLength(1)
      expect(result[0].quantity).toBe(2)
      expect(result[0].elementIds).not.toContain('e3')
    })

    it('combines multiple filters with AND logic', () => {
      const partId = createPartId('p1')
      const storey1 = createStoreyId('1')
      const perimeter1 = createPerimeterId('1')
      const perimeter2 = createPerimeterId('2')
      const occurrences = [
        createOccurrence({
          elementId: createElementId('e1'),
          partId,
          storeyId: storey1,
          perimeterId: perimeter1,
          virtual: false
        }),
        createOccurrence({
          elementId: createElementId('e2'),
          partId,
          storeyId: storey1,
          perimeterId: perimeter2,
          virtual: false
        }),
        createOccurrence({
          elementId: createElementId('e3'),
          partId,
          storeyId: storey1,
          perimeterId: perimeter1,
          virtual: true
        })
      ]
      const definitions = { p1: createDefinition({ partId }) }
      const filter: PartsFilter = { storeyId: storey1, perimeterId: perimeter1, virtual: false }

      const result = aggregateParts(occurrences, filter, definitions, {})

      expect(result).toHaveLength(1)
      expect(result[0].elementIds).toEqual(['e1'])
    })

    it('returns all occurrences when filter is empty', () => {
      const partId = createPartId('p1')
      const occurrences = [
        createOccurrence({ elementId: createElementId('e1'), partId }),
        createOccurrence({ elementId: createElementId('e2'), partId }),
        createOccurrence({ elementId: createElementId('e3'), partId })
      ]
      const definitions = { p1: createDefinition({ partId }) }

      const result = aggregateParts(occurrences, {}, definitions, {})

      expect(result).toHaveLength(1)
      expect(result[0].quantity).toBe(3)
    })
  })

  describe('definition spread', () => {
    it('spreads all definition properties into result', () => {
      const partId = createPartId('p1')
      const materialId = createMaterialId('mat1')
      const occurrences = [createOccurrence({ elementId: createElementId('e1'), partId })]
      const definitions = {
        p1: createDefinition({
          partId,
          materialId,
          materialType: 'dimensional',
          source: 'group',
          type: 'beam',
          subtype: 'load-bearing',
          size: newVec3(200, 50, 50),
          volume: 500000,
          area: 100,
          length: 200,
          requiresSinglePiece: true
        })
      }

      const result = aggregateParts(occurrences, {}, definitions, {})

      expect(result[0].materialId).toBe(materialId)
      expect(result[0].materialType).toBe('dimensional')
      expect(result[0].source).toBe('group')
      expect(result[0].type).toBe('beam')
      expect(result[0].subtype).toBe('load-bearing')
      expect(result[0].size).toEqual(newVec3(200, 50, 50))
      expect(result[0].requiresSinglePiece).toBe(true)
    })
  })
})
