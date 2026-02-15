import { type TFunction, keyFromSelector } from 'i18next'
import { describe, expect, it } from 'vitest'

import type {
  DimensionalMaterial,
  Material,
  MaterialId,
  PrefabMaterial,
  SheetMaterial,
  StrawbaleMaterial,
  VolumeMaterial
} from '@/construction/materials/material'
import {
  TAG_FLOOR_INFILL,
  TAG_FLOOR_LAYER_BOTTOM,
  TAG_FLOOR_LAYER_TOP,
  TAG_FULL_BALE,
  TAG_INFILL,
  TAG_MODULE,
  TAG_MODULE_INFILL,
  TAG_PARTIAL_BALE,
  TAG_ROOF_INFILL,
  TAG_ROOF_LAYER_INSIDE,
  TAG_ROOF_LAYER_OVERHANG,
  TAG_ROOF_LAYER_TOP,
  TAG_STRAW_FLAKES,
  TAG_STRAW_STUFFED,
  TAG_WALL_LAYER_INSIDE,
  TAG_WALL_LAYER_OUTSIDE,
  type Tag,
  createTag
} from '@/construction/tags'
import { newVec2, newVec3 } from '@/shared/geometry'
import { partial } from '@/test/helpers'

import {
  computeDimensionalDetails,
  computeMaterialMetrics,
  computePartDescription,
  computePartIdWithInfo,
  computePartIdWithoutInfo,
  computeSheetDetails,
  findMappedTag,
  getStrawCategoryFromTags,
  indexToLabel
} from './shared'
import type { FullPartInfo, PartId, SideFace } from './types'

const createMaterialId = (id: string): MaterialId => id as MaterialId
const createPartId = (id: string): PartId => id as PartId

const OTHER_TAG = createTag('construction', 'construction_other-tag', 'other')

const createDimensionalMaterial = (partial: Partial<DimensionalMaterial> = {}): DimensionalMaterial => ({
  id: createMaterialId('dim1'),
  type: 'dimensional',
  name: 'Dimensional Lumber',
  color: '#8B4513',
  crossSections: [
    { smallerLength: 50, biggerLength: 100 },
    { smallerLength: 50, biggerLength: 150 }
  ],
  lengths: [2000, 3000, 4000],
  ...partial
})

const createSheetMaterial = (partial: Partial<SheetMaterial> = {}): SheetMaterial => ({
  id: createMaterialId('sheet1'),
  type: 'sheet',
  name: 'Plywood',
  color: '#DEB887',
  sizes: [
    { smallerLength: 1200, biggerLength: 2400 },
    { smallerLength: 1200, biggerLength: 1200 }
  ],
  thicknesses: [12, 18, 24],
  sheetType: 'solid',
  ...partial
})

describe('indexToLabel', () => {
  it.each([
    [0, 'A'],
    [25, 'Z'],
    [26, 'AA'],
    [51, 'AZ'],
    [52, 'BA'],
    [702, 'AAA'],
    [703, 'AAB']
  ])('returns %s for index %i', (index, expected) => {
    expect(indexToLabel(index)).toBe(expected)
  })
})

describe('getStrawCategoryFromTags', () => {
  it.each([
    [TAG_FULL_BALE, 'full'],
    [TAG_PARTIAL_BALE, 'partial'],
    [TAG_STRAW_FLAKES, 'flakes'],
    [TAG_STRAW_STUFFED, 'stuffed']
  ])('returns %s when corresponding tag present', (tag, expected) => {
    expect(getStrawCategoryFromTags([tag])).toBe(expected)
  })

  it('returns stuffed as default when no matching tag', () => {
    const tags = [createTag('construction', 'custom', 'unused')]
    expect(getStrawCategoryFromTags(tags)).toBe('stuffed')
  })

  it('returns stuffed when tags array is undefined', () => {
    expect(getStrawCategoryFromTags(undefined)).toBe('stuffed')
  })

  it('returns stuffed when tags array is empty', () => {
    expect(getStrawCategoryFromTags([])).toBe('stuffed')
  })
})

