import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PerimeterId, RoofId, StoreyId, WallId } from '@/building/model/ids'
import type { ConstructionElementId } from '@/construction/elements'
import type { MaterialId } from '@/construction/materials/material'
import { Bounds3D, newVec3 } from '@/shared/geometry'

import { getPartsActions, usePartsStore } from './store'
import type { PartDefinition, PartId, PartOccurrence } from './types'

vi.mock('@/construction/store', () => ({
  ensureConstructionLoaded: vi.fn(),
  getConstructionModel: vi.fn(() => ({
    elements: [],
    measurements: [],
    areas: [],
    errors: [],
    warnings: [],
    bounds: Bounds3D.EMPTY
  }))
}))

vi.mock('@/construction/store/store', () => ({
  useConstructionStore: {
    getState: vi.fn(() => ({ generatedAt: 0 })),
    subscribe: vi.fn()
  }
}))

const indexToLabel = (index: number): string => {
  const alphabetLength = 26
  let current = index
  let label = ''

  do {
    const remainder = current % alphabetLength
    label = String.fromCharCode(65 + remainder) + label
    current = Math.floor(current / alphabetLength) - 1
  } while (current >= 0)

  return label
}

const createPartId = (id: string): PartId => id as PartId
const createMaterialId = (id: string): MaterialId => id as MaterialId
const createElementId = (id: string): ConstructionElementId => id as ConstructionElementId
const createStoreyId = (id: string): StoreyId => `storey_${id}`
const createPerimeterId = (id: string): PerimeterId => `perimeter_${id}`
const createWallId = (id: string): WallId => `wall_${id}` as WallId
const createRoofId = (id: string): RoofId => `roof_${id}`

describe('indexToLabel', () => {
  it('generates A-Z for indices 0-25', () => {
    expect(indexToLabel(0)).toBe('A')
    expect(indexToLabel(1)).toBe('B')
    expect(indexToLabel(25)).toBe('Z')
  })

  it('generates AA-AZ for indices 26-51', () => {
    expect(indexToLabel(26)).toBe('AA')
    expect(indexToLabel(27)).toBe('AB')
    expect(indexToLabel(51)).toBe('AZ')
  })

  it('generates BA-BZ for indices 52-77', () => {
    expect(indexToLabel(52)).toBe('BA')
    expect(indexToLabel(77)).toBe('BZ')
  })

  it('generates multi-letter labels for larger indices', () => {
    expect(indexToLabel(702)).toBe('AAA')
    expect(indexToLabel(703)).toBe('AAB')
  })
})

