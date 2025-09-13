import type { PerimeterWall } from '@/model'
import type { Length, Vec3 } from '@/types/geometry'
import { constructPost, type PostConfig } from './posts'
import type {
  BaseConstructionConfig,
  ConstructionElement,
  ConstructionIssue,
  ConstructionSegment,
  PerimeterWallConstructionMethod,
  WallConstructionPlan,
  WallConstructionSegment,
  WithIssues
} from './base'
import { segmentWall, createConstructionElementId } from './base'
import { constructOpening } from './openings'
import { resolveDefaultMaterial } from './material'
import type { ResolveMaterialFunction } from './material'
import { constructStraw } from './straw'

export interface InfillConstructionConfig extends BaseConstructionConfig {
  maxPostSpacing: Length // Default: 800mm
  minStrawSpace: Length // Default: 70mm
  posts: PostConfig // Default: full
}

export function infillWallArea(
  position: Vec3,
  size: Vec3,
  config: InfillConstructionConfig,
  resolveMaterial: ResolveMaterialFunction,
  startsWithStand: boolean = false,
  endsWithStand: boolean = false,
  startAtEnd: boolean = false
): WithIssues<ConstructionElement[]> {
  const { minStrawSpace } = config
  const { width: postWidth } = config.posts
  let error: string | null = null
  let warning: string | null = null
  const errors: ConstructionIssue[] = []
  const warnings: ConstructionIssue[] = []
  if (size[2] < minStrawSpace) {
    warning = 'Not enough vertical space to fill with straw'
  }

  if (startsWithStand || endsWithStand) {
    if (size[0] < postWidth) {
      error = 'Not enough space for a post'
    } else if (size[0] === postWidth) {
      return constructPost(position, size, config.posts, resolveMaterial)
    } else if (startsWithStand && endsWithStand && size[0] < 2 * postWidth) {
      error = 'Space for more than one post, but not enough for two'
    }
  }

  const parts: ConstructionElement[] = []

  let left = position[0]
  let width = size[0]

  if (startsWithStand) {
    const {
      it: startPost,
      errors: postErrors,
      warnings: postWarnings
    } = constructPost(position, size, config.posts, resolveMaterial)
    parts.push(...startPost)
    errors.push(...postErrors)
    warnings.push(...postWarnings)
    left += postWidth
    width -= postWidth
  }

  if (endsWithStand) {
    const {
      it: endPost,
      errors: postErrors,
      warnings: postWarnings
    } = constructPost(
      [(position[0] + size[0] - postWidth) as Length, position[1], position[2]],
      size,
      config.posts,
      resolveMaterial
    )
    parts.push(...endPost)
    errors.push(...postErrors)
    warnings.push(...postWarnings)
    width -= postWidth
  }

  const inbetweenPosition: Vec3 = [left, position[1], position[2]]
  const inbetweenSize: Vec3 = [width, size[1], size[2]]

  constructInfillRecursive(
    inbetweenPosition,
    inbetweenSize,
    config,
    resolveMaterial,
    parts,
    warnings,
    errors,
    !startAtEnd
  )

  if (warning) {
    warnings.push({ description: warning, elements: parts.map(p => p.id) })
  }

  if (error) {
    errors.push({ description: error, elements: parts.map(p => p.id) })
  }

  return { it: parts, errors, warnings }
}

