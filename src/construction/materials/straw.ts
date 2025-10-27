import { vec3 } from 'gl-matrix'

import { getConfigActions } from '@/construction/config'
import { createConstructionElement } from '@/construction/elements'
import { IDENTITY } from '@/construction/geometry'
import { dimensionalPartInfo } from '@/construction/parts'
import { type ConstructionResult, yieldElement, yieldError, yieldWarning } from '@/construction/results'
import { createCuboidShape } from '@/construction/shapes'
import { TAG_FULL_BALE, TAG_PARTIAL_BALE, TAG_STRAW_FLAKES, TAG_STRAW_STUFFED, type Tag } from '@/construction/tags'
import type { Length } from '@/shared/geometry'

import type { MaterialId } from './material'

export interface StrawConfig {
  baleMinLength: Length // Default: 800mm
  baleMaxLength: Length // Default: 900mm
  baleHeight: Length // Default: 500mm
  baleWidth: Length // Default: 360mm
  material: MaterialId

  tolerance: Length // Default 2mm
  topCutoffLimit: Length // Default: 50mm
  flakeSize: Length // Default: 70mm
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

  if (Number(config.tolerance) < 0) {
    throw new Error('Straw bale tolerance cannot be negative')
  }

  if (Number(config.topCutoffLimit) <= 0) {
    throw new Error('Straw top cutoff limit must be greater than 0')
  }

  if (Number(config.flakeSize) <= 0) {
    throw new Error('Straw flake size must be greater than 0')
  }
}

function getStrawTags(size: vec3, config: StrawConfig): Tag[] {
  if (Math.abs(size[1] - config.baleWidth) > config.tolerance) {
    return [TAG_STRAW_STUFFED]
  }

  let height: number, length: number
  if (Math.abs(size[0] - config.baleHeight) <= config.tolerance) {
    // Vertical
    height = size[0]
    length = size[2]
  } else {
    // Horizontal
    height = size[2]
    length = size[0]
  }

  const isFullHeight = Math.abs(height - config.baleHeight) <= config.tolerance
  const isFullLength = length >= config.baleMinLength && length <= config.baleMaxLength
  if (isFullHeight && isFullLength) {
    return [TAG_FULL_BALE]
  }
  if (isFullHeight) {
    if (length > config.baleMinLength / 2) {
      return [TAG_PARTIAL_BALE]
    }
    if (length > config.flakeSize) {
      return [TAG_STRAW_FLAKES]
    }
    return [TAG_STRAW_STUFFED]
  }
  if (isFullLength) {
    const canCutOffTop = height > config.baleHeight - config.topCutoffLimit
    return [canCutOffTop ? TAG_PARTIAL_BALE : TAG_STRAW_STUFFED]
  }
  return [TAG_STRAW_STUFFED]
}

export function* constructStraw(position: vec3, size: vec3): Generator<ConstructionResult> {
  const config = getConfigActions().getStrawConfig()

  if (size[1] === config.baleWidth) {
    const end = vec3.add(vec3.create(), position, size)

    // Vertical bales
    if (Math.abs(size[0] - config.baleHeight) <= config.tolerance) {
      for (let z = position[2]; z < end[2]; z += config.baleMaxLength) {
        const balePosition = vec3.fromValues(position[0], position[1], z)
        const baleSize = vec3.fromValues(size[0], config.baleWidth, Math.min(config.baleMaxLength, end[2] - z))

        const bale = createConstructionElement(
          config.material,
          createCuboidShape(balePosition, baleSize),
          IDENTITY,
          getStrawTags(baleSize, config),
          dimensionalPartInfo('strawbale', baleSize)
        )
        yield yieldElement(bale)
      }
      return
    }

    // Horizontal bales
    let remainderHeight = size[2] % config.baleHeight
    if (config.baleHeight - remainderHeight < config.topCutoffLimit) remainderHeight = 0
    const fullEndZ = end[2] - remainderHeight
    for (let z = position[2]; z < fullEndZ; z += config.baleHeight) {
      for (let x = position[0]; x < end[0]; x += config.baleMaxLength) {
        const balePosition = vec3.fromValues(x, position[1], z)
        const baleSize = vec3.fromValues(
          Math.min(config.baleMaxLength, end[0] - x),
          config.baleWidth,
          Math.min(config.baleHeight, end[2] - z)
        )

        const bale = createConstructionElement(
          config.material,
          createCuboidShape(balePosition, baleSize),
          IDENTITY,
          getStrawTags(baleSize, config),
          dimensionalPartInfo('strawbale', baleSize)
        )
        yield yieldElement(bale)
      }
    }

    // Vertical flakes on top
    if (remainderHeight > 0) {
      if (remainderHeight > config.flakeSize) {
        for (let x = position[0]; x < end[0]; x += config.baleHeight) {
          const balePosition = vec3.fromValues(x, position[1], fullEndZ)
          const baleSize = vec3.fromValues(Math.min(config.baleHeight, end[0] - x), config.baleWidth, remainderHeight)

          const bale = createConstructionElement(
            config.material,
            createCuboidShape(balePosition, baleSize),
            IDENTITY,
            getStrawTags(baleSize, config),
            dimensionalPartInfo('strawbale', baleSize)
          )
          yield yieldElement(bale)
        }
      } else {
        const balePosition = vec3.fromValues(position[0], position[1], fullEndZ)
        const baleSize = vec3.fromValues(size[0], config.baleWidth, remainderHeight)

        yield yieldElement(
          createConstructionElement(
            config.material,
            createCuboidShape(balePosition, baleSize),
            IDENTITY,
            getStrawTags(baleSize, config),
            dimensionalPartInfo('strawbale', baleSize)
          )
        )
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
