import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createConstructionElement } from '@/construction/elements'
import { DEFAULT_MATERIALS, clt, ecococonStandard, osb, roughWood, strawbale } from '@/construction/materials/material'
import type { GenericMaterial, MaterialId } from '@/construction/materials/material'
import { setMaterialsState } from '@/construction/materials/store'
import { type ConstructionModel, createConstructionGroup } from '@/construction/model'
import { createCuboid, createExtrudedPolygon } from '@/construction/shapes'
import { TAG_FULL_BALE, TAG_PARTIAL_BALE } from '@/construction/tags'
import {
  Bounds2D,
  Bounds3D,
  IDENTITY,
  type PolygonWithHoles2D,
  type Vec3,
  ZERO_VEC2,
  canonicalPolygonKey,
  copyVec3,
  minimumAreaBoundingBox,
  newVec2,
  newVec3
} from '@/shared/geometry'

import { generatePartsData } from './generation'
import type { InitialPartInfo } from './types'

vi.mock('@/shared/geometry', async importActual => ({
  ...(await importActual()),
  canonicalPolygonKey: vi.fn(),
  minimumAreaBoundingBox: vi.fn()
}))

const canonicalPolygonKeyMock = vi.mocked(canonicalPolygonKey)
const minimumAreaBoundingBoxMock = vi.mocked(minimumAreaBoundingBox)

const createModel = (elements: ConstructionModel['elements']): ConstructionModel => {
  return {
    elements,
    measurements: [],
    areas: [],
    errors: [],
    warnings: [],
    bounds: Bounds3D.EMPTY
  }
}

const createElement = (materialId: MaterialId, partInfo: InitialPartInfo, size: Vec3) =>
  createConstructionElement(materialId, createCuboid(size), undefined, undefined, partInfo)

const createGroupWithPartInfo = (
  partInfo: InitialPartInfo,
  children: Parameters<typeof createConstructionGroup>[0] = []
) => {
  return createConstructionGroup(children, IDENTITY, undefined, partInfo)
}

beforeEach(() => {
  canonicalPolygonKeyMock.mockClear()
  minimumAreaBoundingBoxMock.mockClear()
})

const genericMaterial: GenericMaterial = {
  type: 'generic',
  id: 'generic_material' as MaterialId,
  name: 'Generic',
  color: 'red'
}