describe('computeDimensionalDetails', () => {
  it('matches cross-section from material', () => {
    const material = createDimensionalMaterial()
    const result = computeDimensionalDetails(newVec3(50, 100, 2000), material)

    expect(result.crossSection).toEqual({ smallerLength: 50, biggerLength: 100 })
    expect(result.length).toBe(2000)
    expect(result.issue).toBeUndefined()
  })

  it('matches cross-section in different order (smaller first in size)', () => {
    const material = createDimensionalMaterial()
    const result = computeDimensionalDetails(newVec3(100, 50, 2000), material)

    expect(result.crossSection).toEqual({ smallerLength: 50, biggerLength: 100 })
    expect(result.length).toBe(2000)
  })

  it('matches cross-section in different order (length first in size)', () => {
    const material = createDimensionalMaterial()
    const result = computeDimensionalDetails(newVec3(2000, 50, 100), material)

    expect(result.crossSection).toEqual({ smallerLength: 50, biggerLength: 100 })
    expect(result.length).toBe(2000)
  })

  it('matches second cross-section option', () => {
    const material = createDimensionalMaterial()
    const result = computeDimensionalDetails(newVec3(50, 150, 3000), material)

    expect(result.crossSection).toEqual({ smallerLength: 50, biggerLength: 150 })
    expect(result.length).toBe(3000)
  })

  it('returns CrossSectionMismatch when no cross-section matches', () => {
    const material = createDimensionalMaterial()
    const result = computeDimensionalDetails(newVec3(75, 75, 2000), material)

    expect(result.issue).toBe('CrossSectionMismatch')
    expect(result.crossSection).toEqual({ smallerLength: 75, biggerLength: 75 })
    expect(result.length).toBe(2000)
  })

  it('returns LengthExceedsAvailable when length exceeds max available', () => {
    const material = createDimensionalMaterial()
    const result = computeDimensionalDetails(newVec3(50, 100, 5000), material)

    expect(result.issue).toBe('LengthExceedsAvailable')
    expect(result.length).toBe(5000)
  })

  it('does not return issue when length fits', () => {
    const material = createDimensionalMaterial()
    const result = computeDimensionalDetails(newVec3(50, 100, 3000), material)

    expect(result.issue).toBeUndefined()
  })

  it('handles material with no lengths defined', () => {
    const material = createDimensionalMaterial({ lengths: [] })
    const result = computeDimensionalDetails(newVec3(50, 100, 10000), material)

    expect(result.issue).toBeUndefined()
    expect(result.length).toBe(10000)
  })

  it('rounds dimensions before matching', () => {
    const material = createDimensionalMaterial()
    const result = computeDimensionalDetails(newVec3(49.6, 100.4, 2000), material)

    expect(result.crossSection).toEqual({ smallerLength: 50, biggerLength: 100 })
  })
})

describe('computeSheetDetails', () => {
  it('finds thickness from material thicknesses', () => {
    const material = createSheetMaterial()
    const result = computeSheetDetails(newVec3(18, 1200, 2400), material)

    expect(result.thickness).toBe(18)
    expect(result.issue).toBeUndefined()
  })

  it('returns correct area size (smaller x larger)', () => {
    const material = createSheetMaterial()
    const result = computeSheetDetails(newVec3(18, 1200, 2400), material)

    expect(result.areaSize).toEqual(newVec2(1200, 2400))
  })

  it('handles dimensions in any order', () => {
    const material = createSheetMaterial()
    const result = computeSheetDetails(newVec3(2400, 18, 1200), material)

    expect(result.thickness).toBe(18)
    expect(result.areaSize).toEqual(newVec2(1200, 2400))
  })

  it('returns ThicknessMismatch when thickness not found', () => {
    const material = createSheetMaterial()
    const result = computeSheetDetails(newVec3(10, 1200, 2400), material)

    expect(result.issue).toBe('ThicknessMismatch')
    expect(result.thickness).toBe(10)
  })

  it('uses smallest dimension as thickness when mismatch', () => {
    const material = createSheetMaterial()
    const result = computeSheetDetails(newVec3(10, 1200, 2400), material)

    expect(result.thickness).toBe(10)
    expect(result.areaSize).toEqual(newVec2(1200, 2400))
  })

  it('returns SheetSizeExceeded when area exceeds sheet sizes', () => {
    const material = createSheetMaterial()
    const result = computeSheetDetails(newVec3(18, 1500, 3000), material)

    expect(result.issue).toBe('SheetSizeExceeded')
  })

  it('does not return issue when area fits sheet size', () => {
    const material = createSheetMaterial()
    const result = computeSheetDetails(newVec3(18, 1200, 2400), material)

    expect(result.issue).toBeUndefined()
  })

  it('fits within square sheet', () => {
    const material = createSheetMaterial()
    const result = computeSheetDetails(newVec3(18, 1200, 1200), material)

    expect(result.issue).toBeUndefined()
    expect(result.areaSize).toEqual(newVec2(1200, 1200))
  })

  it('rounds dimensions before matching', () => {
    const material = createSheetMaterial()
    const result = computeSheetDetails(newVec3(17.6, 1200, 2400), material)

    expect(result.thickness).toBe(18)
  })
})

