import { getConfigActions } from '@/construction/config'
import { type ConstructionElement, createConstructionElement } from '@/construction/elements'
import type { WallConstructionArea } from '@/construction/geometry'
import { PolygonWithBoundingRect } from '@/construction/helpers'
import { getMaterialsActions } from '@/construction/materials/store'
import { type ConstructionResult, yieldElement, yieldError, yieldWarning } from '@/construction/results'
import { createElementFromArea, createExtrudedPolygon } from '@/construction/shapes'
import {
  TAG_FULL_BALE,
  TAG_PARTIAL_BALE,
  TAG_STRAW_FLAKES,
  TAG_STRAW_INFILL,
  TAG_STRAW_STUFFED,
  type Tag
} from '@/construction/tags'
import { type Length, type Plane3D, type Vec3 } from '@/shared/geometry'

import type { MaterialId, StrawbaleMaterial } from './material'

function getStrawTags(size: Vec3, material: StrawbaleMaterial): Tag[] {
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
  const { size } = area
  const strawMaterialId = materialId ?? getConfigActions().getDefaultStrawMaterial()
  const material = getMaterialsActions().getMaterialById(strawMaterialId)

  if (material?.type !== 'strawbale') {
    yield* yieldElement(createElementFromArea(area, strawMaterialId, [TAG_STRAW_STUFFED], { type: 'strawbale' }))
    return
  }

  if (size[1] === material.baleWidth) {
    // Gap smaller than a flake: Make it one stuffed fill
    if (size[0] < material.flakeSize || size[2] < material.flakeSize) {
      yield* yieldElement(createElementFromArea(area, strawMaterialId, [TAG_STRAW_STUFFED], { type: 'strawbale' }))
      return
    }

    // Vertical bales
    if (Math.abs(size[0] - material.baleHeight) <= material.tolerance) {
      for (let z = 0; z < size[2]; z += material.baleMaxLength) {
        const adjustedHeight = Math.min(material.baleMaxLength, size[2] - z)
        const baleArea = area.withZAdjustment(z, adjustedHeight)

        yield* yieldElement(
          createElementFromArea(baleArea, strawMaterialId, getStrawTags(baleArea.size, material), { type: 'strawbale' })
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

        yield* yieldElement(
          createElementFromArea(baleArea, strawMaterialId, getStrawTags(baleArea.size, material), { type: 'strawbale' })
        )
      }
    }

    // Vertical flakes on top
    if (remainderHeight > 0) {
      const remainingArea = area.withZAdjustment(fullEndZ)
      if (remainderHeight > material.flakeSize) {
        for (let x = 0; x < size[0]; x += material.baleHeight) {
          const baleArea = remainingArea.withXAdjustment(x, material.baleHeight)

          yield* yieldElement(
            createElementFromArea(baleArea, strawMaterialId, getStrawTags(baleArea.size, material), {
              type: 'strawbale'
            })
          )
        }
      } else {
        const baleArea = area.withZAdjustment(fullEndZ)

        yield* yieldElement(
          createElementFromArea(baleArea, strawMaterialId, getStrawTags(baleArea.size, material), { type: 'strawbale' })
        )
      }
    }
  } else if (size[1] > material.baleWidth) {
    const element = createElementFromArea(area, strawMaterialId, [TAG_STRAW_STUFFED])
    yield* yieldElement(element)
    yield yieldError($ => $.construction.straw.tooThick, undefined, [element], `strawbale-thick-${strawMaterialId}`)
  } else {
    const element = createElementFromArea(area, strawMaterialId, [TAG_STRAW_STUFFED])
    yield* yieldElement(element)
    yield yieldWarning($ => $.construction.straw.tooThin, undefined, [element], `strawbale-thin-${strawMaterialId}`)
  }
}

export function* constructStrawPolygon(
  polygon: PolygonWithBoundingRect,
  plane: Plane3D,
  thickness: Length,
  materialId?: MaterialId
): Generator<ConstructionResult> {
  const strawMaterialId = materialId ?? getConfigActions().getDefaultStrawMaterial()
  const material = getMaterialsActions().getMaterialById(strawMaterialId)

  const fullElement = (tags: Tag[]): ConstructionElement =>
    createConstructionElement(
      strawMaterialId,
      createExtrudedPolygon(polygon.polygon, plane, thickness),
      undefined,
      tags,
      { type: 'strawbale' }
    )

  if (material?.type !== 'strawbale') {
    yield* yieldElement(fullElement([TAG_STRAW_INFILL]))
    return
  }

  if (thickness > material.baleWidth) {
    const element = fullElement([TAG_STRAW_INFILL])
    yield* yieldElement(element)
    yield yieldError($ => $.construction.straw.tooThick, undefined, [element], `strawbale-thick-${strawMaterialId}`)
    return
  } else if (thickness < material.baleWidth) {
    const element = fullElement([TAG_STRAW_INFILL])
    yield* yieldElement(element)
    yield yieldWarning($ => $.construction.straw.tooThin, undefined, [element], `strawbale-thin-${strawMaterialId}`)
    return
  }

  if (polygon.dirExtent < material.flakeSize || polygon.perpExtent < material.flakeSize) {
    yield* yieldElement(fullElement([TAG_STRAW_STUFFED]))
    return
  }

  // Bale length along dir
  if (Math.abs(polygon.perpExtent - material.baleHeight) <= material.tolerance) {
    for (const part of polygon.tiled(material.baleMaxLength, material.baleHeight)) {
      yield* baleFromPolygon(part, thickness, material, plane)
    }
    return
  }

  // Bale length perpendicular to dir
  for (const part of polygon.tiled(material.baleHeight, material.baleMaxLength)) {
    yield* baleFromPolygon(part, thickness, material, plane)
  }
}

function* baleFromPolygon(
  part: PolygonWithBoundingRect,
  thickness: Length,
  material: StrawbaleMaterial,
  plane: Plane3D
) {
  const partSize = part.size3D('xz', thickness) // Fake wall dimensions
  const fillingRatio = part.area / part.rectArea
  const tags = fillingRatio < 0.8 ? [TAG_STRAW_STUFFED] : getStrawTags(partSize, material)
  yield* part.extrude(material.id, thickness, plane, undefined, tags, { type: 'strawbale' })
}
