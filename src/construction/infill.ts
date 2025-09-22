import type { PerimeterWall, Perimeter } from '@/model'
import type { Length, Vec3 } from '@/types/geometry'
import { constructPost, type PostConfig } from './posts'
import type {
  BaseConstructionConfig,
  ConstructionElementId,
  ConstructionIssue,
  ConstructionResult,
  ConstructionSegment,
  Measurement,
  PerimeterWallConstructionMethod,
  WallConstructionPlan,
  WallConstructionSegment
} from './base'
import {
  segmentWall,
  createConstructionElementId,
  aggregateResults,
  yieldError,
  yieldWarning,
  yieldAndCollectElementIds
} from './base'
import { constructOpening } from './openings'
import { resolveDefaultMaterial } from './material'
import type { ResolveMaterialFunction } from './material'
import { constructStraw } from './straw'
import { calculatePostSpacingMeasurements, calculateOpeningSpacingMeasurements } from './measurements'
import { calculateWallCornerInfo, calculateWallConstructionLength } from './corners'

export interface InfillConstructionConfig extends BaseConstructionConfig {
  type: 'infill'
  maxPostSpacing: Length // Default: 800mm
  minStrawSpace: Length // Default: 70mm
  posts: PostConfig // Default: full
}

export function* infillWallArea(
  position: Vec3,
  size: Vec3,
  config: InfillConstructionConfig,
  resolveMaterial: ResolveMaterialFunction,
  startsWithStand = false,
  endsWithStand = false,
  startAtEnd = false
): Generator<ConstructionResult> {
  const { minStrawSpace } = config
  const { width: postWidth } = config.posts
  let error: string | null = null
  let warning: string | null = null
  const allElementIds: ConstructionElementId[] = []

  if (size[2] < minStrawSpace) {
    warning = 'Not enough vertical space to fill with straw'
  }

  if (startsWithStand || endsWithStand) {
    if (size[0] < postWidth) {
      error = 'Not enough space for a post'
    } else if (size[0] === postWidth) {
      yield* constructPost(position, size, config.posts, resolveMaterial)
      return
    } else if (startsWithStand && endsWithStand && size[0] < 2 * postWidth) {
      error = 'Space for more than one post, but not enough for two'
    }
  }

  let left = position[0]
  let width = size[0]

  if (startsWithStand) {
    yield* yieldAndCollectElementIds(constructPost(position, size, config.posts, resolveMaterial), allElementIds)
    left += postWidth
    width -= postWidth
  }

  if (endsWithStand) {
    yield* yieldAndCollectElementIds(
      constructPost(
        [(position[0] + size[0] - postWidth) as Length, position[1], position[2]],
        size,
        config.posts,
        resolveMaterial
      ),
      allElementIds
    )
    width -= postWidth
  }

  const inbetweenPosition: Vec3 = [left, position[1], position[2]]
  const inbetweenSize: Vec3 = [width, size[1], size[2]]

  yield* yieldAndCollectElementIds(
    constructInfillRecursive(inbetweenPosition, inbetweenSize, config, resolveMaterial, !startAtEnd),
    allElementIds
  )

  // Add warning/error with references to all created elements
  if (warning) {
    yield yieldWarning({ description: warning, elements: allElementIds })
  }

  if (error) {
    yield yieldError({ description: error, elements: allElementIds })
  }
}

