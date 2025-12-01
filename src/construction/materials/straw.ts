import { vec3 } from 'gl-matrix'

import { getConfigActions } from '@/construction/config'
import { createCuboidElement } from '@/construction/elements'
import type { WallConstructionArea } from '@/construction/geometry'
import { getMaterialsActions } from '@/construction/materials/store'
import { type ConstructionResult, yieldElement, yieldError, yieldWarning } from '@/construction/results'
import { createElementFromArea } from '@/construction/shapes'
import { TAG_FULL_BALE, TAG_PARTIAL_BALE, TAG_STRAW_FLAKES, TAG_STRAW_STUFFED, type Tag } from '@/construction/tags'

import type { MaterialId, StrawbaleMaterial } from './material'

function getStrawTags(size: vec3, material: StrawbaleMaterial): Tag[] {
  if (Math.abs(size[1] - material.baleWidth) > material.tolerance) {
    return [TAG_STRAW_STUFFED]
  }

  let height: number, length: number
  if (Math.abs(size[0] - material.baleHeight) <= material.tolerance) {
    // Vertical
    height = size[0]
    length = size[2]
  } else {
    // Horizontal
    height = size[2]
    length = size[0]
  }

  const isFullHeight = Math.abs(height - material.baleHeight) <= material.tolerance
  const isFullLength = length >= material.baleMinLength && length <= material.baleMaxLength
  if (isFullHeight && isFullLength) {
    return [TAG_FULL_BALE]
  }
  if (isFullHeight) {
    if (length > material.baleMinLength / 2) {
      return [TAG_PARTIAL_BALE]
    }
    if (length >= material.flakeSize) {
      return [TAG_STRAW_FLAKES]
    }
    return [TAG_STRAW_STUFFED]
  }
  if (height > material.baleHeight - material.topCutoffLimit) {
    return [isFullLength ? TAG_PARTIAL_BALE : TAG_STRAW_FLAKES]
  }
  return [TAG_STRAW_STUFFED]
}

export function* constructStraw(area: WallConstructionArea, materialId?: MaterialId): Generator<ConstructionResult> {
  const { position, size } = area
  const strawMaterialId = materialId ?? getConfigActions().getDefaultStrawMaterial()
  const material = getMaterialsActions().getMaterialById(strawMaterialId)

  if (material?.type !== 'strawbale') {
    yield yieldElement(createElementFromArea(area, strawMaterialId, [TAG_STRAW_STUFFED], 'strawbale'))
    return
  }

  if (size[1] === material.baleWidth) {
    // Gap smaller than a flake: Make it one stuffed fill
    if (size[0] < material.flakeSize || size[2] < material.flakeSize) {
      yield yieldElement(createElementFromArea(area, strawMaterialId, [TAG_STRAW_STUFFED], 'strawbale'))
      return
    }

    // Vertical bales
    if (Math.abs(size[0] - material.baleHeight) <= material.tolerance) {
      for (let z = 0; z < size[2]; z += material.baleMaxLength) {
        const adjustedHeight = Math.min(material.baleMaxLength, size[2] - z)
        const baleArea = area.withYAdjustment(z, adjustedHeight)

        yield yieldElement(
          createElementFromArea(baleArea, strawMaterialId, getStrawTags(baleArea.size, material), 'strawbale')
        )
      }
      return
    }

    // Horizontal bales
    let remainderHeight = size[2] % material.baleHeight
    if (material.baleHeight - remainderHeight < material.topCutoffLimit) remainderHeight = 0
    const fullEndZ = size[2] - remainderHeight
    for (let z = 0; z < fullEndZ; z += material.baleHeight) {
      for (let x = 0; x < size[0]; x += material.baleMaxLength) {
        const baleArea = area.withXAdjustment(x, material.baleMaxLength).withZAdjustment(z, material.baleHeight)

        yield yieldElement(
          createElementFromArea(baleArea, strawMaterialId, getStrawTags(baleArea.size, material), 'strawbale')
        )
      }
    }

    // Vertical flakes on top
    if (remainderHeight > 0) {
      if (remainderHeight > material.flakeSize) {
        for (let x = 0; x < size[0]; x += material.baleHeight) {
          const baleArea = area.withZAdjustment(fullEndZ).withXAdjustment(x, material.baleHeight)

          yield yieldElement(
            createElementFromArea(baleArea, strawMaterialId, getStrawTags(baleArea.size, material), 'strawbale')
          )
        }
      } else {
        const baleArea = area.withZAdjustment(fullEndZ)

        yield yieldElement(
          createElementFromArea(baleArea, strawMaterialId, getStrawTags(baleArea.size, material), 'strawbale')
        )
      }
    }
  } else if (size[1] > material.baleWidth) {
    const element = createCuboidElement(strawMaterialId, position, size, [TAG_STRAW_STUFFED])
    yield yieldElement(element)
    yield yieldError({
      description: 'Wall is too thick for a single strawbale',
      elements: [element.id],
      bounds: element.bounds,
      groupKey: `strawbale-thick-${strawMaterialId}`
    })
  } else {
    const element = createCuboidElement(strawMaterialId, position, size, [TAG_STRAW_STUFFED])
    yield yieldElement(element)
    yield yieldWarning({
      description: 'Wall is too thin for a single strawbale',
      elements: [element.id],
      bounds: element.bounds,
      groupKey: `strawbale-thin-${strawMaterialId}`
    })
  }
}
