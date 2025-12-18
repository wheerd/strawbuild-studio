import { vec3 } from 'gl-matrix'

import { getConfigActions } from '@/construction/config'
import type { GroupOrElement } from '@/construction/elements'
import { WallConstructionArea } from '@/construction/geometry'
import type { StrawbaleMaterial } from '@/construction/materials/material'
import { constructPost } from '@/construction/materials/posts'
import { getMaterialById } from '@/construction/materials/store'
import { constructStraw } from '@/construction/materials/straw'
import { yieldMeasurementFromArea } from '@/construction/measurements'
import type { ConstructionResult } from '@/construction/results'
import { yieldAndCollectElements, yieldElement, yieldError, yieldWarning } from '@/construction/results'
import { createElementFromArea } from '@/construction/shapes'
import { TAG_POST_SPACING } from '@/construction/tags'
import type { InfillWallSegmentConfig } from '@/construction/walls'
import { type Length } from '@/shared/geometry'

export function* infillWallArea(
  area: WallConstructionArea,
  config: InfillWallSegmentConfig,
  startsWithStand = false,
  endsWithStand = false,
  startAtEnd = false
): Generator<ConstructionResult> {
  const { size } = area
  const { minStrawSpace } = config
  const { width: postWidth } = config.posts
  let error: string | null = null
  let warning: string | null = null
  const allElements: GroupOrElement[] = []

  if (size[2] < minStrawSpace && !config.infillMaterial) {
    warning = 'Not enough vertical space to fill with straw'
  }

  if (startsWithStand || endsWithStand) {
    if (size[0] < postWidth) {
      error = 'Not enough space for a post'
    } else if (size[0] === postWidth) {
      yield* constructPost(area, config.posts)
      return
    } else if (startsWithStand && endsWithStand && size[0] < 2 * postWidth) {
      error = 'Space for more than one post, but not enough for two'
    }
  }

  let inbetweenArea = area

  if (startsWithStand) {
    const [postArea, remainingArea] = inbetweenArea.splitInX(config.posts.width)
    inbetweenArea = remainingArea
    yield* yieldAndCollectElements(constructPost(postArea, config.posts), allElements)
  }

  if (endsWithStand) {
    const [remainingArea, postArea] = inbetweenArea.splitInX(inbetweenArea.size[0] - config.posts.width)
    inbetweenArea = remainingArea
    yield* yieldAndCollectElements(constructPost(postArea, config.posts), allElements)
  }

  const strawMaterialId = config.strawMaterial ?? getConfigActions().getDefaultStrawMaterial()
  const strawMaterial = getMaterialById(strawMaterialId)
  const strawbaleMaterial = strawMaterial?.type === 'strawbale' ? strawMaterial : undefined

  if ((inbetweenArea.size[2] < minStrawSpace || inbetweenArea.size[0] < minStrawSpace) && config.infillMaterial) {
    yield* yieldAndCollectElements(
      yieldElement(createElementFromArea(inbetweenArea, config.infillMaterial)),
      allElements
    )
    if (inbetweenArea.size[2] < minStrawSpace) {
      yield* yieldMeasurementFromArea(inbetweenArea, 'height')
    }
    if (inbetweenArea.size[0] < minStrawSpace) {
      yield* yieldMeasurementFromArea(inbetweenArea, 'width', [TAG_POST_SPACING])
    }
  } else {
    yield* yieldAndCollectElements(
      constructInfillRecursive(inbetweenArea, config, !startAtEnd, strawbaleMaterial),
      allElements
    )
  }

  // Add warning/error with references to all created elements
  if (warning) {
    yield yieldWarning(warning, allElements)
  }

  if (error) {
    yield yieldError(error, allElements)
  }
}

function* constructInfillRecursive(
  area: WallConstructionArea,
  config: InfillWallSegmentConfig,
  atStart: boolean,
  strawbaleMaterial?: StrawbaleMaterial
): Generator<ConstructionResult> {
  const { size } = area
  const baleWidth = getBaleWidth(size, config, strawbaleMaterial)

  if (baleWidth > 0) {
    const strawElements: GroupOrElement[] = []
    const strawArea = area.withXAdjustment(atStart ? 0 : size[0] - baleWidth, baleWidth)
    yield* yieldAndCollectElements(constructStraw(strawArea, config.strawMaterial), strawElements)

    if (baleWidth < config.minStrawSpace) {
      yield yieldWarning('Not enough space for infilling straw', strawElements)
    }

    yield* yieldMeasurementFromArea(strawArea, 'width', [TAG_POST_SPACING])
  }

  if (baleWidth + config.posts.width <= size[0]) {
    const postArea = area.withXAdjustment(
      atStart ? baleWidth : size[0] - baleWidth - config.posts.width,
      config.posts.width
    )
    yield* constructPost(postArea, config.posts)
  } else {
    return
  }

  const remainingArea = atStart
    ? area.withXAdjustment(baleWidth + config.posts.width)
    : area.withXAdjustment(0, size[0] - baleWidth - config.posts.width)

  yield* constructInfillRecursive(remainingArea, config, !atStart, strawbaleMaterial)
}

function getBaleWidth(
  availableSpace: vec3,
  config: InfillWallSegmentConfig,
  strawbaleMaterial?: StrawbaleMaterial
): Length {
  const [availableWidth, , availableHeight] = availableSpace
  const {
    desiredPostSpacing,
    maxPostSpacing,
    minStrawSpace,
    posts: { width: postWidth }
  } = config
  const baleHeight = strawbaleMaterial?.baleHeight ?? 0
  const baleMinLength = strawbaleMaterial?.baleMinLength ?? 0
  const baleMaxLength = strawbaleMaterial?.baleMaxLength ?? 0
  const topCutoffLimit = strawbaleMaterial?.topCutoffLimit ?? 0
  const tolerance = strawbaleMaterial?.tolerance ?? 0
  const goVertical =
    baleHeight - topCutoffLimit > availableHeight ||
    (availableHeight > baleMinLength - tolerance && availableHeight < baleMaxLength + tolerance)

  const desiredSpacing = goVertical ? baleHeight : desiredPostSpacing
  const fullBaleAndPost = desiredSpacing + postWidth
  const maxSpacing = goVertical ? baleHeight : maxPostSpacing

  // Less space than full bale
  if (availableWidth < maxSpacing) {
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

  return desiredSpacing
}
