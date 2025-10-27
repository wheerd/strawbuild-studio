import { vec3 } from 'gl-matrix'

import type { Opening, Perimeter, PerimeterWall } from '@/building/model/model'
import type { ConstructionElementId } from '@/construction/elements'
import { constructPost } from '@/construction/materials/posts'
import { constructStraw } from '@/construction/materials/straw'
import type { ConstructionModel } from '@/construction/model'
import { constructOpeningFrame } from '@/construction/openings/openings'
import type { ConstructionResult } from '@/construction/results'
import {
  aggregateResults,
  yieldAndCollectElementIds,
  yieldError,
  yieldMeasurement,
  yieldWarning
} from '@/construction/results'
import { TAG_POST_SPACING } from '@/construction/tags'
import type { InfillWallConfig, InfillWallSegmentConfig, WallAssembly } from '@/construction/walls'
import { type WallStoreyContext, segmentedWallConstruction } from '@/construction/walls/segmentation'
import { type Length, boundsFromCuboid, mergeBounds } from '@/shared/geometry'

export function* infillWallArea(
  position: vec3,
  size: vec3,
  config: InfillWallSegmentConfig,
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
      yield* constructPost(position, size, config.posts)
      return
    } else if (startsWithStand && endsWithStand && size[0] < 2 * postWidth) {
      error = 'Space for more than one post, but not enough for two'
    }
  }

  let left = position[0]
  let width = size[0]

  if (startsWithStand) {
    yield* yieldAndCollectElementIds(constructPost(position, size, config.posts), allElementIds)
    left += postWidth
    width -= postWidth
  }

  if (endsWithStand) {
    yield* yieldAndCollectElementIds(
      constructPost([position[0] + size[0] - postWidth, position[1], position[2]], size, config.posts),
      allElementIds
    )
    width -= postWidth
  }

  const inbetweenPosition = vec3.fromValues(left, position[1], position[2])
  const inbetweenSize = vec3.fromValues(width, size[1], size[2])

  yield* yieldAndCollectElementIds(
    constructInfillRecursive(inbetweenPosition, inbetweenSize, config, !startAtEnd),
    allElementIds
  )

  // Add warning/error with references to all created elements
  if (warning) {
    yield yieldWarning({ description: warning, elements: allElementIds, bounds: boundsFromCuboid(position, size) })
  }

  if (error) {
    yield yieldError({ description: error, elements: allElementIds, bounds: boundsFromCuboid(position, size) })
  }
}

function* constructInfillRecursive(
  position: vec3,
  size: vec3,
  config: InfillWallSegmentConfig,
  atStart: boolean
): Generator<ConstructionResult> {
  const baleWidth = getBaleWidth(size[0], config)

  const strawPosition = vec3.fromValues(
    atStart ? position[0] : position[0] + size[0] - baleWidth,
    position[1],
    position[2]
  )
  const strawSize = vec3.fromValues(baleWidth, size[1], size[2])

  if (baleWidth > 0) {
    const strawElementIds: ConstructionElementId[] = []

    yield* yieldAndCollectElementIds(constructStraw(strawPosition, strawSize), strawElementIds)

    if (baleWidth < config.minStrawSpace) {
      yield yieldWarning({
        description: 'Not enough space for infilling straw',
        elements: strawElementIds,
        bounds: boundsFromCuboid(strawPosition, strawSize)
      })
    }

    yield yieldMeasurement({
      startPoint: strawPosition,
      endPoint: vec3.fromValues(strawPosition[0] + strawSize[0], strawPosition[1], strawPosition[2]),
      size: strawSize,
      tags: [TAG_POST_SPACING]
    })
  }

  let postOffset: Length
  if (baleWidth + config.posts.width <= size[0]) {
    postOffset = atStart ? strawPosition[0] + strawSize[0] : strawPosition[0] - config.posts.width

    yield* constructPost([postOffset, position[1], position[2]], size, config.posts)
  } else {
    return
  }

  const remainingPosition = [atStart ? postOffset + config.posts.width : position[0], position[1], position[2]]
  const remainingSize = [size[0] - strawSize[0] - config.posts.width, size[1], size[2]]

  yield* constructInfillRecursive(remainingPosition, remainingSize, config, !atStart)
}

function getBaleWidth(availableWidth: Length, config: InfillWallSegmentConfig): Length {
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
    return availableWidth - minStrawSpace - postWidth
  }

  // More space than a full bale, but not enough for full bale and post
  // -> Shorten bale to fit a post
  if (availableWidth < fullBaleAndPost) {
    return availableWidth - postWidth
  }

  return maxPostSpacing
}

export class InfillWallAssembly implements WallAssembly<InfillWallConfig> {
  construct(
    wall: PerimeterWall,
    perimeter: Perimeter,
    storeyContext: WallStoreyContext,
    config: InfillWallConfig
  ): ConstructionModel {
    const allResults = Array.from(
      segmentedWallConstruction(
        wall,
        perimeter,
        storeyContext,
        config.layers,
        (position, size, startsWithStand, endsWithStand, startAtEnd) =>
          infillWallArea(position, size, config, startsWithStand, endsWithStand, startAtEnd),

        (position: vec3, size: vec3, zOffset: Length, openings: Opening[]) =>
          constructOpeningFrame({ type: 'opening', position, size, zOffset, openings }, config.openings, (p, s) =>
            infillWallArea(p, s, config)
          )
      )
    )

    const aggRes = aggregateResults(allResults)

    return {
      bounds: mergeBounds(...aggRes.elements.map(e => e.bounds)),
      elements: aggRes.elements,
      measurements: aggRes.measurements,
      areas: aggRes.areas,
      errors: aggRes.errors,
      warnings: aggRes.warnings
    }
  }
}