describe('computeMaterialMetrics', () => {
  describe('dimensional material', () => {
    it('calls computeDimensionalDetails and sets correct properties', () => {
      const material = createDimensionalMaterial()
      const result = computeMaterialMetrics({ boxSize: newVec3(50, 100, 2000) }, material, true)

      expect(result.length).toBe(2000)
      expect(result.crossSection).toEqual({ smallerLength: 50, biggerLength: 100 })
      expect(result.volume).toBe(50 * 100 * 2000)
    })

    it('sets issue when hasPartInfo is true and issue exists', () => {
      const material = createDimensionalMaterial()
      const result = computeMaterialMetrics({ boxSize: newVec3(75, 75, 2000) }, material, true)

      expect(result.issue).toBe('CrossSectionMismatch')
    })

    it('does not set issue when hasPartInfo is false', () => {
      const material = createDimensionalMaterial()
      const result = computeMaterialMetrics({ boxSize: newVec3(75, 75, 2000) }, material, false)

      expect(result.issue).toBeUndefined()
    })
  })

  describe('sheet material', () => {
    it('calls computeSheetDetails and sets correct properties', () => {
      const material = createSheetMaterial()
      const result = computeMaterialMetrics({ boxSize: newVec3(18, 1200, 2400) }, material, true)

      expect(result.thickness).toBe(18)
      expect(result.area).toBe(1200 * 2400)
      expect(result.volume).toBe(18 * 1200 * 2400)
    })

    it('uses sideFace area when thickness matches', () => {
      const material = createSheetMaterial()
      const sideFaces: SideFace[] = [
        {
          index: 0,
          polygon: {
            outer: { points: [newVec2(0, 0), newVec2(1000, 0), newVec2(1000, 2000), newVec2(0, 2000)] },
            holes: []
          }
        }
      ]
      const result = computeMaterialMetrics({ boxSize: newVec3(18, 1200, 2400), sideFaces }, material, true)

      expect(result.thickness).toBe(18)
      expect(result.area).toBe(2000000)
    })

    it('uses areaSize when sideFace thickness does not match', () => {
      const material = createSheetMaterial()
      const sideFaces: SideFace[] = [
        {
          index: 1,
          polygon: {
            outer: { points: [newVec2(0, 0), newVec2(1000, 0), newVec2(1000, 2000), newVec2(0, 2000)] },
            holes: []
          }
        }
      ]
      const result = computeMaterialMetrics({ boxSize: newVec3(18, 1200, 2400), sideFaces }, material, true)

      expect(result.area).toBe(1200 * 2400)
    })
  })

  describe('volume material', () => {
    const createVolumeMaterial = (): Material => ({
      id: createMaterialId('vol1'),
      type: 'volume',
      name: 'Insulation',
      color: '#FFFF00',
      availableVolumes: []
    })

    it('calculates from sorted dimensions without partInfo', () => {
      const material = createVolumeMaterial()
      const result = computeMaterialMetrics({ boxSize: newVec3(300, 100, 200) }, material, false)

      expect(result.thickness).toBe(100)
      expect(result.area).toBe(200 * 300)
      expect(result.volume).toBe(100 * 200 * 300)
    })

    it('uses sideFace area when hasPartInfo is true', () => {
      const material = createVolumeMaterial()
      const sideFaces: SideFace[] = [
        {
          index: 1,
          polygon: {
            outer: { points: [newVec2(0, 0), newVec2(1000, 0), newVec2(1000, 2000), newVec2(0, 2000)] },
            holes: []
          }
        }
      ]
      const result = computeMaterialMetrics({ boxSize: newVec3(100, 300, 500), sideFaces }, material, true)

      expect(result.thickness).toBe(300)
      expect(result.area).toBe(2000000)
      expect(result.volume).toBe(300 * 2000000)
    })
  })

  describe('prefab material', () => {
    const createPrefabMaterial = () =>
      partial<PrefabMaterial>({
        id: createMaterialId('prefab1'),
        type: 'prefab',
        name: 'Prefab Module'
      })

    it('uses boxSize for area without sideFaces', () => {
      const material = createPrefabMaterial()
      const result = computeMaterialMetrics({ boxSize: newVec3(100, 200, 300) }, material, true)

      expect(result.area).toBe(100 * 300)
      expect(result.volume).toBe(100 * 300 * 200)
    })

    it('uses sideFace area when present', () => {
      const material = createPrefabMaterial()
      const sideFaces: SideFace[] = [
        {
          index: 0,
          polygon: {
            outer: { points: [newVec2(0, 0), newVec2(1000, 0), newVec2(1000, 2000), newVec2(0, 2000)] },
            holes: []
          }
        }
      ]
      const result = computeMaterialMetrics({ boxSize: newVec3(100, 200, 300), sideFaces }, material, true)

      expect(result.area).toBe(2000000)
      expect(result.volume).toBe(2000000 * 200)
    })
  })

  describe('generic/strawbale material', () => {
    const createGenericMaterial = (): Material => ({
      id: createMaterialId('gen1'),
      type: 'generic',
      name: 'Generic',
      color: '#808080'
    })

    const createStrawbaleMaterial = () =>
      partial<StrawbaleMaterial>({
        id: createMaterialId('straw1'),
        type: 'strawbale',
        name: 'Straw Bale'
      })

    it('computes volume for generic material', () => {
      const material = createGenericMaterial()
      const result = computeMaterialMetrics({ boxSize: newVec3(100, 200, 300) }, material, true)

      expect(result.volume).toBe(100 * 200 * 300)
      expect(result.area).toBeUndefined()
      expect(result.length).toBeUndefined()
    })

    it('computes volume for strawbale material', () => {
      const material = createStrawbaleMaterial()
      const result = computeMaterialMetrics({ boxSize: newVec3(360, 500, 850) }, material, true)

      expect(result.volume).toBe(360 * 500 * 850)
    })
  })

  describe('null material', () => {
    it('computes volume when material is null', () => {
      const result = computeMaterialMetrics({ boxSize: newVec3(100, 200, 300) }, null, true)

      expect(result.volume).toBe(100 * 200 * 300)
    })
  })

  describe('sideFaces', () => {
    it('includes sideFaces when hasPartInfo is true', () => {
      const material = createDimensionalMaterial()
      const sideFaces: SideFace[] = [{ index: 0, polygon: { outer: { points: [] }, holes: [] } }]
      const result = computeMaterialMetrics({ boxSize: newVec3(50, 100, 2000), sideFaces }, material, true)

      expect(result.sideFaces).toEqual(sideFaces)
    })

    it('does not include sideFaces when hasPartInfo is false', () => {
      const material = createDimensionalMaterial()
      const sideFaces: SideFace[] = [{ index: 0, polygon: { outer: { points: [] }, holes: [] } }]
      const result = computeMaterialMetrics({ boxSize: newVec3(50, 100, 2000), sideFaces }, material, false)

      expect(result.sideFaces).toBeUndefined()
    })
  })
})

