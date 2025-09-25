import { vec3 } from 'gl-matrix'

import { createConstructionElement, createCuboidShape } from '@/construction/elements'
import { type ConstructionResult, yieldElement, yieldError, yieldWarning } from '@/construction/results'
import type { Length, Vec3 } from '@/shared/geometry'

import type { MaterialId } from './material'

export interface StrawConfig {
  baleLength: Length // Default: 800mm
  baleHeight: Length // Default: 500mm
  baleWidth: Length // Default: 360mm
  material: MaterialId
}

export function* constructStraw(position: Vec3, size: Vec3, config: StrawConfig): Generator<ConstructionResult> {
  if (size[1] === config.baleWidth) {
    const end = vec3.create()
    vec3.add(end, position, size)

    for (let z = position[2]; z < end[2]; z += config.baleHeight) {
      for (let x = position[0]; x < end[0]; x += config.baleLength) {
        const balePosition: Vec3 = [x, position[1], z]
        const baleSize = [
          Math.min(config.baleLength, end[0] - x),
          config.baleWidth,
          Math.min(config.baleHeight, end[2] - z)
        ]

        const isFullBale = baleSize[0] === config.baleLength && baleSize[2] === config.baleHeight
        const bale = createConstructionElement(
          isFullBale ? 'full-strawbale' : 'partial-strawbale',
          config.material,
          createCuboidShape(balePosition, baleSize)
        )
        yield yieldElement(bale)
      }
    }
  } else if (size[1] > config.baleWidth) {
    const element = createConstructionElement('straw', config.material, createCuboidShape(position, size))
    yield yieldElement(element)
    yield yieldError({ description: 'Wall is too thick for a single strawbale', elements: [element.id] })
  } else {
    const element = createConstructionElement('straw', config.material, createCuboidShape(position, size))
    yield yieldElement(element)
    yield yieldWarning({ description: 'Wall is too thin for a single strawbale', elements: [element.id] })
  }
}
