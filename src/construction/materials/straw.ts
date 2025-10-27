import { vec3 } from 'gl-matrix'

import { getConfigActions } from '@/construction/config'
import { createConstructionElement } from '@/construction/elements'
import { IDENTITY } from '@/construction/geometry'
import { dimensionalPartInfo } from '@/construction/parts'
import { type ConstructionResult, yieldElement, yieldError, yieldWarning } from '@/construction/results'
import { createCuboidShape } from '@/construction/shapes'
import { TAG_FULL_BALE, TAG_PARTIAL_BALE } from '@/construction/tags'
import type { Length } from '@/shared/geometry'

import type { MaterialId } from './material'

export interface StrawConfig {
  baleMinLength: Length // Default: 800mm
  baleMaxLength: Length // Default: 900mm
  baleHeight: Length // Default: 500mm
  baleWidth: Length // Default: 360mm
  material: MaterialId
}

export function validateStrawConfig(config: StrawConfig): void {
  if (Number(config.baleMinLength) <= 0) {
    throw new Error('Minimum straw bale length must be greater than 0')
  }

  if (Number(config.baleMaxLength) <= 0) {
    throw new Error('Maximum straw bale length must be greater than 0')
  }

  if (Number(config.baleMinLength) > Number(config.baleMaxLength)) {
    throw new Error('Minimum straw bale length cannot exceed the maximum straw bale length')
  }

  if (Number(config.baleHeight) <= 0) {
    throw new Error('Straw bale height must be greater than 0')
  }

  if (Number(config.baleWidth) <= 0) {
    throw new Error('Straw bale width must be greater than 0')
  }
}

export function* constructStraw(position: vec3, size: vec3): Generator<ConstructionResult> {
  const config = getConfigActions().getStrawConfig()

  if (size[1] === config.baleWidth) {
    const end = vec3.add(vec3.create(), position, size)

    for (let z = position[2]; z < end[2]; z += config.baleHeight) {
      for (let x = position[0]; x < end[0]; x += config.baleMinLength) {
        const balePosition = vec3.fromValues(x, position[1], z)
        const baleSize = vec3.fromValues(
          Math.min(config.baleMinLength, end[0] - x),
          config.baleWidth,
          Math.min(config.baleHeight, end[2] - z)
        )

        const isFullBale = baleSize[0] === config.baleMinLength && baleSize[2] === config.baleHeight
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
