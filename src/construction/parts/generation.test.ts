import type { Manifold } from 'manifold-3d'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PerimeterId, PerimeterWallId, RoofId, StoreyId } from '@/building/model/ids'
import type {
  ConstructionElement,
  ConstructionElementId,
  ConstructionGroup,
  GroupOrElement
} from '@/construction/elements'
import type { Material, MaterialId } from '@/construction/materials/material'
import { getMaterialById } from '@/construction/materials/store'
import type { ConstructionModel } from '@/construction/model'
import type { Tag } from '@/construction/tags'
import { Bounds3D, IDENTITY, type Vec3, newVec3 } from '@/shared/geometry'
import { partial } from '@/test/helpers'

import { generatePartsData } from './generation'
import { getPartInfoFromManifold } from './geometry'
import type { MaterialMetrics } from './shared'
import {
  computeMaterialMetrics,
  computePartDescription,
  computePartIdWithInfo,
  computePartIdWithoutInfo,
  findMappedTag,
  getStrawCategoryFromTags
} from './shared'
import type { FullPartInfo, PartId, SideFace } from './types'

vi.mock('@/construction/materials/store', () => ({
  getMaterialById: vi.fn()
}))

vi.mock('./geometry', () => ({
  getPartInfoFromManifold: vi.fn()
}))

vi.mock('./shared', () => ({
  computeMaterialMetrics: vi.fn(),
  computePartDescription: vi.fn(),
  computePartIdWithInfo: vi.fn(),
  computePartIdWithoutInfo: vi.fn(),
  findMappedTag: vi.fn(),
  getStrawCategoryFromTags: vi.fn()
}))

const mockGetMaterialById = vi.mocked(getMaterialById)
const mockGetPartInfoFromManifold = vi.mocked(getPartInfoFromManifold)
const mockComputeMaterialMetrics = vi.mocked(computeMaterialMetrics)
const mockComputePartDescription = vi.mocked(computePartDescription)
const mockComputePartIdWithInfo = vi.mocked(computePartIdWithInfo)
const mockComputePartIdWithoutInfo = vi.mocked(computePartIdWithoutInfo)
const mockFindMappedTag = vi.mocked(findMappedTag)
const mockGetStrawCategoryFromTags = vi.mocked(getStrawCategoryFromTags)

const createElementId = (id: string): ConstructionElementId => id as ConstructionElementId
const createMaterialId = (id: string): MaterialId => id as MaterialId
const createPartId = (id: string): PartId => id as PartId
const createStoreyId = (id: string): StoreyId => `storey_${id}`
const createPerimeterId = (id: string): PerimeterId => `perimeter_${id}`
const createWallId = (id: string): PerimeterWallId => `outwall_${id}`
const createRoofId = (id: string): RoofId => `roof_${id}`
const createTag = (category: Tag['category'], id: string): Tag => ({
  id: `${category}_${id}`,
  category,
  label: () => id
})

const defaultMaterialMetrics = (): MaterialMetrics => ({
  volume: 1000000,
  area: 10000,
  length: undefined,
  thickness: undefined,
  crossSection: undefined,
  issue: undefined,
  sideFaces: undefined
})

const createBounds = (size: Vec3): Bounds3D => Bounds3D.fromMinMax(newVec3(0, 0, 0), size)

const createElement = (partial: Partial<ConstructionElement> = {}): ConstructionElement => ({
  id: createElementId('default'),
  material: createMaterialId('mat1'),
  transform: IDENTITY,
  bounds: createBounds(newVec3(100, 100, 100)),
  shape: { manifold: {} as unknown as Manifold, bounds: Bounds3D.EMPTY },
  ...partial
})

const createGroup = (partial: Partial<ConstructionGroup> = {}): ConstructionGroup => ({
  id: createElementId('group-default'),
  transform: IDENTITY,
  bounds: createBounds(newVec3(200, 200, 200)),
  children: [],
  ...partial
})

const createModel = (elements: GroupOrElement[]) => partial<ConstructionModel>({ elements })