describe('generatePartsData', () => {
  beforeEach(() => {
    setMaterialsState({ materials: { ...DEFAULT_MATERIALS, [genericMaterial.id]: genericMaterial } })
  })

  describe('basic functionality', () => {
    it('creates definition and occurrence for a single element', () => {
      const element = createElement(roughWood.id, { type: 'post' }, newVec3(5000, 360, 60))
      const model = createModel([element])

      const result = generatePartsData(model)

      expect(Object.keys(result.definitions)).toHaveLength(1)
      expect(result.occurrences).toHaveLength(1)

      const occurrence = result.occurrences[0]
      expect(occurrence.elementId).toBe(element.id)
      expect(occurrence.virtual).toBe(false)

      const definition = result.definitions[occurrence.partId]
      expect(definition).toBeDefined()
      expect(definition.materialId).toBe(roughWood.id)
      expect(definition.materialType).toBe('dimensional')
      expect(definition.source).toBe('element')
      expect(definition.type).toBe('post')
    })

    it('aggregates identical parts into single definition with multiple occurrences', () => {
      const elementA = createElement(roughWood.id, { type: 'post' }, newVec3(5000, 360, 60))
      const elementB = createElement(roughWood.id, { type: 'post' }, newVec3(5000, 360, 60))
      const model = createModel([elementA, elementB])

      const result = generatePartsData(model)

      expect(Object.keys(result.definitions)).toHaveLength(1)
      expect(result.occurrences).toHaveLength(2)
      expect(result.occurrences[0].partId).toBe(result.occurrences[1].partId)
    })

    it('creates separate definitions for different parts', () => {
      const elementA = createElement(roughWood.id, { type: 'post' }, newVec3(5000, 360, 60))
      const elementB = createElement(roughWood.id, { type: 'post' }, newVec3(3000, 360, 60))
      const model = createModel([elementA, elementB])

      const result = generatePartsData(model)

      expect(Object.keys(result.definitions)).toHaveLength(2)
      expect(result.occurrences).toHaveLength(2)
      expect(result.occurrences[0].partId).not.toBe(result.occurrences[1].partId)
    })
  })

  describe('material types', () => {
    it('stores cross-section metadata for dimensional parts', () => {
      const element = createElement(roughWood.id, { type: 'stud' }, newVec3(4000, 120, 60))
      const model = createModel([element])

      const result = generatePartsData(model)
      const definition = result.definitions[result.occurrences[0].partId]

      expect(definition.crossSection).toEqual({ smallerLength: 60, biggerLength: 120 })
    })

    it('stores thickness metadata for sheet parts', () => {
      const element = createElement(clt.id, { type: 'sheet' }, newVec3(160, 16500, 3500))
      const model = createModel([element])

      const result = generatePartsData(model)
      const definition = result.definitions[result.occurrences[0].partId]

      expect(definition.thickness).toBe(160)
    })

    it('omits length metrics for non-dimensional materials', () => {
      const element = createElement(genericMaterial.id, { type: 'window' }, newVec3(1200, 1200, 120))
      const model = createModel([element])

      const result = generatePartsData(model)
      const definition = result.definitions[result.occurrences[0].partId]

      expect(definition.length).toBeUndefined()
    })
  })

  describe('straw bale handling', () => {
    it('groups straw bales by their category tags', () => {
      const fullSize = newVec3(strawbale.baleMaxLength, strawbale.baleWidth, strawbale.baleHeight)
      const partialSize = newVec3(strawbale.baleMaxLength / 2, strawbale.baleWidth, strawbale.baleHeight)

      const fullElement = createConstructionElement(
        strawbale.id,
        createCuboid(copyVec3(fullSize)),
        undefined,
        [TAG_FULL_BALE],
        { type: 'straw' }
      )

      const partialElement = createConstructionElement(
        strawbale.id,
        createCuboid(copyVec3(partialSize)),
        undefined,
        [TAG_PARTIAL_BALE],
        { type: 'straw' }
      )

      const model = createModel([fullElement, partialElement])
      const result = generatePartsData(model)

      expect(Object.keys(result.definitions)).toHaveLength(2)

      const fullDef = result.definitions[result.occurrences.find(o => o.elementId === fullElement.id)!.partId]
      const partialDef = result.definitions[result.occurrences.find(o => o.elementId === partialElement.id)!.partId]

      expect(fullDef.strawCategory).toBe('full')
      expect(fullDef.type).toBe('strawbale-full')
      expect(partialDef.strawCategory).toBe('partial')
      expect(partialDef.type).toBe('strawbale-partial')
    })
  })

  describe('issues', () => {
    it('records an issue when cross section does not match the material', () => {
      const element = createElement(roughWood.id, { type: 'post' }, newVec3(5000, 200, 60))
      const model = createModel([element])

      const result = generatePartsData(model)
      const definition = result.definitions[result.occurrences[0].partId]

      expect(definition.issue).toBe('CrossSectionMismatch')
    })

    it('records an issue when part length exceeds available standard lengths', () => {
      const element = createElement(roughWood.id, { type: 'post' }, newVec3(6000, 360, 60))
      const model = createModel([element])

      const result = generatePartsData(model)
      const definition = result.definitions[result.occurrences[0].partId]

      expect(definition.issue).toBe('LengthExceedsAvailable')
    })
  })

  describe('groups and nesting', () => {
    it('handles parts nested inside groups', () => {
      const element = createElement(roughWood.id, { type: 'post' }, newVec3(5000, 360, 60))
      const group = createConstructionGroup([element], IDENTITY)
      const model = createModel([group])

      const result = generatePartsData(model)

      expect(Object.keys(result.definitions)).toHaveLength(1)
      expect(result.occurrences).toHaveLength(1)
    })

    it('creates virtual parts from groups with partInfo', () => {
      const partInfo: InitialPartInfo = { type: 'module' }
      const group = createGroupWithPartInfo(partInfo)
      const model = createModel([group])

      const result = generatePartsData(model)

      expect(Object.keys(result.definitions)).toHaveLength(1)
      expect(result.occurrences).toHaveLength(1)

      const definition = result.definitions[result.occurrences[0].partId]
      expect(definition.source).toBe('group')
      expect(result.occurrences[0].virtual).toBe(true)
    })

    it('includes parts from nested groups', () => {
      const innerPartInfo: InitialPartInfo = { type: 'inner module' }
      const innerGroup = createGroupWithPartInfo(innerPartInfo)
      const outerPartInfo: InitialPartInfo = { type: 'outer module' }
      const outerGroup = createGroupWithPartInfo(outerPartInfo, [innerGroup])

      const result = generatePartsData(createModel([outerGroup]))

      expect(Object.keys(result.definitions)).toHaveLength(2)
      expect(result.occurrences).toHaveLength(2)
    })
  })

  describe('virtual/prefab handling', () => {
    beforeEach(() => {
      setMaterialsState({ materials: DEFAULT_MATERIALS })
    })

    it('marks prefab elements as virtual', () => {
      const element = createElement(ecococonStandard.id, { type: 'module' }, newVec3(800, 360, 1000))
      const model = createModel([element])

      const result = generatePartsData(model)

      expect(result.occurrences).toHaveLength(1)
      expect(result.occurrences[0].virtual).toBe(true)
    })

    it('marks non-prefab elements as not virtual', () => {
      const element = createElement(roughWood.id, { type: 'post' }, newVec3(5000, 360, 60))
      const model = createModel([element])

      const result = generatePartsData(model)

      expect(result.occurrences[0].virtual).toBe(false)
    })
  })

  describe('elements without partInfo', () => {
    it('creates entries for elements without part info', () => {
      const element = createConstructionElement(roughWood.id, createCuboid(newVec3(5000, 360, 60)))
      const model = createModel([element])

      const result = generatePartsData(model)

      expect(Object.keys(result.definitions)).toHaveLength(1)
      expect(result.occurrences).toHaveLength(1)
    })
  })

  describe('polygon metadata', () => {
    it('preserves polygon metadata on parts', () => {
      canonicalPolygonKeyMock.mockReturnValue('polygon-key')
      minimumAreaBoundingBoxMock.mockImplementation(polygon => ({
        size: Bounds2D.fromPoints(polygon.points).max,
        angle: 0,
        smallestDirection: ZERO_VEC2
      }))

      const polygon: PolygonWithHoles2D = {
        outer: {
          points: [newVec2(800, 1000), newVec2(200, 1000), newVec2(0, 0), newVec2(800, 0)]
        },
        holes: []
      }
      const element = createConstructionElement(
        osb.id,
        createExtrudedPolygon(polygon, 'xy', 50),
        undefined,
        undefined,
        { type: 'subfloor' }
      )
      const model = createModel([element])

      const result = generatePartsData(model)
      const definition = result.definitions[result.occurrences[0].partId]

      expect(definition.sideFaces).toBeDefined()
      expect(definition.sideFaces![0].index).toBe(0)
      expect(definition.sideFaces![0].polygon.outer.points).toHaveLength(4)
    })
  })
})
