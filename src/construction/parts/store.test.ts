import { describe, expect, it } from 'vitest'

import type { MaterialId } from '@/construction/materials/material'
import { partial } from '@/test/helpers'

import { assignLabelsForNewParts, regenerateLabels } from './store'
import type { PartDefinition, PartId, PartsStoreState } from './types'

const createPartId = (id: string): PartId => id as PartId
const createMaterialId = (id: string): MaterialId => id as MaterialId

const createPartDefinition = (partialDef: Partial<PartDefinition>) =>
  partial<PartDefinition>({
    partId: createPartId('part1'),
    source: 'element',
    type: 'wall-infill',
    size: [100, 200, 300],
    volume: 100 * 200 * 300,
    ...partialDef
  })

const createStoreState = (partialState: Partial<PartsStoreState>) => ({
  definitions: {},
  occurrences: [],
  labels: {},
  usedLabelsByGroup: {},
  nextLabelIndexByGroup: {},
  hasParts: false,
  rebuilding: false,
  generatedAt: 0,
  ...partialState
})

describe('regenerateLabels', () => {
  describe('regenerate all labels (groupId undefined)', () => {
    it('generates fresh labels for all definitions starting from index 0', () => {
      const part1 = createPartId('part1')
      const part2 = createPartId('part2')
      const mat1 = createMaterialId('mat1')
      const state = createStoreState({
        definitions: {
          [part1]: createPartDefinition({ partId: part1, materialId: mat1 }),
          [part2]: createPartDefinition({ partId: part2, materialId: mat1 })
        },
        labels: { [part1]: 'Z', [part2]: 'AA' },
        usedLabelsByGroup: { 'material:mat1': ['Z', 'AA'] },
        nextLabelIndexByGroup: { 'material:mat1': 52 }
      })

      const result = regenerateLabels(undefined, state)

      expect(result.labels[part1]).toBe('A')
      expect(result.labels[part2]).toBe('B')
      expect(result.usedLabelsByGroup['material:mat1']).toEqual(['A', 'B'])
      expect(result.nextLabelIndexByGroup['material:mat1']).toBe(2)
    })

    it('resets state for empty definitions', () => {
      const oldPart = createPartId('oldPart')
      const state = createStoreState({
        definitions: {},
        labels: { [oldPart]: 'X' },
        usedLabelsByGroup: { 'material:mat1': ['X'] },
        nextLabelIndexByGroup: { 'material:mat1': 24 }
      })

      const result = regenerateLabels(undefined, state)

      expect(result.labels).toEqual({})
      expect(result.usedLabelsByGroup).toEqual({})
      expect(result.nextLabelIndexByGroup).toEqual({})
    })
  })

  describe('regenerate specific group only', () => {
    it('only regenerates labels for parts matching the groupId', () => {
      const part1 = createPartId('part1')
      const part2 = createPartId('part2')
      const mat1 = createMaterialId('mat1')
      const mat2 = createMaterialId('mat2')
      const state = createStoreState({
        definitions: {
          [part1]: createPartDefinition({ partId: part1, materialId: mat1 }),
          [part2]: createPartDefinition({ partId: part2, materialId: mat2 })
        },
        labels: { [part1]: 'Z', [part2]: 'Y' },
        usedLabelsByGroup: {
          'material:mat1': ['Z'],
          'material:mat2': ['Y']
        },
        nextLabelIndexByGroup: {
          'material:mat1': 25,
          'material:mat2': 24
        }
      })

      const result = regenerateLabels('material:mat1', state)

      expect(result.labels[part1]).toBe('A')
      expect(result.labels[part2]).toBe('Y')
      expect(result.usedLabelsByGroup['material:mat1']).toEqual(['A'])
      expect(result.usedLabelsByGroup['material:mat2']).toEqual(['Y'])
      expect(result.nextLabelIndexByGroup['material:mat1']).toBe(1)
      expect(result.nextLabelIndexByGroup['material:mat2']).toBe(24)
    })

    it('does not preserve labels for parts not in definitions', () => {
      const part1 = createPartId('part1')
      const orphanPart = createPartId('orphanPart')
      const mat1 = createMaterialId('mat1')
      const state = createStoreState({
        definitions: {
          [part1]: createPartDefinition({ partId: part1, materialId: mat1 })
        },
        labels: { [part1]: 'Z', [orphanPart]: 'X' },
        usedLabelsByGroup: { 'material:mat1': ['Z'] },
        nextLabelIndexByGroup: { 'material:mat1': 25 }
      })

      const result = regenerateLabels(undefined, state)

      expect(result.labels[part1]).toBe('A')
      expect(result.labels[orphanPart]).toBeUndefined()
    })
  })

  describe('group ID determination', () => {
    it('uses "virtual" groupId for parts with source "group"', () => {
      const part1 = createPartId('part1')
      const state = createStoreState({
        definitions: {
          [part1]: createPartDefinition({ partId: part1, source: 'group' })
        }
      })

      const result = regenerateLabels(undefined, state)

      expect(result.usedLabelsByGroup.virtual).toEqual(['A'])
      expect(result.nextLabelIndexByGroup.virtual).toBe(1)
    })

    it('uses "material:{materialId}" groupId for parts with source "element"', () => {
      const part1 = createPartId('part1')
      const myMaterial = createMaterialId('myMaterial')
      const state = createStoreState({
        definitions: {
          [part1]: createPartDefinition({
            partId: part1,
            source: 'element',
            materialId: myMaterial
          })
        }
      })

      const result = regenerateLabels(undefined, state)

      expect(result.usedLabelsByGroup['material:myMaterial']).toEqual(['A'])
      expect(result.nextLabelIndexByGroup['material:myMaterial']).toBe(1)
    })
  })

  describe('multiple groups', () => {
    it('tracks separate indices per group', () => {
      const part1 = createPartId('part1')
      const part2 = createPartId('part2')
      const part3 = createPartId('part3')
      const part4 = createPartId('part4')
      const part5 = createPartId('part5')
      const mat1 = createMaterialId('mat1')
      const mat2 = createMaterialId('mat2')
      const state = createStoreState({
        definitions: {
          [part1]: createPartDefinition({ partId: part1, source: 'group' }),
          [part2]: createPartDefinition({ partId: part2, source: 'group' }),
          [part3]: createPartDefinition({ partId: part3, materialId: mat1 }),
          [part4]: createPartDefinition({ partId: part4, materialId: mat1 }),
          [part5]: createPartDefinition({ partId: part5, materialId: mat2 })
        }
      })

      const result = regenerateLabels(undefined, state)

      expect(result.labels[part1]).toBe('A')
      expect(result.labels[part2]).toBe('B')
      expect(result.labels[part3]).toBe('A')
      expect(result.labels[part4]).toBe('B')
      expect(result.labels[part5]).toBe('A')
      expect(result.usedLabelsByGroup.virtual).toEqual(['A', 'B'])
      expect(result.usedLabelsByGroup['material:mat1']).toEqual(['A', 'B'])
      expect(result.usedLabelsByGroup['material:mat2']).toEqual(['A'])
      expect(result.nextLabelIndexByGroup.virtual).toBe(2)
      expect(result.nextLabelIndexByGroup['material:mat1']).toBe(2)
      expect(result.nextLabelIndexByGroup['material:mat2']).toBe(1)
    })

    it('resets only specified group while preserving others', () => {
      const part1 = createPartId('part1')
      const part2 = createPartId('part2')
      const mat1 = createMaterialId('mat1')
      const state = createStoreState({
        definitions: {
          [part1]: createPartDefinition({ partId: part1, source: 'group' }),
          [part2]: createPartDefinition({ partId: part2, materialId: mat1 })
        },
        labels: { [part1]: 'Z', [part2]: 'Y' },
        usedLabelsByGroup: {
          virtual: ['Z'],
          'material:mat1': ['Y']
        },
        nextLabelIndexByGroup: {
          virtual: 25,
          'material:mat1': 24
        }
      })

      const result = regenerateLabels('virtual', state)

      expect(result.labels[part1]).toBe('A')
      expect(result.labels[part2]).toBe('Y')
      expect(result.nextLabelIndexByGroup.virtual).toBe(1)
      expect(result.nextLabelIndexByGroup['material:mat1']).toBe(24)
    })
  })
})