const setupElementMocks = (
  overrides: {
    partId?: PartId
    materialType?: Material['type']
    materialMetrics?: Partial<MaterialMetrics>
    geometryInfo?: { boxSize: Vec3; sideFaces?: SideFace[]; id: string }
    hasPartInfo?: boolean
  } = {}
) => {
  const partId = overrides.partId ?? createPartId('part1')
  const materialType = overrides.materialType ?? 'generic'
  const metrics = { ...defaultMaterialMetrics(), ...overrides.materialMetrics }
  const geometryInfo = overrides.geometryInfo ?? { boxSize: newVec3(100, 100, 100), id: 'cuboid:100x100x100' }

  const material = {
    id: createMaterialId('mat1'),
    type: materialType,
    name: 'Test Material',
    color: '#ff0000'
  } as Material
  mockGetMaterialById.mockReturnValue(material)

  mockGetPartInfoFromManifold.mockReturnValue(geometryInfo)
  mockComputeMaterialMetrics.mockReturnValue(metrics)
  mockComputePartDescription.mockReturnValue(undefined)

  if (overrides.hasPartInfo) {
    mockComputePartIdWithInfo.mockReturnValue(partId)
  } else {
    mockComputePartIdWithoutInfo.mockReturnValue(partId)
    mockFindMappedTag.mockReturnValue(null)
  }

  return { partId, material, metrics, geometryInfo }
}

