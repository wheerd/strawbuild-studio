import type { Perimeter, PerimeterWall } from '@/building/model/model'
import type { LayersConfig } from '@/construction/config/types'
import type { ConstructionElementId } from '@/construction/elements'
import { resolveDefaultMaterial } from '@/construction/materials/material'
import type { ResolveMaterialFunction } from '@/construction/materials/material'
import { type PostConfig, constructPost } from '@/construction/materials/posts'
import { constructStraw } from '@/construction/materials/straw'
import type { ConstructionModel, HighlightedArea } from '@/construction/model'
import { constructOpeningFrame } from '@/construction/openings/openings'
import type { ConstructionResult } from '@/construction/results'
import { aggregateResults, yieldAndCollectElementIds, yieldError, yieldWarning } from '@/construction/results'
import type {
  BaseConstructionConfig,
  PerimeterWallConstructionMethod,
  WallCornerInfo
} from '@/construction/walls/construction'
import { calculateWallConstructionLength, calculateWallCornerInfo } from '@/construction/walls/corners/corners'
import { segmentWall } from '@/construction/walls/segmentation'
import { type Length, type Vec3, mergeBounds } from '@/shared/geometry'

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

function* createCornerAreas(
  cornerInfo: WallCornerInfo,
  wallLength: Length,
  wallHeight: Length
): Generator<HighlightedArea> {
  if (cornerInfo.startCorner) {
    yield {
      label: 'Corner',
      size: [cornerInfo.startCorner.extensionDistance, 0, wallHeight],
      transform: {
        position: [
          cornerInfo.startCorner.constructedByThisWall
            ? 0 // Overlap: starts at wall beginning
            : -cornerInfo.startCorner.extensionDistance, // Adjacent: before wall
          0,
          0
        ],
        rotation: [0, 0, 0]
      }
    }
  }
  if (cornerInfo.endCorner) {
    yield {
      label: 'Corner',
      size: [cornerInfo.endCorner.extensionDistance, 0, wallHeight],
      transform: {
        position: [
          cornerInfo.endCorner.constructedByThisWall
            ? wallLength - cornerInfo.endCorner.extensionDistance // Overlap: extends backward from wall end
            : wallLength, // Adjacent: after wall end
          0,
          0
        ],
        rotation: [0, 0, 0]
      }
    }
  }
}

export const constructInfillWall: PerimeterWallConstructionMethod<InfillConstructionConfig> = (
  wall: PerimeterWall,
  perimeter: Perimeter,
  floorHeight: Length,
  config: InfillConstructionConfig,
  layers: LayersConfig
): ConstructionModel => {
  // Calculate corner information and construction length including assigned corners
  const cornerInfo = calculateWallCornerInfo(wall, perimeter)
  const cornerAreas = createCornerAreas(cornerInfo, wall.wallLength, floorHeight)
  const { startCorner, endCorner } = cornerInfo
  const startCornerData = startCorner ? (perimeter.corners.find(c => c.id === startCorner.id) ?? null) : null
  const endCornerData = endCorner ? (perimeter.corners.find(c => c.id === endCorner.id) ?? null) : null
  const { constructionLength, startExtension } = calculateWallConstructionLength(wall, startCornerData, endCornerData)

  // Segment the wall based on openings, using the actual construction length
  const wallSegments = segmentWall(wall, floorHeight, constructionLength, startExtension, layers)

  const allResults: ConstructionResult[] = []

  for (const segment of wallSegments) {
    if (segment.type === 'wall') {
      allResults.push(
        ...infillWallArea(
          segment.position,
          segment.size,
          config,
          resolveDefaultMaterial,
          true, // startsWithStand
          true, // endsWithStand
          false // startAtEnd
        )
      )
    } else if (segment.type === 'opening' && segment.openings) {
      // Construct opening segment - use first opening's type for configuration
      // (all openings in a merged segment must be same type for now)
      // TODO: Refactor opening config
      const openingType = segment.openings[0].type
      const openingConfig = config.openings[openingType]

      allResults.push(...constructOpeningFrame(segment, openingConfig, config, resolveDefaultMaterial))
    }
  }

  const aggRes = aggregateResults(allResults)

  return {
    bounds: mergeBounds(...aggRes.elements.map(e => e.bounds)),
    elements: aggRes.elements,
    measurements: aggRes.measurements,
    areas: [...aggRes.areas, ...cornerAreas],
    errors: aggRes.errors,
    warnings: aggRes.warnings
  }
}
