import { WallConstructionArea } from '@/construction/geometry'
import { type ConstructionResult, yieldElement, yieldError, yieldWarning } from '@/construction/results'
import { createElementFromArea } from '@/construction/shapes'
import { TAG_POST } from '@/construction/tags'
import { type Length } from '@/shared/geometry'
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

function* constructFullPost(area: WallConstructionArea, config: FullPostConfig): Generator<ConstructionResult> {
  const { size } = area
  const postElement = createElementFromArea(area, config.material, [TAG_POST], { type: 'post' })

  yield* yieldElement(postElement)

  // Check if material is dimensional and dimensions match
  const material = getMaterialById(config.material)
  if (material && material.type === 'dimensional') {
    const dimensionalMaterial = material as DimensionalMaterial
    const postDimensions = { width: config.width, thickness: size[1] }

    if (!materialSupportsCrossSection(dimensionalMaterial, postDimensions)) {
      yield yieldWarning(
        `Post dimensions (${formatLength(config.width)}x${formatLength(
          size[1]
        )}) don't match available cross sections (${formatAvailableCrossSections(dimensionalMaterial)})`,
        [postElement],
        `post-cross-section-${dimensionalMaterial.id}`
      )
    }
  }
}

function* constructDoublePost(area: WallConstructionArea, config: DoublePostConfig): Generator<ConstructionResult> {
  const { size } = area

  // Check if wall is wide enough for two posts
  const minimumWallThickness = 2 * config.thickness
  if (size[1] < minimumWallThickness) {
    const errorElement = createElementFromArea(area, config.material)

    yield* yieldElement(errorElement)
    yield yieldError(
      `Wall thickness (${formatLength(size[1])}) is not wide enough for double posts requiring ${formatLength(minimumWallThickness)} minimum`,
      [errorElement],
      `double-post-thin-wall-${minimumWallThickness}-${config.material}`
    )
    return
  }

  const post1 = createElementFromArea(area.withYAdjustment(0, config.thickness), config.material, [TAG_POST], {
    type: 'post'
  })
  yield* yieldElement(post1)

  const post2 = createElementFromArea(
    area.withYAdjustment(size[1] - config.thickness, config.thickness),
    config.material,
    [TAG_POST],
    { type: 'post' }
  )
  yield* yieldElement(post2)

  // Only add infill if there's space for it
  const infillThickness = size[1] - 2 * config.thickness
  if (infillThickness > 0) {
    yield* yieldElement(
      createElementFromArea(
        area.withYAdjustment(config.thickness, size[1] - minimumWallThickness),
        config.infillMaterial
      )
    )

    // Check if post material is dimensional and dimensions match
    const postMaterial = getMaterialById(config.material)
    if (postMaterial && postMaterial.type === 'dimensional') {
      const dimensionalMaterial = postMaterial as DimensionalMaterial
      const postDimensions = { width: config.width, thickness: config.thickness }

      if (!materialSupportsCrossSection(dimensionalMaterial, postDimensions)) {
        yield yieldWarning(
          `Post dimensions (${formatLength(config.width)}x${formatLength(
            config.thickness
          )}) don't match available cross sections (${formatAvailableCrossSections(dimensionalMaterial)})`,
          [post1, post2],
          `post-cross-section-${dimensionalMaterial.id}`
        )
      }
    }
  }
}

export function constructPost(area: WallConstructionArea, config: PostConfig): Generator<ConstructionResult> {
  if (config.type === 'full') {
    return constructFullPost(area, config)
  } else if (config.type === 'double') {
    return constructDoublePost(area, config)
  } else {
    throw new Error('Invalid post type')
  }
}

const ensurePositive = (value: number, message: string) => {
  if (Number(value) <= 0) {
    throw new Error(message)
  }
}

export const validatePosts = (posts: PostConfig): void => {
  ensurePositive(posts.width, 'Post width must be greater than 0')
  if (posts.type === 'double') {
    ensurePositive(posts.thickness, 'Double post thickness must be greater than 0')
  }
}