describe('usePartsStore', () => {
  beforeEach(() => {
    usePartsStore.setState({
      definitions: {},
      occurrences: [],
      labels: {},
      usedLabelsByGroup: {},
      nextLabelIndexByGroup: {},
      hasParts: false,
      generatedAt: 0
    })
  })

  describe('initial state', () => {
    it('has empty initial state', () => {
      const state = usePartsStore.getState()

      expect(state.definitions).toEqual({})
      expect(state.occurrences).toEqual([])
      expect(state.labels).toEqual({})
      expect(state.hasParts).toBe(false)
      expect(state.generatedAt).toBe(0)
    })
  })

  describe('resetLabels', () => {
    it('resets all labels when no groupId provided', () => {
      const partA = createPartId('part-a')
      const partB = createPartId('part-b')
      const definitions: Record<PartId, PartDefinition> = {
        [partA]: {
          partId: partA,
          materialId: createMaterialId('mat1'),
          source: 'element',
          type: 'post',
          size: newVec3(100, 100, 100),
          volume: 1000000
        },
        [partB]: {
          partId: partB,
          materialId: createMaterialId('mat1'),
          source: 'element',
          type: 'beam',
          size: newVec3(200, 50, 50),
          volume: 500000
        }
      }

      usePartsStore.setState({
        definitions,
        labels: { [partA]: 'B', [partB]: 'A' },
        usedLabelsByGroup: { 'material:mat1': ['B', 'A'] },
        nextLabelIndexByGroup: { 'material:mat1': 2 }
      })

      getPartsActions().resetLabels()

      const newState = usePartsStore.getState()
      expect(newState.labels[partA]).toBe('A')
      expect(newState.labels[partB]).toBe('B')
      expect(newState.nextLabelIndexByGroup['material:mat1']).toBe(2)
    })

    it('resets only specified group when groupId provided', () => {
      const partA = createPartId('part-a')
      const partB = createPartId('part-b')
      const definitions: Record<PartId, PartDefinition> = {
        [partA]: {
          partId: partA,
          materialId: createMaterialId('mat1'),
          source: 'element',
          type: 'post',
          size: newVec3(100, 100, 100),
          volume: 1000000
        },
        [partB]: {
          partId: partB,
          materialId: createMaterialId('mat2'),
          source: 'element',
          type: 'beam',
          size: newVec3(200, 50, 50),
          volume: 500000
        }
      }

      usePartsStore.setState({
        definitions,
        labels: { [partA]: 'B', [partB]: 'C' },
        usedLabelsByGroup: { 'material:mat1': ['B'], 'material:mat2': ['C'] },
        nextLabelIndexByGroup: { 'material:mat1': 1, 'material:mat2': 1 }
      })

      getPartsActions().resetLabels('material:mat1')

      const newState = usePartsStore.getState()
      expect(newState.labels[partA]).toBe('A')
      expect(newState.labels[partB]).toBe('C')
      expect(newState.usedLabelsByGroup['material:mat1']).toEqual(['A'])
      expect(newState.usedLabelsByGroup['material:mat2']).toEqual(['C'])
    })

    it('resets virtual group labels', () => {
      const partA = createPartId('vpart-a')
      const definitions: Record<PartId, PartDefinition> = {
        [partA]: {
          partId: partA,
          source: 'group',
          type: 'module',
          size: newVec3(100, 100, 100),
          volume: 1000000
        }
      }

      usePartsStore.setState({
        definitions,
        labels: { [partA]: 'B' },
        usedLabelsByGroup: { virtual: ['B'] },
        nextLabelIndexByGroup: { virtual: 1 }
      })

      getPartsActions().resetLabels('virtual')

      const newState = usePartsStore.getState()
      expect(newState.labels[partA]).toBe('A')
      expect(newState.usedLabelsByGroup.virtual).toEqual(['A'])
    })
  })

  describe('getFilteredOccurrences', () => {
    const createOccurrence = (partial: Partial<PartOccurrence>): PartOccurrence => ({
      elementId: createElementId('e-default'),
      partId: createPartId('p-default'),
      virtual: false,
      ...partial
    })

    const occ1 = createOccurrence({
      elementId: createElementId('e1'),
      partId: createPartId('p1'),
      virtual: false,
      storeyId: createStoreyId('1'),
      perimeterId: createPerimeterId('1'),
      wallId: createWallId('1')
    })
    const occ2 = createOccurrence({
      elementId: createElementId('e2'),
      partId: createPartId('p2'),
      virtual: false,
      storeyId: createStoreyId('1'),
      perimeterId: createPerimeterId('1')
    })
    const occ3 = createOccurrence({
      elementId: createElementId('e3'),
      partId: createPartId('p3'),
      virtual: false,
      storeyId: createStoreyId('2'),
      perimeterId: createPerimeterId('2')
    })
    const occ4 = createOccurrence({
      elementId: createElementId('e4'),
      partId: createPartId('p4'),
      virtual: true,
      storeyId: createStoreyId('1')
    })

    beforeEach(() => {
      usePartsStore.setState({
        occurrences: [occ1, occ2, occ3, occ4]
      })
    })

    it('filters by storeyId', () => {
      const filtered = getPartsActions().getFilteredOccurrences({ storeyId: createStoreyId('1') })
      expect(filtered).toHaveLength(3)
      expect(filtered.every(o => o.storeyId === createStoreyId('1'))).toBe(true)
    })

    it('filters by perimeterId', () => {
      const filtered = getPartsActions().getFilteredOccurrences({ perimeterId: createPerimeterId('1') })
      expect(filtered).toHaveLength(2)
      expect(filtered.every(o => o.perimeterId === createPerimeterId('1'))).toBe(true)
    })

    it('filters by wallId', () => {
      const filtered = getPartsActions().getFilteredOccurrences({ wallId: createWallId('1') })
      expect(filtered).toHaveLength(1)
      expect(filtered[0].elementId).toBe(occ1.elementId)
    })

    it('filters by roofId', () => {
      usePartsStore.setState({
        occurrences: [
          createOccurrence({ ...occ1, roofId: createRoofId('1') }),
          createOccurrence({ ...occ2, roofId: createRoofId('1') }),
          occ3
        ]
      })

      const filtered = getPartsActions().getFilteredOccurrences({ roofId: createRoofId('1') })
      expect(filtered).toHaveLength(2)
    })

    it('combines multiple filters', () => {
      const filtered = getPartsActions().getFilteredOccurrences({
        storeyId: createStoreyId('1'),
        perimeterId: createPerimeterId('1')
      })
      expect(filtered).toHaveLength(2)
    })

    it('returns all when no filter provided', () => {
      const filtered = getPartsActions().getFilteredOccurrences({})
      expect(filtered).toHaveLength(4)
    })
  })
})
