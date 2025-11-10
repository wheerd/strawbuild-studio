import { vec2, vec3 } from 'gl-matrix'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createConstructionElement } from '@/construction/elements'
import { IDENTITY } from '@/construction/geometry'
import { DEFAULT_MATERIALS, window as windowMaterial, wood } from '@/construction/materials/material'
import type { MaterialId } from '@/construction/materials/material'
import { setMaterialsState } from '@/construction/materials/store'
import { type ConstructionModel, createConstructionGroup } from '@/construction/model'
import {
  type PartId,
  type PartInfo,
  dimensionalPartInfo,
  generateMaterialPartsList,
  generateVirtualPartsList,
  polygonPartInfo
} from '@/construction/parts'
import { createCuboidShape } from '@/construction/shapes'
import { Bounds2D, Bounds3D, canonicalPolygonKey, minimumAreaBoundingBox } from '@/shared/geometry'

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

const woodMaterialId = wood.id

const createElement = (materialId: MaterialId, partInfo: PartInfo) =>
  createConstructionElement(
    materialId,
    createCuboidShape(vec3.create(), vec3.clone(partInfo.size)),
    undefined,
    undefined,
    partInfo
  )

const createGroupWithPartInfo = (partInfo: PartInfo, children: Parameters<typeof createConstructionGroup>[0] = []) => {
  const group = createConstructionGroup(children, IDENTITY)
  group.partInfo = partInfo
  return group
}

beforeEach(() => {
  canonicalPolygonKeyMock.mockClear()
  minimumAreaBoundingBoxMock.mockClear()
})

