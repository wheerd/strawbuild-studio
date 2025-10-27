import { vec3 } from 'gl-matrix'

import { createConstructionElement } from '@/construction/elements'
import { IDENTITY } from '@/construction/geometry'
import { dimensionalPartInfo } from '@/construction/parts'
import { type ConstructionResult, yieldElement, yieldError, yieldWarning } from '@/construction/results'
import { createCuboidShape } from '@/construction/shapes'
import { TAG_FULL_BALE, TAG_PARTIAL_BALE } from '@/construction/tags'
import type { Length } from '@/shared/geometry'

import type { MaterialId } from './material'

export interface StrawConfig {
  baleLength: Length // Default: 800mm
  baleHeight: Length // Default: 500mm
  baleWidth: Length // Default: 360mm
  material: MaterialId
}

export function* constructStraw(position: vec3, size: vec3, config: StrawConfig): Generator<ConstructionResult> {
  if (size[1] === config.baleWidth) {
    const end = vec3.add(vec3.create(), position, size)

    for (let z = position[2]; z < end[2]; z += config.baleHeight) {
      for (let x = position[0]; x < end[0]; x += config.baleLength) {
        const balePosition = vec3.fromValues(x, position[1], z)
        const baleSize = vec3.fromValues(
          Math.min(config.baleLength, end[0] - x),
          config.baleWidth,
          Math.min(config.baleHeight, end[2] - z)
        )

        const isFullBale = baleSize[0] === config.baleLength && baleSize[2] === config.baleHeight
        const bale = createConstructionElement(
          config.material,
          createCuboidShape(balePosition, baleSize),
          IDENTITY,
          [isFullBale ? TAG_FULL_BALE : TAG_PARTIAL_BALE],
          dimensionalPartInfo('strawbale', baleSize)
        )
        yield yieldElement(bale)
      }
    }
  } else if (size[1] > config.baleWidth) {
    const element = createConstructionElement(config.material, createCuboidShape(position, size))
    yield yieldElement(element)
    yield yieldError({
      description: 'Wall is too thick for a single strawbale',
      elements: [element.id],
      bounds: element.bounds
    })
  } else {
    const element = createConstructionElement(config.material, createCuboidShape(position, size))
    yield yieldElement(element)
    yield yieldWarning({
      description: 'Wall is too thin for a single strawbale',
      elements: [element.id],
      bounds: element.bounds
    })
  }
}