function* constructInfillRecursive(
  position: Vec3,
  size: Vec3,
  config: InfillConstructionConfig,
  resolveMaterial: ResolveMaterialFunction,
  atStart: boolean
): Generator<ConstructionResult> {
  const baleWidth = getBaleWidth(size[0] as Length, config)

  const strawPosition: Vec3 = [atStart ? position[0] : position[0] + size[0] - baleWidth, position[1], position[2]]
  const strawSize: Vec3 = [baleWidth, size[1], size[2]]

  if (baleWidth > 0) {
    const strawElementIds: ConstructionElementId[] = []

    yield* yieldAndCollectElementIds(constructStraw(strawPosition, strawSize, config.straw), strawElementIds)

    if (baleWidth < config.minStrawSpace) {
      yield yieldWarning({
        description: 'Not enough space for infilling straw',
        elements: strawElementIds
      })
    }
  }

  let postOffset: Length
  if (baleWidth + config.posts.width <= size[0]) {
    postOffset = atStart
      ? ((strawPosition[0] + strawSize[0]) as Length)
      : ((strawPosition[0] - config.posts.width) as Length)

    yield* constructPost([postOffset, position[1], position[2]], size, config.posts, resolveMaterial)
  } else {
    return
  }

  const remainingPosition = [atStart ? postOffset + config.posts.width : position[0], position[1], position[2]]
  const remainingSize = [size[0] - strawSize[0] - config.posts.width, size[1], size[2]]

  yield* constructInfillRecursive(remainingPosition, remainingSize, config, resolveMaterial, !atStart)
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
  perimeter: Perimeter,
  floorHeight: Length,
  config: InfillConstructionConfig
): WallConstructionPlan => {
  // Using imported functions

  const errors: ConstructionIssue[] = []
  const warnings: ConstructionIssue[] = []
  const segments: ConstructionSegment[] = []
  const allMeasurements: Measurement[] = []

  // Calculate corner information and construction length including assigned corners
  const cornerInfo = calculateWallCornerInfo(wall, perimeter)
  const { startCorner, endCorner } = cornerInfo
  const startCornerData = startCorner ? (perimeter.corners.find(c => c.id === startCorner.id) ?? null) : null
  const endCornerData = endCorner ? (perimeter.corners.find(c => c.id === endCorner.id) ?? null) : null
  const { constructionLength, startExtension } = calculateWallConstructionLength(wall, startCornerData, endCornerData)

  // Segment the wall based on openings, using the actual construction length
  const wallSegments = segmentWall(wall, floorHeight, constructionLength, startExtension)

  for (const segment of wallSegments) {
    if (segment.type === 'wall') {
      // Construct infill wall segment - segment already has Vec3 position and size
      const wallResults = [
        ...infillWallArea(
          segment.position,
          segment.size,
          config,
          resolveDefaultMaterial,
          true, // startsWithStand
          true, // endsWithStand
          false // startAtEnd
        )
      ]

      const { elements: wallElements, errors: wallErrors, warnings: wallWarnings } = aggregateResults(wallResults)

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

      const openingResults = [...constructOpening(segment, openingConfig, config, resolveDefaultMaterial)]
      const {
        elements: openingElements,
        measurements: openingMeasurements,
        errors: openingErrors,
        warnings: openingWarnings
      } = aggregateResults(openingResults)

      // Note: constructOpening now yields elements directly, but the original returned an OpeningConstruction
      // For now, we'll create a placeholder segment structure - this needs to be addressed in the full migration
      const openingConstruction = {
        id: createConstructionElementId(),
        type: 'opening' as const,
        position: segment.position[0] as Length,
        width: segment.size[0] as Length,
        openingIds: segment.openings?.map(o => o.id) ?? [],
        elements: openingElements
      }

      segments.push(openingConstruction)
      errors.push(...openingErrors)
      warnings.push(...openingWarnings)

      // Collect measurements generated during opening construction
      allMeasurements.push(...openingMeasurements)
    }
  }

  // Calculate remaining measurements (post spacing and opening spacing)
  const allElements = segments.flatMap(s => s.elements)
  const postSpacingMeasurements = calculatePostSpacingMeasurements(allElements)
  const openingSpacingMeasurements = calculateOpeningSpacingMeasurements(segments, constructionLength, floorHeight)

  // Combine generated measurements with calculated ones
  const measurements = [...allMeasurements, ...postSpacingMeasurements, ...openingSpacingMeasurements]

  return {
    wallId: wall.id,
    constructionType: 'infill',
    wallDimensions: {
      length: constructionLength,
      boundaryLength: wall.wallLength,
      thickness: wall.thickness,
      height: floorHeight
    },
    segments,
    measurements,
    cornerInfo,
    errors,
    warnings
  }
}
