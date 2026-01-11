import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createConstructionElement } from '@/construction/elements'
import { DEFAULT_MATERIALS, clt, osb, roughWood, strawbale } from '@/construction/materials/material'
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
  calculatePolygonWithHolesArea,
  canonicalPolygonKey,
  copyVec3,
  minimumAreaBoundingBox,
  newVec2,
  newVec3
} from '@/shared/geometry'

import { generateMaterialPartsList, generateVirtualPartsList } from './list'
import type { FullPartInfo, InitialPartInfo, PartId } from './types'

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

describe('generateMaterialPartsList', () => {
  beforeEach(() => {
    setMaterialsState({ materials: { ...DEFAULT_MATERIALS, [genericMaterial.id]: genericMaterial } })
  })

  it('aggregates identical dimensional parts', () => {
    const elementA = createElement(roughWood.id, { type: 'post' }, newVec3(5000, 360, 60))
    const elementB = createElement(roughWood.id, { type: 'post' }, newVec3(5000, 360, 60))
    const model = createModel([elementA, elementB])

    const partsList = generateMaterialPartsList(model)

    const partInfo = elementA.partInfo as FullPartInfo
    const materialParts = partsList[roughWood.id]
    const part = materialParts.parts[partInfo.id]

    expect(materialParts.totalQuantity).toBe(2)
    expect(materialParts.totalVolume).toBe(2 * 5000 * 360 * 60)
    expect(materialParts.totalLength).toBe(5000 + 5000)

    expect(part.quantity).toBe(2)
    expect(part.totalVolume).toBe(2 * 5000 * 360 * 60)
    expect(part.length).toBe(5000)
    expect(part.totalLength).toBe(5000 + 5000)
    expect(part.label).toBe('A')
    expect(part.issue).toBeUndefined()
    expect(part.elements).toEqual([elementA.id, elementB.id])
  })

  it('stores cross section metadata for dimensional parts', () => {
    const element = createElement(roughWood.id, { type: 'stud' }, newVec3(4000, 120, 60))
    const model = createModel([element])

    const list = generateMaterialPartsList(model)

    const partInfo = element.partInfo as FullPartInfo
    const part = list[roughWood.id].parts[partInfo.id]
    expect(part.crossSection).toEqual({ smallerLength: 60, biggerLength: 120 })
  })

  it('assigns sequential labels per material when parts differ', () => {
    const elementA = createElement(roughWood.id, { type: 'post' }, newVec3(5000, 360, 60))
    const elementB = createElement(roughWood.id, { type: 'post' }, newVec3(3000, 360, 60))

    const model = createModel([elementA, elementB])
    generateMaterialPartsList(model)

    const partInfoA = elementA.partInfo as FullPartInfo
    const partInfoB = elementB.partInfo as FullPartInfo
    const { parts, totalQuantity } = generateMaterialPartsList(model)[roughWood.id]

    expect(totalQuantity).toBe(2)
    expect(parts[partInfoA.id].label).toBe('A')
    expect(parts[partInfoB.id].label).toBe('B')
    expect(parts[partInfoA.id].elements).toEqual([elementA.id])
    expect(parts[partInfoB.id].elements).toEqual([elementB.id])
  })

  it('stores thickness metadata for sheet parts', () => {
    const element = createElement(clt.id, { type: 'sheet' }, newVec3(160, 16500, 3500))

    const model = createModel([element])
    generateMaterialPartsList(model) // Populates partInfo
    const partInfo = element.partInfo as FullPartInfo
    const list = generateMaterialPartsList(model)
    const part = list[clt.id].parts[partInfo.id]
    expect(part.thickness).toBe(160)
  })

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
    const strawParts = generateMaterialPartsList(model)[strawbale.id].parts

    const fullBucket = strawParts['strawbale:full' as PartId]
    const partialBucket = strawParts['strawbale:partial' as PartId]

    expect(fullBucket).toBeDefined()
    expect(fullBucket.type).toBe('strawbale-full')
    expect(fullBucket.description).toBe('Full bales')
    expect(fullBucket.quantity).toBe(1)
    expect(fullBucket.strawCategory).toBe('full')

    expect(partialBucket).toBeDefined()
    expect(partialBucket.type).toBe('strawbale-partial')
    expect(partialBucket.description).toBe('Partial bales')
    expect(partialBucket.quantity).toBe(1)
    expect(partialBucket.strawCategory).toBe('partial')
  })

  it('omits length metrics for non-dimensional materials', () => {
    const element = createElement(genericMaterial.id, { type: 'window' }, newVec3(1200, 1200, 120))
    const model = createModel([element])
    const materialParts = generateMaterialPartsList(model)[genericMaterial.id]
    const partInfo = element.partInfo as FullPartInfo
    const part = materialParts.parts[partInfo.id]

    expect(materialParts.totalLength).toBeUndefined()
    expect(part.length).toBeUndefined()
    expect(part.totalLength).toBeUndefined()
    expect(part.elements).toEqual([element.id])
  })

  it('records an issue when the cross section does not match the material', () => {
    const element = createElement(roughWood.id, { type: 'post' }, newVec3(5000, 200, 60))
    const model = createModel([element])

    generateMaterialPartsList(model)
    const partInfo = element.partInfo as FullPartInfo
    const part = generateMaterialPartsList(model)[roughWood.id].parts[partInfo.id]
    expect(part.issue).toBe('CrossSectionMismatch')
    expect(part.length).toBe(5000)
  })

  it('records an issue when the part length exceeds available standard lengths', () => {
    const element = createElement(roughWood.id, { type: 'post' }, newVec3(6000, 360, 60))
    const model = createModel([element])

    generateMaterialPartsList(model)
    const partInfo = element.partInfo as FullPartInfo
    const part = generateMaterialPartsList(model)[roughWood.id].parts[partInfo.id]
    expect(part.issue).toBe('LengthExceedsAvailable')
    expect(part.length).toBe(6000)
  })

  it('handles parts nested inside groups', () => {
    const element = createElement(roughWood.id, { type: 'post' }, newVec3(5000, 360, 60))
    const group = createConstructionGroup([element], IDENTITY)

    const model = createModel([group])
    const materialParts = generateMaterialPartsList(model)[roughWood.id]
    const partInfo = element.partInfo as FullPartInfo
    const part = materialParts.parts[partInfo.id]

    expect(materialParts.totalQuantity).toBe(1)
    expect(materialParts.totalVolume).toBe(5000 * 360 * 60)
    expect(materialParts.totalLength).toBe(5000)
    expect(part.elements).toEqual([element.id])
  })

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
    const extrudedElement = createConstructionElement(
      osb.id,
      createExtrudedPolygon(polygon, 'xy', 50),
      undefined,
      undefined,
      { type: 'subfloor' }
    )
    const expectedArea = calculatePolygonWithHolesArea(polygon)
    const model = createModel([extrudedElement])

    const materialParts = generateMaterialPartsList(model)[osb.id]

    const partInfo = extrudedElement.partInfo as FullPartInfo
    const part = materialParts.parts[partInfo.id]
    expect(materialParts.totalQuantity).toBe(1)
    expect(materialParts.totalVolume).toBe(expectedArea * 50)
    expect(materialParts.totalArea).toBe(expectedArea)
    expect(part.elements).toEqual([extrudedElement.id])
    expect(part.size).toEqual(newVec3(50, 800, 1000))
    expect(part.sideFaces).toBeDefined()
    expect.assert(part.sideFaces !== undefined)
    expect(part.sideFaces[0].index).toEqual(0)
    // Difficult to properly check the face here
    expect(part.sideFaces[0].polygon.outer.points).toHaveLength(4)
  })

  it('creates entries for elements without part info', () => {
    const nonPartElement = createConstructionElement(roughWood.id, createCuboid(newVec3(5000, 360, 60)))

    const model = createModel([nonPartElement])
    const partsList = generateMaterialPartsList(model)

    expect(Object.values(partsList)).toHaveLength(1)
  })
})