function constructInfillRecursive(
  position: Vec3,
  size: Vec3,
  config: InfillConstructionConfig,
  resolveMaterial: ResolveMaterialFunction,
  elements: ConstructionElement[],
  warnings: ConstructionIssue[],
  errors: ConstructionIssue[],
  atStart: boolean
): void {
  const baleWidth = getBaleWidth(size[0] as Length, config)

  const strawPosition: Vec3 = [atStart ? position[0] : position[0] + size[0] - baleWidth, position[1], position[2]]
  const strawSize: Vec3 = [baleWidth, size[1], size[2]]

  if (baleWidth > 0) {
    const {
      it: strawElements,
      errors: strawErrors,
      warnings: strawWarnings
    } = constructStraw(strawPosition, strawSize, config.straw)
    elements.push(...strawElements)
    errors.push(...strawErrors)
    warnings.push(...strawWarnings)

    if (baleWidth < config.minStrawSpace) {
      warnings.push({ description: 'Not enough space for infilling straw', elements: strawElements.map(s => s.id) })
    }
  }

  let postOffset: Length
  if (baleWidth + config.posts.width <= size[0]) {
    postOffset = atStart
      ? ((strawPosition[0] + strawSize[0]) as Length)
      : ((strawPosition[0] - config.posts.width) as Length)
    const {
      it: post,
      errors: postErrors,
      warnings: postWarnings
    } = constructPost([postOffset, position[1], position[2]], size, config.posts, resolveMaterial)
    elements.push(...post)
    errors.push(...postErrors)
    warnings.push(...postWarnings)
  } else {
    return
  }

  const remainingPosition = [atStart ? postOffset + config.posts.width : position[0], position[1], position[2]]
  const remainingSize = [size[0] - strawSize[0] - config.posts.width, size[1], size[2]]

  constructInfillRecursive(
    remainingPosition,
    remainingSize,
    config,
    resolveMaterial,
    elements,
    warnings,
    errors,
    !atStart
  )
}

function getBaleWidth(availableWidth: Length, config: InfillConstructionConfig): Length {
  const {
    maxPostSpacing,
    minStrawSpace,
    posts: { width: postWidth }
  } = config
  const fullBaleAndPost = maxPostSpacing + postWidth

  // Less space than full bale
  if (availableWidth < maxPostSpacing) {
    return availableWidth
  }

  // Not enough space for full bale and a minimal spacer, but more than a single full bale + post
  // -> Shorten the bale so that a post and a minimal spacer fit
  if (availableWidth < fullBaleAndPost + minStrawSpace && availableWidth > fullBaleAndPost) {
    return (availableWidth - minStrawSpace - postWidth) as Length
  }

  // More space than a full bale, but not enough for full bale and post
  // -> Shorten bale to fit a post
  if (availableWidth < fullBaleAndPost) {
    return (availableWidth - postWidth) as Length
  }

  return maxPostSpacing
}

export const constructInfillWall: PerimeterWallConstructionMethod<InfillConstructionConfig> = (
  wall: PerimeterWall,
  floorHeight: Length,
  config: InfillConstructionConfig
): WallConstructionPlan => {
  // Using imported functions

  const errors: ConstructionIssue[] = []
  const warnings: ConstructionIssue[] = []
  const segments: ConstructionSegment[] = []

  // Segment the wall based on openings
  const wallSegments = segmentWall(wall, floorHeight)

  for (const segment of wallSegments) {
    if (segment.type === 'wall') {
      // Construct infill wall segment - segment already has Vec3 position and size
      const {
        it: wallElements,
        errors: wallErrors,
        warnings: wallWarnings
      } = infillWallArea(
        segment.position,
        segment.size,
        config,
        resolveDefaultMaterial,
        true, // startsWithStand
        true, // endsWithStand
        false // startAtEnd
      )

      const wallConstruction: WallConstructionSegment = {
        id: createConstructionElementId(),
        type: 'wall',
        position: segment.position[0] as Length,
        width: segment.size[0] as Length,
        constructionType: 'infill',
        elements: wallElements
      }

      segments.push(wallConstruction)
      errors.push(...wallErrors)
      warnings.push(...wallWarnings)
    } else if (segment.type === 'opening' && segment.openings) {
      // Construct opening segment - use first opening's type for configuration
      // (all openings in a merged segment must be same type for now)
      const openingType = segment.openings[0].type
      const openingConfig = config.openings[openingType]

      const {
        it: openingConstruction,
        errors: openingErrors,
        warnings: openingWarnings
      } = constructOpening(segment, openingConfig, config, resolveDefaultMaterial)

      segments.push(openingConstruction)
      errors.push(...openingErrors)
      warnings.push(...openingWarnings)
    }
  }

  return {
    wallId: wall.id,
    constructionType: 'infill',
    wallDimensions: {
      length: wall.insideLength,
      thickness: wall.thickness,
      height: floorHeight
    },
    segments,
    errors,
    warnings
  }
}
