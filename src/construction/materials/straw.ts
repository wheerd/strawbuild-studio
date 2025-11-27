import { vec3 } from 'gl-matrix'

import { getConfigActions } from '@/construction/config'
import { createCuboidElement } from '@/construction/elements'
import { getMaterialsActions } from '@/construction/materials/store'
import { dimensionalPartInfo } from '@/construction/parts'
import { type ConstructionResult, yieldElement, yieldError, yieldWarning } from '@/construction/results'
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

export function* constructStraw(position: vec3, size: vec3, materialId?: MaterialId): Generator<ConstructionResult> {
  const strawMaterialId = materialId ?? getConfigActions().getDefaultStrawMaterial()
  const material = getMaterialsActions().getMaterialById(strawMaterialId)

  if (material?.type !== 'strawbale') {
    yield yieldElement(
      createCuboidElement(strawMaterialId, position, size, [TAG_STRAW_STUFFED], dimensionalPartInfo('strawbale', size))
    )
    return
  }

  if (size[1] === material.baleWidth) {
    const end = vec3.add(vec3.create(), position, size)

    // Gap smaller than a flake: Make it one stuffed fill
    if (size[0] < material.flakeSize || size[2] < material.flakeSize) {
      yield yieldElement(
        createCuboidElement(
          strawMaterialId,
          position,
          size,
          [TAG_STRAW_STUFFED],
          dimensionalPartInfo('strawbale', size)
        )
      )
      return
    }

    // Vertical bales
    if (Math.abs(size[0] - material.baleHeight) <= material.tolerance) {
      for (let z = position[2]; z < end[2]; z += material.baleMaxLength) {
        const balePosition = vec3.fromValues(position[0], position[1], z)
        const baleSize = vec3.fromValues(size[0], material.baleWidth, Math.min(material.baleMaxLength, end[2] - z))

        const bale = createCuboidElement(
          strawMaterialId,
          balePosition,
          baleSize,
          getStrawTags(baleSize, material),
          dimensionalPartInfo('strawbale', baleSize)
        )
        yield yieldElement(bale)
      }
      return
    }

    // Horizontal bales
    let remainderHeight = size[2] % material.baleHeight
    if (material.baleHeight - remainderHeight < material.topCutoffLimit) remainderHeight = 0
    const fullEndZ = end[2] - remainderHeight
    for (let z = position[2]; z < fullEndZ; z += material.baleHeight) {
      for (let x = position[0]; x < end[0]; x += material.baleMaxLength) {
        const balePosition = vec3.fromValues(x, position[1], z)
        const baleSize = vec3.fromValues(
          Math.min(material.baleMaxLength, end[0] - x),
          material.baleWidth,
          Math.min(material.baleHeight, end[2] - z)
        )

        const bale = createCuboidElement(
          strawMaterialId,
          balePosition,
          baleSize,
          getStrawTags(baleSize, material),
          dimensionalPartInfo('strawbale', baleSize)
        )
        yield yieldElement(bale)
      }
    }

    // Vertical flakes on top
    if (remainderHeight > 0) {
      if (remainderHeight > material.flakeSize) {
        for (let x = position[0]; x < end[0]; x += material.baleHeight) {
          const balePosition = vec3.fromValues(x, position[1], fullEndZ)
          const baleSize = vec3.fromValues(
            Math.min(material.baleHeight, end[0] - x),
            material.baleWidth,
            remainderHeight
          )

          const bale = createCuboidElement(
            strawMaterialId,
            balePosition,
            baleSize,
            getStrawTags(baleSize, material),
            dimensionalPartInfo('strawbale', baleSize)
          )
          yield yieldElement(bale)
        }
      } else {
        const balePosition = vec3.fromValues(position[0], position[1], fullEndZ)
        const baleSize = vec3.fromValues(size[0], material.baleWidth, remainderHeight)

        yield yieldElement(
          createCuboidElement(
            strawMaterialId,
            balePosition,
            baleSize,
            getStrawTags(baleSize, material),
            dimensionalPartInfo('strawbale', baleSize)
          )
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