describe('computePartIdWithInfo', () => {
  const createStrawbaleMaterial = (): Material =>
    partial<StrawbaleMaterial>({
      id: createMaterialId('straw1'),
      type: 'strawbale',
      name: 'Straw Bale'
    })

  const createGenericMaterial = (): Material => ({
    id: createMaterialId('gen1'),
    type: 'generic',
    name: 'Generic',
    color: '#808080'
  })

  it('returns strawbale ID format for strawbale materials', () => {
    const material = createStrawbaleMaterial()
    const fullPartInfo = { id: createPartId('other-id'), type: 'post', boxSize: newVec3(100, 100, 100) } as FullPartInfo
    const tags = [TAG_FULL_BALE]

    const result = computePartIdWithInfo(fullPartInfo, tags, material)

    expect(result).toBe('strawbale-straw1:full')
  })

  it('returns fullPartInfo.id for non-strawbale materials', () => {
    const material = createGenericMaterial()
    const fullPartInfo = {
      id: createPartId('post-100x100x1000'),
      type: 'post',
      boxSize: newVec3(100, 100, 1000)
    } as FullPartInfo
    const tags: Tag[] = []

    const result = computePartIdWithInfo(fullPartInfo, tags, material)

    expect(result).toBe('post-100x100x1000')
  })

  it('returns fullPartInfo.id when material is null', () => {
    const fullPartInfo = {
      id: createPartId('beam-50x100x2000'),
      type: 'beam',
      boxSize: newVec3(50, 100, 2000)
    } as FullPartInfo
    const tags: Tag[] = []

    const result = computePartIdWithInfo(fullPartInfo, tags, null)

    expect(result).toBe('beam-50x100x2000')
  })
})

