import { vec3 } from 'gl-matrix'

import { type ConstructionElement, createCuboidElement } from '@/construction/elements'
import { dimensionalPartInfo } from '@/construction/parts'
import { type ConstructionResult, yieldElement, yieldError, yieldWarning } from '@/construction/results'
import { TAG_POST } from '@/construction/tags'
import { Bounds3D, type Length } from '@/shared/geometry'
import { formatLength } from '@/shared/utils/formatting'

import type { DimensionalMaterial, MaterialId } from './material'
import { getMaterialById } from './store'

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
const materialSupportsCrossSection = (
  material: DimensionalMaterial,
  dimensions: { width: Length; thickness: Length }
): boolean => {
  return material.crossSections.some(section => {
    const smaller = Math.min(dimensions.width, dimensions.thickness)
    const bigger = Math.max(dimensions.width, dimensions.thickness)
    return section.smallerLength === smaller && section.biggerLength === bigger
  })
}

const formatAvailableCrossSections = (material: DimensionalMaterial): string =>
  material.crossSections
    .map(section => `${formatLength(section.smallerLength)}x${formatLength(section.biggerLength)}`)
    .join(', ')

function* constructFullPost(position: vec3, size: vec3, config: FullPostConfig): Generator<ConstructionResult> {
  const postSize = vec3.fromValues(config.width, size[1], size[2])
  const postElement: ConstructionElement = createCuboidElement(
    config.material,
    position,
    postSize,
    [TAG_POST],
    dimensionalPartInfo('post', postSize)
  )

  yield yieldElement(postElement)

  // Check if material is dimensional and dimensions match
  const material = getMaterialById(config.material)
  if (material && material.type === 'dimensional') {
    const dimensionalMaterial = material as DimensionalMaterial
    const postDimensions = { width: config.width, thickness: size[1] }

    if (!materialSupportsCrossSection(dimensionalMaterial, postDimensions)) {
      yield yieldWarning({
        description: `Post dimensions (${formatLength(config.width)}x${formatLength(
          size[1]
        )}) don't match available cross sections (${formatAvailableCrossSections(dimensionalMaterial)})`,
        elements: [postElement.id],
        bounds: postElement.bounds,
        groupKey: `post-cross-section-${dimensionalMaterial.id}`
      })
    }
  }
}

function* constructDoublePost(position: vec3, size: vec3, config: DoublePostConfig): Generator<ConstructionResult> {
  // Check if wall is wide enough for two posts
  const minimumWallThickness = 2 * config.thickness
  if (size[1] < minimumWallThickness) {
    const errorElement: ConstructionElement = createCuboidElement(
      config.material,
      position,
      vec3.fromValues(config.width, size[1], size[2])
    )

    yield yieldElement(errorElement)
    yield yieldError({
      description: `Wall thickness (${formatLength(size[1])}) is not wide enough for double posts requiring ${formatLength(minimumWallThickness)} minimum`,
      elements: [errorElement.id],
      bounds: errorElement.bounds,
      groupKey: `double-post-thin-wall-${minimumWallThickness}-${config.material}`
    })
    return
  }

  const postSize = vec3.fromValues(config.width, config.thickness, size[2])
  const partInfo = dimensionalPartInfo('post', postSize)
  const post1: ConstructionElement = createCuboidElement(config.material, position, postSize, [TAG_POST], partInfo)
  yield yieldElement(post1)

  const post2: ConstructionElement = createCuboidElement(
    config.material,
    vec3.fromValues(position[0], position[1] + size[1] - config.thickness, position[2]),
    postSize,
    [TAG_POST],
    partInfo
  )
  yield yieldElement(post2)

  // Only add infill if there's space for it
  const infillThickness = size[1] - 2 * config.thickness
  if (infillThickness > 0) {
    const infill: ConstructionElement = createCuboidElement(
      config.infillMaterial,
      vec3.fromValues(position[0], position[1] + config.thickness, position[2]),
      vec3.fromValues(config.width, infillThickness, size[2])
    )
    yield yieldElement(infill)
  }

  // Check if post material is dimensional and dimensions match
  const postMaterial = getMaterialById(config.material)
  if (postMaterial && postMaterial.type === 'dimensional') {
    const dimensionalMaterial = postMaterial as DimensionalMaterial
    const postDimensions = { width: config.width, thickness: config.thickness }

    if (!materialSupportsCrossSection(dimensionalMaterial, postDimensions)) {
      yield yieldWarning({
        description: `Post dimensions (${formatLength(config.width)}x${formatLength(
          config.thickness
        )}) don't match available cross sections (${formatAvailableCrossSections(dimensionalMaterial)})`,
        elements: [post1.id, post2.id],
        bounds: Bounds3D.merge(post1.bounds, post2.bounds),
        groupKey: `post-cross-section-${dimensionalMaterial.id}`
      })
    }
  }
}

export function constructPost(position: vec3, size: vec3, config: PostConfig): Generator<ConstructionResult> {
  if (config.type === 'full') {
    return constructFullPost(position, size, config)
  } else if (config.type === 'double') {
    return constructDoublePost(position, size, config)
  } else {
    throw new Error('Invalid post type')
  }
}