describe('generateMaterialPartsList', () => {
  beforeEach(() => {
    setMaterialsState({ materials: { ...DEFAULT_MATERIALS } })
  })

  it('aggregates identical dimensional parts', () => {
    const partInfo = dimensionalPartInfo('post', vec3.fromValues(5000, 360, 60))
    const elementA = createElement(woodMaterialId, partInfo)
    const elementB = createElement(woodMaterialId, dimensionalPartInfo('post', vec3.fromValues(5000, 360, 60)))

    const model = createModel([elementA, elementB])
    const partsList = generateMaterialPartsList(model)
    const materialParts = partsList[woodMaterialId]
    const part = materialParts.parts[partInfo.partId]

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

  it('assigns sequential labels per material when parts differ', () => {
    const partA = dimensionalPartInfo('post', vec3.fromValues(5000, 360, 60))
    const partB = dimensionalPartInfo('post', vec3.fromValues(3000, 360, 60))

    const elementA = createElement(woodMaterialId, partA)
    const elementB = createElement(woodMaterialId, partB)

    const model = createModel([elementA, elementB])
    const { parts, totalQuantity } = generateMaterialPartsList(model)[woodMaterialId]
    expect(totalQuantity).toBe(2)
    expect(parts[partA.partId].label).toBe('A')
    expect(parts[partB.partId].label).toBe('B')
    expect(parts[partA.partId].elements).toEqual([elementA.id])
    expect(parts[partB.partId].elements).toEqual([elementB.id])
  })

  it('omits length metrics for non-dimensional materials', () => {
    const partInfo: PartInfo = {
      partId: 'window-part' as PartId,
      type: 'window',
      size: vec3.fromValues(1200, 1200, 120)
    }

    const element = createElement(windowMaterial.id, partInfo)
    const model = createModel([element])
    const materialParts = generateMaterialPartsList(model)[windowMaterial.id]
    const part = materialParts.parts[partInfo.partId]

    expect(materialParts.totalLength).toBeUndefined()
    expect(part.length).toBeUndefined()
    expect(part.totalLength).toBeUndefined()
    expect(part.elements).toEqual([element.id])
  })

  it('records an issue when the cross section does not match the material', () => {
    const mismatchedPart = dimensionalPartInfo('post', vec3.fromValues(5000, 200, 60))
    const model = createModel([createElement(woodMaterialId, mismatchedPart)])

    const part = generateMaterialPartsList(model)[woodMaterialId].parts[mismatchedPart.partId]
    expect(part.issue).toBe('CrossSectionMismatch')
    expect(part.length).toBe(5000)
  })

  it('records an issue when the part length exceeds available standard lengths', () => {
    const longPart = dimensionalPartInfo('post', vec3.fromValues(6000, 360, 60))
    const model = createModel([createElement(woodMaterialId, longPart)])

    const part = generateMaterialPartsList(model)[woodMaterialId].parts[longPart.partId]
    expect(part.issue).toBe('LengthExceedsAvailable')
    expect(part.length).toBe(6000)
  })

  it('handles parts nested inside groups', () => {
    const partInfo = dimensionalPartInfo('post', vec3.fromValues(5000, 360, 60))
    const element = createElement(woodMaterialId, partInfo)
    const group = createConstructionGroup([element], IDENTITY)

    const model = createModel([group])
    const materialParts = generateMaterialPartsList(model)[woodMaterialId]
    const part = materialParts.parts[partInfo.partId]

    expect(materialParts.totalQuantity).toBe(1)
    expect(materialParts.totalVolume).toBe(5000 * 360 * 60)
    expect(materialParts.totalLength).toBe(5000)
    expect(part.elements).toEqual([element.id])
  })

  it('preserves polygon metadata on parts', () => {
    canonicalPolygonKeyMock.mockReturnValue('polygon-key')
    minimumAreaBoundingBoxMock.mockImplementation(polygon => ({
      size: Bounds2D.fromPoints(polygon.points).max,
      angle: 0
    }))

    const polygon = {
      points: [vec2.fromValues(0, 0), vec2.fromValues(1000, 200), vec2.fromValues(1000, 800), vec2.fromValues(0, 600)]
    }

    const partInfo = polygonPartInfo('ring-beam segment', polygon, 'xy', 200)
    const model = createModel([createElement(woodMaterialId, partInfo)])

    const part = generateMaterialPartsList(model)[woodMaterialId].parts[partInfo.partId]
    expect(part.polygon?.points).toEqual(partInfo.polygon?.points)
    expect(part.polygonPlane).toBe(partInfo.polygonPlane)
  })

  it('creates entries for elements without part info', () => {
    const nonPartElement = createConstructionElement(
      woodMaterialId,
      createCuboidShape(vec3.create(), vec3.fromValues(5000, 360, 60))
    )

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
    const virtualPart = dimensionalPartInfo('module', vec3.fromValues(3000, 360, 60))
    const groupA = createGroupWithPartInfo(virtualPart)
    const groupB = createGroupWithPartInfo(virtualPart)

    const model = createModel([groupA, groupB])
    const virtualParts = generateVirtualPartsList(model)
    const part = virtualParts[virtualPart.partId]

    expect(Object.keys(virtualParts)).toHaveLength(1)
    expect(part.quantity).toBe(2)
    expect(part.label).toBe('A')
    expect(Array.from(part.size)).toEqual(Array.from(virtualPart.size))
    expect(part.elements).toEqual([groupA.id, groupB.id])
  })

  it('assigns sequential labels to distinct virtual parts', () => {
    const partA = dimensionalPartInfo('module', vec3.fromValues(3500, 360, 60))
    const partB = dimensionalPartInfo('module', vec3.fromValues(2500, 360, 60))
    const groupA = createGroupWithPartInfo(partA)
    const groupB = createGroupWithPartInfo(partB)

    const virtualParts = generateVirtualPartsList(createModel([groupA, groupB]))

    expect(virtualParts[partA.partId].label).toBe('A')
    expect(virtualParts[partB.partId].label).toBe('B')
  })

  it('includes parts from nested groups', () => {
    const innerPart = dimensionalPartInfo('inner module', vec3.fromValues(2000, 240, 40))
    const innerGroup = createGroupWithPartInfo(innerPart)
    const outerPart = dimensionalPartInfo('outer module', vec3.fromValues(3000, 360, 60))
    const outerGroup = createGroupWithPartInfo(outerPart, [innerGroup])

    const virtualParts = generateVirtualPartsList(createModel([outerGroup]))

    expect(virtualParts[innerPart.partId]).toBeDefined()
    expect(virtualParts[outerPart.partId]).toBeDefined()
    expect(virtualParts[innerPart.partId].elements).toEqual([innerGroup.id])
    expect(virtualParts[outerPart.partId].elements).toEqual([outerGroup.id])
  })
})

describe('polygonPartInfo', () => {
  beforeEach(() => {
    canonicalPolygonKeyMock.mockReturnValue('polygon-key')
    minimumAreaBoundingBoxMock.mockImplementation(polygon => ({
      size: Bounds2D.fromPoints(polygon.points).max,
      angle: 0
    }))
  })

  it('derives part info from an axis-aligned polygon', () => {
    const polygon = {
      points: [vec2.fromValues(0, 0), vec2.fromValues(1000, 0), vec2.fromValues(1000, 500), vec2.fromValues(0, 500)]
    }

    const info = polygonPartInfo('ring-beam segment', polygon, 'xy', 200)

    expect(info.type).toBe('ring-beam segment')
    expect(info.partId).toBe('200x500x1000')
    expect(Array.from(info.size)).toEqual([200, 500, 1000]) // Order of dimensions: z y x
    expect(info.polygon).toBeUndefined() // Because this is a cuboid, we don't get a polygon
    expect(info.polygonPlane).toBeUndefined()
    expect(minimumAreaBoundingBoxMock).toHaveBeenCalledWith(polygon)
    expect(canonicalPolygonKeyMock).not.toHaveBeenCalled()
  })

  it('derives part info from a wide trapezoid', () => {
    const polygon = {
      points: [vec2.fromValues(0, 0), vec2.fromValues(1000, 200), vec2.fromValues(1000, 500), vec2.fromValues(0, 700)]
    }

    const info = polygonPartInfo('ring-beam segment', polygon, 'xy', 200)

    expect(info.type).toBe('ring-beam segment')
    expect(info.partId).toBe('200x700x1000:polygon-key')
    expect(Array.from(info.size)).toEqual([200, 700, 1000]) // Order of dimensions: z y x
    expect(info.polygonPlane).toBe('yz') // Hence xy -> yz

    // Flipped x and y and reverse order
    expect(info.polygon?.points).toEqual([
      vec2.fromValues(700, 0),
      vec2.fromValues(500, 1000),
      vec2.fromValues(200, 1000),
      vec2.fromValues(0, 0)
    ])
    expect(minimumAreaBoundingBoxMock).toHaveBeenCalledWith(polygon)
    expect(canonicalPolygonKeyMock).toHaveBeenCalledWith(info.polygon?.points)
  })

  it('derives part info from a high trapezoid', () => {
    const polygon = {
      points: [vec2.fromValues(0, 0), vec2.fromValues(200, 1000), vec2.fromValues(500, 1000), vec2.fromValues(700, 0)]
    }

    const info = polygonPartInfo('ring-beam segment', polygon, 'xy', 900)

    expect(info.type).toBe('ring-beam segment')
    expect(info.partId).toBe('700x900x1000:polygon-key')
    expect(Array.from(info.size)).toEqual([700, 900, 1000]) // Order of dimensions: x z y
    expect(info.polygonPlane).toBe('xz') // Hence xy -> xz
    expect(info.polygon?.points).toEqual(polygon.points)
    expect(minimumAreaBoundingBoxMock).toHaveBeenCalledWith(polygon)
    expect(canonicalPolygonKeyMock).toHaveBeenCalledWith(info.polygon?.points)
  })

  it('handles negative thickness values', () => {
    const polygon = {
      points: [vec2.fromValues(0, 0), vec2.fromValues(2000, 0), vec2.fromValues(2000, 1000), vec2.fromValues(0, 1000)]
    }

    const info = polygonPartInfo('ring-beam segment', polygon, 'xy', -150)

    expect(info.partId).toBe('150x1000x2000')
    expect(Array.from(info.size)).toEqual([150, 1000, 2000])
    expect(minimumAreaBoundingBoxMock).toHaveBeenCalledWith(polygon)
    expect(canonicalPolygonKeyMock).not.toHaveBeenCalled()
  })
})
