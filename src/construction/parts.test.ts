import { vec3 } from 'gl-matrix'
import { beforeEach, describe, expect, it } from 'vitest'

import { createConstructionElement } from '@/construction/elements'
import { IDENTITY } from '@/construction/geometry'
import { DEFAULT_MATERIALS, window as windowMaterial, wood360x60 } from '@/construction/materials/material'
import { setMaterialsState } from '@/construction/materials/store'
import { type ConstructionModel, createConstructionGroup } from '@/construction/model'
import { type PartId, type PartInfo, dimensionalPartInfo, generatePartsList } from '@/construction/parts'
import { createCuboidShape } from '@/construction/shapes'

const createModel = (elements: ConstructionModel['elements']): ConstructionModel => {
  const origin = vec3.fromValues(0, 0, 0)
  return {
    elements,
    measurements: [],
    areas: [],
    errors: [],
    warnings: [],
    bounds: { min: origin, max: origin }
  }
}

const createElement = (materialId: typeof wood360x60.id | typeof windowMaterial.id, partInfo: PartInfo) =>
  createConstructionElement(
    materialId,
    createCuboidShape(vec3.create(), vec3.clone(partInfo.size)),
    undefined,
    undefined,
    partInfo
  )

describe('generatePartsList', () => {
  beforeEach(() => {
    setMaterialsState({ materials: { ...DEFAULT_MATERIALS } })
  })

  it('aggregates identical dimensional parts', () => {
    const partInfo = dimensionalPartInfo('post', vec3.fromValues(5000, 360, 60))
    const elementA = createElement(wood360x60.id, partInfo)
    const elementB = createElement(wood360x60.id, dimensionalPartInfo('post', vec3.fromValues(5000, 360, 60)))

    const model = createModel([elementA, elementB])
    const partsList = generatePartsList(model)
    const materialParts = partsList[wood360x60.id]
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

    const elementA = createElement(wood360x60.id, partA)
    const elementB = createElement(wood360x60.id, partB)

    const model = createModel([elementA, elementB])
    const { parts, totalQuantity } = generatePartsList(model)[wood360x60.id]
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
    const materialParts = generatePartsList(model)[windowMaterial.id]
    const part = materialParts.parts[partInfo.partId]

    expect(materialParts.totalLength).toBeUndefined()
    expect(part.length).toBeUndefined()
    expect(part.totalLength).toBeUndefined()
    expect(part.elements).toEqual([element.id])
  })

  it('records an issue when the cross section does not match the material', () => {
    const mismatchedPart = dimensionalPartInfo('post', vec3.fromValues(5000, 200, 60))
    const model = createModel([createElement(wood360x60.id, mismatchedPart)])

    const part = generatePartsList(model)[wood360x60.id].parts[mismatchedPart.partId]
    expect(part.issue).toBe('CrossSectionMismatch')
    expect(part.length).toBe(5000)
  })

  it('records an issue when the part length exceeds available standard lengths', () => {
    const longPart = dimensionalPartInfo('post', vec3.fromValues(6000, 360, 60))
    const model = createModel([createElement(wood360x60.id, longPart)])

    const part = generatePartsList(model)[wood360x60.id].parts[longPart.partId]
    expect(part.issue).toBe('LengthExceedsAvailable')
    expect(part.length).toBe(6000)
  })

  it('handles parts nested inside groups', () => {
    const partInfo = dimensionalPartInfo('post', vec3.fromValues(5000, 360, 60))
    const element = createElement(wood360x60.id, partInfo)
    const group = createConstructionGroup([element], IDENTITY)

    const model = createModel([group])
    const materialParts = generatePartsList(model)[wood360x60.id]
    const part = materialParts.parts[partInfo.partId]

    expect(materialParts.totalQuantity).toBe(1)
    expect(materialParts.totalVolume).toBe(5000 * 360 * 60)
    expect(materialParts.totalLength).toBe(5000)
    expect(part.elements).toEqual([element.id])
  })

  it('ignores elements without part info', () => {
    const nonPartElement = createConstructionElement(
      wood360x60.id,
      createCuboidShape(vec3.create(), vec3.fromValues(5000, 360, 60))
    )

    const model = createModel([nonPartElement])
    const partsList = generatePartsList(model)

    expect(Object.values(partsList)).toHaveLength(0)
  })
})