describe('generatePartsData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('empty/edge cases', () => {
    it('returns empty definitions and occurrences for model with no elements', () => {
      const model = createModel([])

      const result = generatePartsData(model)

      expect(result.definitions).toEqual({})
      expect(result.occurrences).toEqual([])
      expect(mockGetMaterialById).not.toHaveBeenCalled()
    })
  })

  describe('single element processing', () => {
    it('creates one definition and one occurrence for a single element', () => {
      const elementId = createElementId('e1')
      const { partId, metrics } = setupElementMocks()
      const element = createElement({ id: elementId })
      const model = createModel([element])

      const result = generatePartsData(model)

      expect(Object.keys(result.definitions)).toHaveLength(1)
      expect(result.occurrences).toHaveLength(1)
      expect(result.definitions[partId]).toBeDefined()
      expect(result.occurrences[0].elementId).toBe(elementId)
      expect(result.occurrences[0].partId).toBe(partId)
      expect(result.definitions[partId].volume).toBe(metrics.volume)
    })

    it('sets virtual=true for prefab materials', () => {
      setupElementMocks({ materialType: 'prefab' })
      const element = createElement()
      const model = createModel([element])

      const result = generatePartsData(model)

      expect(result.occurrences[0].virtual).toBe(true)
    })

    it('sets virtual=false for non-prefab materials', () => {
      setupElementMocks({ materialType: 'generic' })
      const element = createElement()
      const model = createModel([element])

      const result = generatePartsData(model)

      expect(result.occurrences[0].virtual).toBe(false)
    })

    it('sets virtual=false for strawbale materials', () => {
      setupElementMocks({ materialType: 'strawbale' })
      const element = createElement()
      const model = createModel([element])

      const result = generatePartsData(model)

      expect(result.occurrences[0].virtual).toBe(false)
    })

    it('sets occurrence location context from element sourceId (storeyId)', () => {
      const storeyId = createStoreyId('1')
      setupElementMocks()
      const element = createElement({ sourceId: storeyId })
      const model = createModel([element])

      const result = generatePartsData(model)

      expect(result.occurrences[0].storeyId).toBe(storeyId)
    })

    it('sets occurrence location context from element sourceId (perimeterId)', () => {
      const perimeterId = createPerimeterId('1')
      setupElementMocks()
      const element = createElement({ sourceId: perimeterId })
      const model = createModel([element])

      const result = generatePartsData(model)

      expect(result.occurrences[0].perimeterId).toBe(perimeterId)
    })

    it('sets occurrence location context from element sourceId (wallId)', () => {
      const wallId = createWallId('1')
      setupElementMocks()
      const element = createElement({ sourceId: wallId })
      const model = createModel([element])

      const result = generatePartsData(model)

      expect(result.occurrences[0].wallId).toBe(wallId)
    })

    it('sets occurrence location context from element sourceId (roofId)', () => {
      const roofId = createRoofId('1')
      setupElementMocks()
      const element = createElement({ sourceId: roofId })
      const model = createModel([element])

      const result = generatePartsData(model)

      expect(result.occurrences[0].roofId).toBe(roofId)
    })
  })

  describe('multiple elements', () => {
    it('creates single definition when multiple elements share same partId', () => {
      const sharedPartId = createPartId('shared-part')
      setupElementMocks({ partId: sharedPartId })
      const element1 = createElement({ id: createElementId('e1') })
      const element2 = createElement({ id: createElementId('e2') })
      const model = createModel([element1, element2])

      const result = generatePartsData(model)

      expect(Object.keys(result.definitions)).toHaveLength(1)
      expect(result.definitions[sharedPartId]).toBeDefined()
    })

    it('creates multiple occurrences for elements with same partId', () => {
      const sharedPartId = createPartId('shared-part')
      const elementId1 = createElementId('e1')
      const elementId2 = createElementId('e2')
      setupElementMocks({ partId: sharedPartId })
      const element1 = createElement({ id: elementId1 })
      const element2 = createElement({ id: elementId2 })
      const model = createModel([element1, element2])

      const result = generatePartsData(model)

      expect(result.occurrences).toHaveLength(2)
      expect(result.occurrences[0].partId).toBe(sharedPartId)
      expect(result.occurrences[1].partId).toBe(sharedPartId)
      expect(result.occurrences.map(o => o.elementId)).toEqual([elementId1, elementId2])
    })

    it('creates separate definitions for different partIds', () => {
      const partId1 = createPartId('part1')
      const partId2 = createPartId('part2')

      const element1 = createElement({ id: createElementId('e1') })
      const element2 = createElement({ id: createElementId('e2') })
      const model = createModel([element1, element2])

      mockGetMaterialById.mockReturnValue({
        id: createMaterialId('mat1'),
        type: 'generic',
        name: 'Test Material',
        color: '#ff0000'
      } as Material)

      mockGetPartInfoFromManifold.mockReturnValue({ boxSize: newVec3(100, 100, 100), id: 'cuboid:100x100x100' })
      mockComputeMaterialMetrics.mockReturnValue(defaultMaterialMetrics())
      mockComputePartDescription.mockReturnValue(undefined)
      mockFindMappedTag.mockReturnValue(null)

      let callCount = 0
      mockComputePartIdWithoutInfo.mockImplementation(() => {
        callCount++
        return callCount === 1 ? partId1 : partId2
      })

      const result = generatePartsData(model)

      expect(Object.keys(result.definitions)).toHaveLength(2)
      expect(result.definitions[partId1]).toBeDefined()
      expect(result.definitions[partId2]).toBeDefined()
    })

    it('reuses definition when partId already exists', () => {
      const sharedPartId = createPartId('shared-part')
      const metrics1 = { ...defaultMaterialMetrics(), volume: 500000 }

      const element1 = createElement({ id: createElementId('e1') })
      const element2 = createElement({ id: createElementId('e2') })
      const model = createModel([element1, element2])

      mockGetMaterialById.mockReturnValue({
        id: createMaterialId('mat1'),
        type: 'generic',
        name: 'Test Material',
        color: '#ff0000'
      } as Material)

      mockGetPartInfoFromManifold.mockReturnValue({ boxSize: newVec3(100, 100, 100), id: 'cuboid:100x100x100' })
      mockComputeMaterialMetrics.mockReturnValue(metrics1)
      mockComputePartDescription.mockReturnValue(undefined)
      mockFindMappedTag.mockReturnValue(null)
      mockComputePartIdWithoutInfo.mockReturnValue(sharedPartId)

      const result = generatePartsData(model)

      expect(mockComputeMaterialMetrics).toHaveBeenCalledTimes(1)
      expect(result.definitions[sharedPartId].volume).toBe(metrics1.volume)
    })
  })

  describe('nested groups', () => {
    it('recursively processes children of groups', () => {
      const { partId } = setupElementMocks()
      const childElement = createElement({ id: createElementId('child') })
      const group = createGroup({ children: [childElement] })
      const model = createModel([group])

      const result = generatePartsData(model)

      expect(result.occurrences).toHaveLength(1)
      expect(result.occurrences[0].partId).toBe(partId)
    })

    it('accumulates tags from parent groups to children', () => {
      const parentTag = createTag('construction', 'parent')
      const childTag = createTag('wall-part', 'child')
      const partId = createPartId('parent-child')
      setupElementMocks({ partId, hasPartInfo: true })
      mockComputePartIdWithInfo.mockReturnValue(partId)

      const childElement = createElement({
        id: createElementId('child'),
        tags: [childTag],
        partInfo: { id: partId, type: 'post', boxSize: newVec3(100, 100, 100) } as FullPartInfo
      })
      const group = createGroup({ tags: [parentTag], children: [childElement] })
      const model = createModel([group])

      generatePartsData(model)

      expect(mockComputePartIdWithInfo).toHaveBeenCalledWith(
        expect.anything(),
        expect.arrayContaining([parentTag, childTag]),
        expect.anything()
      )
    })

    it('updates location context through hierarchy', () => {
      const storeyId = createStoreyId('1')
      const perimeterId = createPerimeterId('1')
      setupElementMocks()

      const childElement = createElement({ id: createElementId('child'), sourceId: perimeterId })
      const group = createGroup({ sourceId: storeyId, children: [childElement] })
      const model = createModel([group])

      const result = generatePartsData(model)

      expect(result.occurrences[0].storeyId).toBe(storeyId)
      expect(result.occurrences[0].perimeterId).toBe(perimeterId)
    })
  })

  describe('groups with partInfo (virtual parts)', () => {
    it('creates virtual part definition for group with partInfo', () => {
      const groupPartId = createPartId('module-100x200x300')
      const groupId = createElementId('group1')
      const group = createGroup({
        id: groupId,
        partInfo: {
          id: groupPartId,
          type: 'module',
          boxSize: newVec3(100, 200, 300)
        } as FullPartInfo,
        bounds: createBounds(newVec3(100, 200, 300))
      })
      const model = createModel([group])

      const result = generatePartsData(model)

      expect(result.definitions[groupPartId]).toBeDefined()
      expect(result.definitions[groupPartId].source).toBe('group')
      expect(result.definitions[groupPartId].type).toBe('module')
    })

    it('sets virtual=true for group-based parts', () => {
      const groupPartId = createPartId('module-100x200x300')
      const group = createGroup({
        partInfo: {
          id: groupPartId,
          type: 'module',
          boxSize: newVec3(100, 200, 300)
        } as FullPartInfo,
        bounds: createBounds(newVec3(100, 200, 300))
      })
      const model = createModel([group])

      const result = generatePartsData(model)

      expect(result.occurrences[0].virtual).toBe(true)
    })

    it('uses module-type tag for description when available', () => {
      const groupPartId = createPartId('module-100x200x300')
      const customTag: Tag = {
        id: 'module-type_custom-module',
        category: 'module-type',
        label: 'Custom Module'
      }
      const group = createGroup({
        tags: [customTag],
        partInfo: {
          id: groupPartId,
          type: 'module',
          boxSize: newVec3(100, 200, 300)
        } as FullPartInfo,
        bounds: createBounds(newVec3(100, 200, 300))
      })
      const model = createModel([group])

      const result = generatePartsData(model)

      expect(result.definitions[groupPartId].description).toBe('Custom Module')
    })

    it('sets location context on group occurrences', () => {
      const groupPartId = createPartId('module-100x200x300')
      const storeyId = createStoreyId('1')
      const group = createGroup({
        sourceId: storeyId,
        partInfo: {
          id: groupPartId,
          type: 'module',
          boxSize: newVec3(100, 200, 300)
        } as FullPartInfo,
        bounds: createBounds(newVec3(100, 200, 300))
      })
      const model = createModel([group])

      const result = generatePartsData(model)

      expect(result.occurrences[0].storeyId).toBe(storeyId)
    })

    it('calculates volume and area for group parts', () => {
      const groupPartId = createPartId('module-100x200x300')
      const group = createGroup({
        partInfo: {
          id: groupPartId,
          type: 'module',
          boxSize: newVec3(100, 200, 300)
        } as FullPartInfo,
        bounds: createBounds(newVec3(100, 200, 300))
      })
      const model = createModel([group])

      const result = generatePartsData(model)

      expect(result.definitions[groupPartId].volume).toBe(100 * 200 * 300)
      expect(result.definitions[groupPartId].area).toBe(100 * 300)
    })
  })

  describe('elements with/without partInfo', () => {
    it('uses computePartIdWithInfo when element has partInfo', () => {
      const partId = createPartId('with-info-part')
      setupElementMocks({ partId, hasPartInfo: true })
      const element = createElement({
        partInfo: { type: 'post' }
      })
      const model = createModel([element])

      generatePartsData(model)

      expect(mockComputePartIdWithInfo).toHaveBeenCalled()
      expect(mockComputePartIdWithoutInfo).not.toHaveBeenCalled()
    })

    it('uses computePartIdWithoutInfo when element lacks partInfo', () => {
      const partId = createPartId('without-info-part')
      setupElementMocks({ partId, hasPartInfo: false })
      const element = createElement({ partInfo: undefined })
      const model = createModel([element])

      generatePartsData(model)

      expect(mockComputePartIdWithoutInfo).toHaveBeenCalled()
      expect(mockComputePartIdWithInfo).not.toHaveBeenCalled()
    })

    it('passes correct parameters to computePartIdWithInfo', () => {
      const tags: Tag[] = [createTag('construction', 'test')]
      const materialId = createMaterialId('mat1')
      const { material } = setupElementMocks({ hasPartInfo: true })
      const partInfo = { type: 'post' }
      const element = createElement({ tags, material: materialId, partInfo })
      const model = createModel([element])

      generatePartsData(model)

      expect(mockComputePartIdWithInfo).toHaveBeenCalledWith(partInfo, tags, material)
    })

    it('passes correct parameters to computePartIdWithoutInfo', () => {
      const partId = createPartId('no-info-part')
      const tags: Tag[] = [createTag('construction', 'test')]
      const geometryInfo = { boxSize: newVec3(50, 75, 100), id: 'cuboid:50x75x100' }
      setupElementMocks({ partId, hasPartInfo: false, geometryInfo })

      const element = createElement({ tags, partInfo: undefined })
      const model = createModel([element])

      generatePartsData(model)

      expect(mockComputePartIdWithoutInfo).toHaveBeenCalledWith(
        tags,
        expect.objectContaining({ boxSize: geometryInfo.boxSize }),
        expect.anything()
      )
    })
  })

  describe('strawbale materials', () => {
    it('computes straw category from tags', () => {
      const partId = createPartId('strawbale-straw1:full')
      setupElementMocks({ partId, materialType: 'strawbale', hasPartInfo: true })
      mockGetStrawCategoryFromTags.mockReturnValue('full')

      const element = createElement({
        material: createMaterialId('straw1'),
        partInfo: { type: 'wall-infill' }
      })
      const model = createModel([element])

      generatePartsData(model)

      expect(mockGetStrawCategoryFromTags).toHaveBeenCalled()
    })

    it('sets type as strawbale-{category} for strawbale materials', () => {
      const partId = createPartId('strawbale-straw1:partial')
      setupElementMocks({ partId, materialType: 'strawbale', hasPartInfo: true })
      mockGetStrawCategoryFromTags.mockReturnValue('partial')

      const element = createElement({
        material: createMaterialId('straw1'),
        partInfo: { type: 'wall-infill' }
      })
      const model = createModel([element])

      const result = generatePartsData(model)

      expect(result.definitions[partId].type).toBe('strawbale-partial')
      expect(result.definitions[partId].strawCategory).toBe('partial')
    })

    it('falls back to mapped tag type when not strawbale', () => {
      const partId = createPartId('infill-part')
      setupElementMocks({ partId, materialType: 'generic', hasPartInfo: false })
      mockFindMappedTag.mockReturnValue({ tag: { id: 'wall-part_infill', category: 'wall-part' }, type: 'wall-infill' })

      const element = createElement({ partInfo: undefined })
      const model = createModel([element])

      const result = generatePartsData(model)

      expect(result.definitions[partId].type).toBe('wall-infill')
    })
  })

  describe('definition properties', () => {
    it('includes materialId and materialType in definition', () => {
      const materialId = createMaterialId('mat1')
      const { partId } = setupElementMocks({ materialType: 'dimensional' })
      const element = createElement({ material: materialId })
      const model = createModel([element])

      const result = generatePartsData(model)

      expect(result.definitions[partId].materialId).toBe(materialId)
      expect(result.definitions[partId].materialType).toBe('dimensional')
    })

    it('sets source to element for regular elements', () => {
      const { partId } = setupElementMocks()
      const element = createElement()
      const model = createModel([element])

      const result = generatePartsData(model)

      expect(result.definitions[partId].source).toBe('element')
    })

    it('includes requiresSinglePiece when present in partInfo', () => {
      const partId = createPartId('single-piece-part')
      setupElementMocks({ partId, hasPartInfo: true })
      const geometryInfo = { boxSize: newVec3(100, 100, 100), id: 'cuboid:100x100x100' }
      mockGetPartInfoFromManifold.mockReturnValue(geometryInfo)

      const element = createElement({
        partInfo: {
          id: partId,
          type: 'post',
          boxSize: newVec3(100, 100, 100),
          requiresSinglePiece: true
        } as FullPartInfo
      })
      const model = createModel([element])

      const result = generatePartsData(model)

      expect(result.definitions[partId].requiresSinglePiece).toBe(true)
    })

    it('uses element bounds size when no sideFaces', () => {
      const { partId } = setupElementMocks()
      const element = createElement({
        bounds: createBounds(newVec3(150, 200, 300))
      })
      const model = createModel([element])

      const result = generatePartsData(model)

      expect(result.definitions[partId].size).toEqual(newVec3(150, 200, 300))
    })

    it('includes description from computePartDescription', () => {
      const { partId } = setupElementMocks({ hasPartInfo: true })
      const mockDescription = () => 'Test Description'
      mockComputePartDescription.mockReturnValue(mockDescription)

      const element = createElement({
        partInfo: { id: partId, type: 'post', boxSize: newVec3(100, 100, 100) } as FullPartInfo
      })
      const model = createModel([element])

      const result = generatePartsData(model)

      expect(mockComputePartDescription).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'post', id: partId }),
        expect.any(Array),
        undefined
      )
      expect(result.definitions[partId].description).toBe(mockDescription)
    })

    it('passes strawCategory to computePartDescription for strawbale materials', () => {
      const partId = createPartId('strawbale-mat1:full')
      setupElementMocks({ partId, materialType: 'strawbale', hasPartInfo: true })
      mockGetStrawCategoryFromTags.mockReturnValue('full')
      mockComputePartDescription.mockReturnValue(() => 'Full Bale')

      const element = createElement({
        material: createMaterialId('mat1'),
        partInfo: { id: partId, type: 'wall-infill', boxSize: newVec3(100, 100, 100) } as FullPartInfo
      })
      const model = createModel([element])

      const result = generatePartsData(model)

      expect(mockComputePartDescription).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'wall-infill' }),
        expect.any(Array),
        'full'
      )
      expect(result.definitions[partId].description).toBeDefined()
    })
  })

  describe('complex scenarios', () => {
    it('handles mix of elements and groups with partInfo', () => {
      const elementPartId = createPartId('element-part')
      const childPartId = createPartId('child-part')
      const groupPartId = createPartId('group-part')

      const element1 = createElement({ id: createElementId('e1') })
      const childElement = createElement({ id: createElementId('child') })
      const group = createGroup({
        id: createElementId('g1'),
        partInfo: {
          id: groupPartId,
          type: 'module',
          boxSize: newVec3(200, 200, 200)
        } as FullPartInfo,
        bounds: createBounds(newVec3(200, 200, 200)),
        children: [childElement]
      })

      const model = createModel([element1, group])

      mockGetMaterialById.mockReturnValue({
        id: createMaterialId('mat1'),
        type: 'generic',
        name: 'Test Material',
        color: '#ff0000'
      } as Material)

      mockGetPartInfoFromManifold.mockReturnValue({ boxSize: newVec3(100, 100, 100), id: 'cuboid:100x100x100' })
      mockComputeMaterialMetrics.mockReturnValue(defaultMaterialMetrics())
      mockComputePartDescription.mockReturnValue(undefined)
      mockFindMappedTag.mockReturnValue(null)

      let callCount = 0
      mockComputePartIdWithoutInfo.mockImplementation(() => {
        callCount++
        return callCount === 1 ? elementPartId : childPartId
      })

      const result = generatePartsData(model)

      expect(result.occurrences).toHaveLength(3)
      expect(result.definitions[elementPartId]).toBeDefined()
      expect(result.definitions[groupPartId]).toBeDefined()
    })

    it('handles deeply nested groups', () => {
      const { partId } = setupElementMocks()
      const deepElement = createElement({ id: createElementId('deep') })
      const innerGroup = createGroup({ children: [deepElement] })
      const outerGroup = createGroup({ children: [innerGroup] })
      const model = createModel([outerGroup])

      const result = generatePartsData(model)

      expect(result.occurrences).toHaveLength(1)
      expect(result.occurrences[0].partId).toBe(partId)
    })
  })
})