describe('generateVirtualPartsList', () => {
  it('returns empty when groups lack part info', () => {
    const groupWithoutPart = createConstructionGroup([], IDENTITY)
    const model = createModel([groupWithoutPart])

    expect(generateVirtualPartsList(model)).toEqual({})
  })

  it('aggregates identical virtual parts from multiple groups', () => {
    const partInfo: InitialPartInfo = { type: 'module' }
    const groupA = createGroupWithPartInfo(partInfo)
    const groupB = createGroupWithPartInfo(partInfo)

    const model = createModel([groupA, groupB])
    const virtualParts = generateVirtualPartsList(model)
    const fullPartInfoA = groupA.partInfo as FullPartInfo
    const part = virtualParts[fullPartInfoA.id]

    expect(Object.keys(virtualParts)).toHaveLength(1)
    expect(part.quantity).toBe(2)
    expect(part.label).toBe('A')
    expect(part.elements).toEqual([groupA.id, groupB.id])
  })

  it('assigns sequential labels to distinct virtual parts', () => {
    const partInfoA: InitialPartInfo = { type: 'module', subtype: 'A', description: 'Module A' }
    const partInfoB: InitialPartInfo = { type: 'module', subtype: 'B', description: 'Module B' }
    const groupA = createGroupWithPartInfo(partInfoA)
    const groupB = createGroupWithPartInfo(partInfoB)

    const virtualParts = generateVirtualPartsList(createModel([groupA, groupB]))
    const fullPartInfoA = groupA.partInfo as FullPartInfo
    const fullPartInfoB = groupB.partInfo as FullPartInfo

    expect(virtualParts[fullPartInfoA.id].label).toBe('A')
    expect(virtualParts[fullPartInfoB.id].label).toBe('B')
  })

  it('includes parts from nested groups', () => {
    const innerPartInfo: InitialPartInfo = { type: 'inner module' }
    const innerGroup = createGroupWithPartInfo(innerPartInfo)
    const outerPartInfo: InitialPartInfo = { type: 'outer module' }
    const outerGroup = createGroupWithPartInfo(outerPartInfo, [innerGroup])

    const virtualParts = generateVirtualPartsList(createModel([outerGroup]))
    const innerFullPartInfo = innerGroup.partInfo as FullPartInfo
    const outerFullPartInfo = outerGroup.partInfo as FullPartInfo

    expect(virtualParts[innerFullPartInfo.id]).toBeDefined()
    expect(virtualParts[outerFullPartInfo.id]).toBeDefined()
    expect(virtualParts[innerFullPartInfo.id].elements).toEqual([innerGroup.id])
    expect(virtualParts[outerFullPartInfo.id].elements).toEqual([outerGroup.id])
  })
})