describe('computePartIdWithoutInfo', () => {
  const createSheetMaterial = () =>
    partial<SheetMaterial>({
      id: createMaterialId('sheet1'),
      type: 'sheet',
      name: 'Plywood',
      thicknesses: []
    })

  const createDimensionalMaterial = () =>
    partial<DimensionalMaterial>({
      id: createMaterialId('dim1'),
      type: 'dimensional',
      name: 'Lumber',
      crossSections: []
    })

  const createVolumeMaterial = () =>
    partial<VolumeMaterial>({
      id: createMaterialId('vol1'),
      type: 'volume',
      name: 'Insulation'
    })

  const createGenericMaterial = (): Material => ({
    id: createMaterialId('gen1'),
    type: 'generic',
    name: 'Generic',
    color: '#808080'
  })

  it('returns auto_materialId_tagId when mapped tag found', () => {
    const material = createGenericMaterial()
    const tags = [TAG_INFILL]

    const result = computePartIdWithoutInfo(tags, { boxSize: newVec3(100, 100, 100) }, material)

    expect(result).toBe(`auto_gen1_${TAG_INFILL.id}`)
  })

  it('returns auto_materialId_misc when no mapped tag', () => {
    const material = createGenericMaterial()
    const tags = [OTHER_TAG]

    const result = computePartIdWithoutInfo(tags, { boxSize: newVec3(100, 100, 100) }, material)

    expect(result).toBe('auto_gen1_misc')
  })

  it('appends thickness for sheet materials', () => {
    const material = createSheetMaterial()
    const tags = [OTHER_TAG]

    const result = computePartIdWithoutInfo(tags, { boxSize: newVec3(18, 1200, 2400) }, material)

    expect(result).toBe('auto_sheet1_misc_18')
  })

  it('appends cross-section for dimensional materials', () => {
    const material = createDimensionalMaterial()
    const tags = [OTHER_TAG]

    const result = computePartIdWithoutInfo(tags, { boxSize: newVec3(50, 100, 2000) }, material)

    expect(result).toBe('auto_dim1_misc_50x100')
  })

  it('appends thickness for volume materials', () => {
    const material = createVolumeMaterial()
    const tags = [OTHER_TAG]

    const result = computePartIdWithoutInfo(tags, { boxSize: newVec3(100, 200, 300) }, material)

    expect(result).toBe('auto_vol1_misc_100')
  })

  it('handles null material', () => {
    const tags = [OTHER_TAG]

    const result = computePartIdWithoutInfo(tags, { boxSize: newVec3(100, 100, 100) }, null)

    expect(result).toBe('auto_undefined_misc')
  })
})

const mockT = keyFromSelector as TFunction

