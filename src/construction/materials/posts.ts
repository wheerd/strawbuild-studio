import type { WallPost } from '@/building/model'
import type { GroupOrElement } from '@/construction/elements'
import { WallConstructionArea } from '@/construction/geometry'
import {
  type ConstructionResult,
  yieldAndCollectElements,
  yieldElement,
  yieldError,
  yieldWarning
} from '@/construction/results'
import { createElementFromArea } from '@/construction/shapes'
import { TAG_INFILL, TAG_MODULE, TAG_POST, createTag } from '@/construction/tags'
import { type Length } from '@/shared/geometry'
import { assertUnreachable } from '@/shared/utils'

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

function* constructFullPost(area: WallConstructionArea, config: FullPostConfig): Generator<ConstructionResult> {
  const { size } = area
  const postElement = createElementFromArea(area, config.material, [TAG_POST], {
    type: 'post',
    requiresSinglePiece: true
  })

  yield* yieldElement(postElement)

  // Check if material is dimensional and dimensions match
  const material = getMaterialById(config.material)
  if (material?.type === 'dimensional') {
    const dimensionalMaterial = material
    const postDimensions = { width: config.width, thickness: size[1] }

    if (!materialSupportsCrossSection(dimensionalMaterial, postDimensions)) {
      yield yieldWarning(
        $ => $.construction.post.dimensionsMismatch,
        {
          width: config.width,
          thickness: size[1]
        },
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
      $ => $.construction.post.wallTooThin,
      {
        wallThickness: size[1],
        required: minimumWallThickness
      },
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
    { type: 'post', requiresSinglePiece: true }
  )
  yield* yieldElement(post2)

  // Only add infill if there's space for it
  const infillThickness = size[1] - 2 * config.thickness
  if (infillThickness > 0) {
    yield* yieldElement(
      createElementFromArea(
        area.withYAdjustment(config.thickness, size[1] - minimumWallThickness),
        config.infillMaterial,
        [TAG_INFILL]
      )
    )

    // Check if post material is dimensional and dimensions match
    const postMaterial = getMaterialById(config.material)
    if (postMaterial?.type === 'dimensional') {
      const dimensionalMaterial = postMaterial
      const postDimensions = { width: config.width, thickness: config.thickness }

      if (!materialSupportsCrossSection(dimensionalMaterial, postDimensions)) {
        yield yieldWarning(
          $ => $.construction.post.dimensionsMismatch,
          {
            width: config.width,
            thickness: config.thickness
          },
          [post1, post2],
          `post-cross-section-${dimensionalMaterial.id}`
        )
      }
    }
  }
}

export function constructPost(area: WallConstructionArea, config: PostConfig): Generator<ConstructionResult> {
  switch (config.type) {
    case 'full':
      return constructFullPost(area, config)
    case 'double':
      return constructDoublePost(area, config)
    default:
      assertUnreachable(config, 'Invalid post type')
  }
}

const ensurePositive = (value: number, message: string) => {
  if (value <= 0) {
    throw new Error(message)
  }
}

export const validatePosts = (posts: PostConfig): void => {
  ensurePositive(posts.width, 'Post width must be greater than 0')
  if (posts.type === 'double') {
    ensurePositive(posts.thickness, 'Double post thickness must be greater than 0')
  }
}

export function* constructWallPost(area: WallConstructionArea, post: WallPost): Generator<ConstructionResult> {
  const wallThickness = area.size[1]
  const postElements: GroupOrElement[] = []
  const material = getMaterialById(post.material)
  let tags, partInfo
  if (material?.type === 'prefab') {
    const nameKey = material.nameKey
    const typeTag = createTag(
      'module-type',
      material.id,
      nameKey ? t => t($ => $.materials.defaults[nameKey], { ns: 'config' }) : material.name
    )
    tags = [TAG_MODULE, typeTag]
    partInfo = { type: 'module', subtype: material.id }
  } else {
    tags = [TAG_POST]
    partInfo = { type: 'post', requiresSinglePiece: true }
  }

  switch (post.postType) {
    case 'double':
      {
        const infillThickness = wallThickness - 2 * post.thickness
        const insideArea = area.withYAdjustment(0, post.thickness)
        yield* yieldAndCollectElements(
          yieldElement(createElementFromArea(insideArea, post.material, tags, partInfo)),
          postElements
        )
        const infillArea = area.withYAdjustment(post.thickness, infillThickness)
        yield* yieldElement(createElementFromArea(infillArea, post.infillMaterial, [TAG_INFILL]))
        const outsideArea = area.withYAdjustment(wallThickness - post.thickness)
        yield* yieldAndCollectElements(
          yieldElement(createElementFromArea(outsideArea, post.material, tags, partInfo)),
          postElements
        )
      }
      break

    case 'center':
      {
        const infillThickness = (wallThickness - post.thickness) / 2
        const infillInside = area.withYAdjustment(0, infillThickness)
        yield* yieldElement(createElementFromArea(infillInside, post.infillMaterial, [TAG_INFILL]))
        const centerArea = area.withYAdjustment(infillThickness, post.thickness)
        yield* yieldAndCollectElements(
          yieldElement(createElementFromArea(centerArea, post.material, tags, partInfo)),
          postElements
        )
        const infillOutside = area.withYAdjustment(wallThickness - infillThickness)
        yield* yieldElement(createElementFromArea(infillOutside, post.infillMaterial, [TAG_INFILL]))
      }
      break
    case 'inside':
      {
        const insideArea = area.withYAdjustment(0, post.thickness)
        yield* yieldAndCollectElements(
          yieldElement(createElementFromArea(insideArea, post.material, tags, partInfo)),
          postElements
        )
        const infillArea = area.withYAdjustment(post.thickness)
        yield* yieldElement(createElementFromArea(infillArea, post.infillMaterial, [TAG_INFILL]))
      }
      break
    case 'outside':
      {
        const infillThickness = wallThickness - post.thickness
        const infillArea = area.withYAdjustment(0, infillThickness)
        yield* yieldElement(createElementFromArea(infillArea, post.infillMaterial, [TAG_INFILL]))
        const outsideArea = area.withYAdjustment(infillThickness)
        yield* yieldAndCollectElements(
          yieldElement(createElementFromArea(outsideArea, post.material, tags, partInfo)),
          postElements
        )
      }
      break
  }

  // Check if material is dimensional and dimensions match
  if (material?.type === 'dimensional') {
    const dimensionalMaterial = material
    const postDimensions = { width: post.width, thickness: post.thickness }

    if (!materialSupportsCrossSection(dimensionalMaterial, postDimensions)) {
      yield yieldWarning(
        $ => $.construction.post.dimensionsMismatch,
        {
          width: postDimensions.width,
          thickness: postDimensions.thickness
        },
        postElements,
        `post-cross-section-${dimensionalMaterial.id}`
      )
    }
  }
}