describe('assignLabelsForNewParts', () => {
  describe('all parts are new', () => {
    it('assigns labels to all parts starting from current index', () => {
      const part1 = createPartId('part1')
      const part2 = createPartId('part2')
      const mat1 = createMaterialId('mat1')
      const definitions = {
        [part1]: createPartDefinition({ partId: part1, materialId: mat1 }),
        [part2]: createPartDefinition({ partId: part2, materialId: mat1 })
      }
      const current = {
        labels: {},
        usedLabelsByGroup: {},
        nextLabelIndexByGroup: {}
      }

      const result = assignLabelsForNewParts(definitions, current)

      expect(result.labels[part1]).toBe('A')
      expect(result.labels[part2]).toBe('B')
      expect(result.usedLabelsByGroup['material:mat1']).toEqual(['A', 'B'])
      expect(result.nextLabelIndexByGroup['material:mat1']).toBe(2)
    })

    it('continues from existing nextLabelIndexByGroup', () => {
      const part1 = createPartId('part1')
      const mat1 = createMaterialId('mat1')
      const definitions = {
        [part1]: createPartDefinition({ partId: part1, materialId: mat1 })
      }
      const current = {
        labels: {},
        usedLabelsByGroup: { 'material:mat1': ['A', 'B'] },
        nextLabelIndexByGroup: { 'material:mat1': 2 }
      }

      const result = assignLabelsForNewParts(definitions, current)

      expect(result.labels[part1]).toBe('C')
      expect(result.usedLabelsByGroup['material:mat1']).toEqual(['A', 'B', 'C'])
      expect(result.nextLabelIndexByGroup['material:mat1']).toBe(3)
    })
  })

  describe('some parts already labeled', () => {
    it('preserves existing labels and continues from next index', () => {
      const part1 = createPartId('part1')
      const part2 = createPartId('part2')
      const mat1 = createMaterialId('mat1')
      const definitions = {
        [part1]: createPartDefinition({ partId: part1, materialId: mat1 }),
        [part2]: createPartDefinition({ partId: part2, materialId: mat1 })
      }
      const current = {
        labels: { [part1]: 'X' },
        usedLabelsByGroup: { 'material:mat1': ['X'] },
        nextLabelIndexByGroup: { 'material:mat1': 24 }
      }

      const result = assignLabelsForNewParts(definitions, current)

      expect(result.labels[part1]).toBe('X')
      expect(result.labels[part2]).toBe('Y')
      expect(result.usedLabelsByGroup['material:mat1']).toEqual(['X', 'Y'])
    })

    it('only assigns labels to parts not in current.labels', () => {
      const part1 = createPartId('part1')
      const part2 = createPartId('part2')
      const part3 = createPartId('part3')
      const mat1 = createMaterialId('mat1')
      const definitions = {
        [part1]: createPartDefinition({ partId: part1, materialId: mat1 }),
        [part2]: createPartDefinition({ partId: part2, materialId: mat1 }),
        [part3]: createPartDefinition({ partId: part3, materialId: mat1 })
      }
      const current = {
        labels: { [part1]: 'Z', [part2]: 'Y' },
        usedLabelsByGroup: { 'material:mat1': ['Z', 'Y'] },
        nextLabelIndexByGroup: { 'material:mat1': 2 }
      }

      const result = assignLabelsForNewParts(definitions, current)

      expect(result.labels[part1]).toBe('Z')
      expect(result.labels[part2]).toBe('Y')
      expect(result.labels[part3]).toBe('C')
    })
  })

  describe('empty definitions', () => {
    it('returns unchanged state', () => {
      const part1 = createPartId('part1')
      const current = {
        labels: { [part1]: 'A' },
        usedLabelsByGroup: { 'material:mat1': ['A'] },
        nextLabelIndexByGroup: { 'material:mat1': 1 }
      }

      const result = assignLabelsForNewParts({}, current)

      expect(result.labels[part1]).toBe('A')
      expect(result.usedLabelsByGroup['material:mat1']).toEqual(['A'])
      expect(result.nextLabelIndexByGroup['material:mat1']).toBe(1)
    })
  })

  describe('multiple groups', () => {
    it('tracks separate indices per group', () => {
      const part1 = createPartId('part1')
      const part2 = createPartId('part2')
      const part3 = createPartId('part3')
      const mat1 = createMaterialId('mat1')
      const mat2 = createMaterialId('mat2')
      const definitions = {
        [part1]: createPartDefinition({ partId: part1, source: 'group' }),
        [part2]: createPartDefinition({ partId: part2, materialId: mat1 }),
        [part3]: createPartDefinition({ partId: part3, materialId: mat2 })
      }
      const current = {
        labels: {},
        usedLabelsByGroup: {},
        nextLabelIndexByGroup: {}
      }

      const result = assignLabelsForNewParts(definitions, current)

      expect(result.labels[part1]).toBe('A')
      expect(result.labels[part2]).toBe('A')
      expect(result.labels[part3]).toBe('A')
      expect(result.usedLabelsByGroup.virtual).toEqual(['A'])
      expect(result.usedLabelsByGroup['material:mat1']).toEqual(['A'])
      expect(result.usedLabelsByGroup['material:mat2']).toEqual(['A'])
      expect(result.nextLabelIndexByGroup.virtual).toBe(1)
      expect(result.nextLabelIndexByGroup['material:mat1']).toBe(1)
      expect(result.nextLabelIndexByGroup['material:mat2']).toBe(1)
    })

    it('continues indices independently for each group', () => {
      const part1 = createPartId('part1')
      const part2 = createPartId('part2')
      const part3 = createPartId('part3')
      const mat1 = createMaterialId('mat1')
      const definitions = {
        [part1]: createPartDefinition({ partId: part1, source: 'group' }),
        [part2]: createPartDefinition({ partId: part2, source: 'group' }),
        [part3]: createPartDefinition({ partId: part3, materialId: mat1 })
      }
      const current = {
        labels: { [part3]: 'X' },
        usedLabelsByGroup: {
          virtual: ['Z'],
          'material:mat1': ['X']
        },
        nextLabelIndexByGroup: {
          virtual: 26,
          'material:mat1': 24
        }
      }

      const result = assignLabelsForNewParts(definitions, current)

      expect(result.labels[part1]).toBe('AA')
      expect(result.labels[part2]).toBe('AB')
      expect(result.labels[part3]).toBe('X')
      expect(result.nextLabelIndexByGroup.virtual).toBe(28)
      expect(result.nextLabelIndexByGroup['material:mat1']).toBe(24)
    })
  })
})
