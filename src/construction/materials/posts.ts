import { type ConstructionElement, createConstructionElement, createCuboidShape } from '@/construction/elements'
import { type ConstructionResult, yieldElement, yieldError, yieldWarning } from '@/construction/results'
import { type Length, type Vec3 } from '@/shared/geometry'
import { formatLength } from '@/shared/utils/formatLength'

import type { Material, MaterialId, ResolveMaterialFunction } from './material'

export interface BasePostConfig {
  type: 'full' | 'double'
  width: Length // Default: 60mm
  material: MaterialId
}

export interface FullPostConfig extends BasePostConfig {
  type: 'full'
  // Default material: 36x6 wood
}

export interface DoublePostConfig extends BasePostConfig {
  type: 'double'
  thickness: Length // Default: 120mm
  // Default material: 12x6 wood
  infillMaterial: MaterialId // Default: straw
}

export type PostConfig = FullPostConfig | DoublePostConfig

/**
 * Checks if two dimensional materials have matching dimensions.
 * Allows for swapped dimensions (e.g., 360x60 matches 60x360).
 */
const dimensionsMatch = (
  dim1: { width: Length; thickness: Length },
  dim2: { width: Length; thickness: Length }
): boolean => {
  // Direct match
  if (dim1.width === dim2.width && dim1.thickness === dim2.thickness) {
    return true
  }

  // Swapped dimensions match (360x60 === 60x360)
  if (dim1.width === dim2.thickness && dim1.thickness === dim2.width) {
    return true
  }

  return false
}

function* constructFullPost(
  position: Vec3,
  size: Vec3,
  config: FullPostConfig,
  resolveMaterial: ResolveMaterialFunction
): Generator<ConstructionResult> {
  const postElement: ConstructionElement = createConstructionElement(
    'post',
    config.material,
    createCuboidShape(position, [config.width, size[1], size[2]])
  )

  yield yieldElement(postElement)

  // Check if material is dimensional and dimensions match
  const material = resolveMaterial(config.material)
  if (material && material.type === 'dimensional') {
    const dimensionalMaterial = material as Material & { type: 'dimensional' }
    const postDimensions = { width: config.width, thickness: size[1] as Length }
    const materialDimensions = { width: dimensionalMaterial.width, thickness: dimensionalMaterial.thickness }

    if (!dimensionsMatch(postDimensions, materialDimensions)) {
      yield yieldWarning({
        description: `Post dimensions (${formatLength(config.width)}x${formatLength(size[1] as Length)}) don't match material dimensions (${formatLength(dimensionalMaterial.width)}x${formatLength(dimensionalMaterial.thickness)})`,
        elements: [postElement.id]
      })
    }
  }
}

function* constructDoublePost(
  position: Vec3,
  size: Vec3,
  config: DoublePostConfig,
  resolveMaterial: ResolveMaterialFunction
): Generator<ConstructionResult> {
  // Check if wall is wide enough for two posts
  const minimumWallThickness = 2 * config.thickness
  if (size[1] < minimumWallThickness) {
    const errorElement: ConstructionElement = createConstructionElement(
      'post',
      config.material,
      createCuboidShape(position, [config.width, size[1], size[2]])
    )

    yield yieldElement(errorElement)
    yield yieldError({
      description: `Wall thickness (${formatLength(size[1] as Length)}) is not wide enough for double posts requiring ${formatLength(minimumWallThickness as Length)} minimum`,
      elements: [errorElement.id]
    })
    return
  }

  const post1: ConstructionElement = createConstructionElement(
    'post',
    config.material,
    createCuboidShape(position, [config.width, config.thickness, size[2]])
  )
  yield yieldElement(post1)

  const post2: ConstructionElement = createConstructionElement(
    'post',
    config.material,
    createCuboidShape(
      [position[0], position[1] + size[1] - config.thickness, position[2]],
      [config.width, config.thickness, size[2]]
    )
  )
  yield yieldElement(post2)

  // Only add infill if there's space for it
  const infillThickness = size[1] - 2 * config.thickness
  if (infillThickness > 0) {
    const infill: ConstructionElement = createConstructionElement(
      'infill',
      config.infillMaterial,
      createCuboidShape(
        [position[0], position[1] + config.thickness, position[2]],
        [config.width, infillThickness, size[2]]
      )
    )
    yield yieldElement(infill)
  }

  // Check if post material is dimensional and dimensions match
  const postMaterial = resolveMaterial(config.material)
  if (postMaterial && postMaterial.type === 'dimensional') {
    const dimensionalMaterial = postMaterial as Material & { type: 'dimensional' }
    const postDimensions = { width: config.width, thickness: config.thickness }
    const materialDimensions = { width: dimensionalMaterial.width, thickness: dimensionalMaterial.thickness }

    if (!dimensionsMatch(postDimensions, materialDimensions)) {
      yield yieldWarning({
        description: `Post dimensions (${formatLength(config.width)}x${formatLength(config.thickness)}) don't match material dimensions (${formatLength(dimensionalMaterial.width)}x${formatLength(dimensionalMaterial.thickness)})`,
        elements: [post1.id, post2.id]
      })
    }
  }
}

export function constructPost(
  position: Vec3,
  size: Vec3,
  config: PostConfig,
  resolveMaterial: ResolveMaterialFunction
): Generator<ConstructionResult> {
  if (config.type === 'full') {
    return constructFullPost(position, size, config, resolveMaterial)
  } else if (config.type === 'double') {
    return constructDoublePost(position, size, config, resolveMaterial)
  } else {
    throw new Error('Invalid post type')
  }
}