describe('computePartDescription', () => {
  it('returns straw category translation when strawCategory provided', () => {
    const result = computePartDescription(null, [], 'full')

    expect(result).toBeDefined()
    expect(typeof result).toBe('function')
    expect.assert(typeof result === 'function')
    expect(result(mockT, 'en')).toBe('strawCategories.full')
  })

  it('returns fullPartInfo.description when present', () => {
    const fullPartInfo = {
      id: createPartId('part1'),
      type: 'post',
      boxSize: newVec3(100, 100, 100),
      description: 'Custom Description'
    } as FullPartInfo

    const result = computePartDescription(fullPartInfo, [], undefined)

    expect(result).toBe('Custom Description')
  })

  it('returns findMappedTag description when available', () => {
    const customTag: Tag = createTag('wall-assembly', 'wall-assembly_custom-wall', 'Custom Wall')
    const tags = [TAG_INFILL, customTag]

    const result = computePartDescription(null, tags, undefined)

    expect(result).toBe('Custom Wall')
  })

  it('returns undefined when no description available', () => {
    const result = computePartDescription(null, [], undefined)

    expect(result).toBeUndefined()
  })

  it('prioritizes strawCategory over fullPartInfo.description', () => {
    const fullPartInfo = {
      id: createPartId('part1'),
      type: 'post',
      boxSize: newVec3(100, 100, 100),
      description: () => 'Custom Description'
    } as FullPartInfo

    const result = computePartDescription(fullPartInfo, [], 'full')

    expect(result).toBeDefined()
    expect(result).not.toBe(fullPartInfo.description)
  })

  it('prioritizes fullPartInfo.description over findMappedTag', () => {
    const customDescription = () => 'Part Info Description'
    const fullPartInfo = {
      id: createPartId('part1'),
      type: 'post',
      boxSize: newVec3(100, 100, 100),
      description: customDescription
    } as FullPartInfo
    const tags = [TAG_INFILL]

    const result = computePartDescription(fullPartInfo, tags, undefined)

    expect(result).toBe(customDescription)
  })
})

describe('findMappedTag', () => {
  it('returns null for empty tags array', () => {
    expect(findMappedTag([])).toBeNull()
  })

  it('returns null when no mapped tags present', () => {
    const tags = [OTHER_TAG]
    expect(findMappedTag(tags)).toBeNull()
  })

  it.each([
    { tag: TAG_INFILL, expectedType: 'wall-infill' },
    { tag: TAG_MODULE_INFILL, expectedType: 'module-infill' },
    { tag: TAG_FLOOR_INFILL, expectedType: 'floor-infill' },
    { tag: TAG_ROOF_INFILL, expectedType: 'roof-infill' },
    { tag: TAG_WALL_LAYER_INSIDE, expectedType: 'wall-layer-inside' },
    { tag: TAG_WALL_LAYER_OUTSIDE, expectedType: 'wall-layer-outside' },
    { tag: TAG_FLOOR_LAYER_TOP, expectedType: 'floor-layer' },
    { tag: TAG_FLOOR_LAYER_BOTTOM, expectedType: 'ceiling-layer' },
    { tag: TAG_ROOF_LAYER_TOP, expectedType: 'roof-layer-top' },
    { tag: TAG_ROOF_LAYER_INSIDE, expectedType: 'roof-layer-ceiling' },
    { tag: TAG_ROOF_LAYER_OVERHANG, expectedType: 'roof-layer-overhang' },
    { tag: TAG_MODULE, expectedType: 'module' }
  ])('returns correct type for $tag.id', ({ tag, expectedType }) => {
    const result = findMappedTag([tag])

    expect(result).not.toBeNull()
    expect(result!.type).toBe(expectedType)
  })

  it.each([
    { tag: TAG_INFILL, category: 'wall-assembly' },
    { tag: TAG_MODULE_INFILL, category: 'wall-assembly' },
    { tag: TAG_FLOOR_INFILL, category: 'floor-assembly' },
    { tag: TAG_ROOF_INFILL, category: 'roof-assembly' },
    { tag: TAG_WALL_LAYER_INSIDE, category: 'wall-layer' },
    { tag: TAG_WALL_LAYER_OUTSIDE, category: 'wall-layer' },
    { tag: TAG_FLOOR_LAYER_TOP, category: 'floor-layer' },
    { tag: TAG_FLOOR_LAYER_BOTTOM, category: 'floor-layer' },
    { tag: TAG_ROOF_LAYER_TOP, category: 'roof-layer' },
    { tag: TAG_ROOF_LAYER_INSIDE, category: 'roof-layer' },
    { tag: TAG_ROOF_LAYER_OVERHANG, category: 'roof-layer' },
    { tag: TAG_MODULE, category: 'module-type' }
  ] as const)('returns correct description for $tag.id', ({ tag, category }) => {
    const customTag = createTag(category, 'wall-assembly', 'Custom Description')
    const result = findMappedTag([tag, customTag])

    expect(result).not.toBeNull()
    expect(result!.description).toBe('Custom Description')
  })

  it('returns original tag when no custom tag in category', () => {
    const tags = [TAG_INFILL]

    const result = findMappedTag(tags)

    expect(result).not.toBeNull()
    expect(result!.tag.id).toBe(TAG_INFILL.id)
    expect(result!.description).toBeUndefined()
  })
})
