import { type WallConstructionArea } from '@/construction/geometry'
import { constructPost } from '@/construction/materials/posts'
import { yieldMeasurementFromArea } from '@/construction/measurements'
import type { OpeningAssembly, PostOpeningConfig } from '@/construction/openings/types'
import { type ConstructionResult, yieldElement, yieldError } from '@/construction/results'
import { createElementFromArea } from '@/construction/shapes'
import {
  TAG_HEADER,
  TAG_HEADER_FROM_TOP,
  TAG_HEADER_HEIGHT,
  TAG_OPENING_HEIGHT,
  TAG_OPENING_WIDTH,
  TAG_SILL,
  TAG_SILL_HEIGHT
} from '@/construction/tags'
import type { InfillMethod } from '@/construction/walls'
import { type Length } from '@/shared/geometry'
import { formatLength } from '@/shared/utils/formatting'

export class PostOpeningAssembly implements OpeningAssembly<PostOpeningConfig> {
  *construct(
    area: WallConstructionArea,
    adjustedHeader: Length,
    adjustedSill: Length,
    config: PostOpeningConfig,
    infill: InfillMethod
  ): Generator<ConstructionResult> {
    const wallBottom = area.position[2]
    const wallTop = area.bounds.max[2]

    const sillBottom = adjustedSill - config.sillThickness
    const headerTop = adjustedHeader + config.headerThickness

    const [leftPost, rest] = area.splitInX(config.posts.width)
    const [middle, rightPost] = rest.splitInX(rest.size[0] - config.posts.width)

    yield* constructPost(leftPost, config.posts)
    yield* constructPost(rightPost, config.posts)

    const [belowHeader, topPart] = middle.splitInZ(adjustedHeader)
    const [bottomPart, rawOpeningArea] = belowHeader.splitInZ(adjustedSill)
    const [belowSill, sillArea] = bottomPart.splitInZ(sillBottom)
    const [headerArea, aboveHeader] = topPart.splitInZ(config.headerThickness)

    if (adjustedHeader > wallTop) {
      yield yieldError(`Opening is higher than the wall by ${formatLength(adjustedHeader - wallTop)}`, [])
    }

    yield* yieldMeasurementFromArea(rawOpeningArea, 'width', [TAG_OPENING_WIDTH])

    if (!headerArea.isEmpty) {
      const headerElement = createElementFromArea(headerArea, config.headerMaterial, [TAG_HEADER], 'header')
      yield* yieldElement(headerElement)

      yield* yieldMeasurementFromArea(belowHeader, 'height', [TAG_HEADER_HEIGHT], -1)
      yield* yieldMeasurementFromArea(topPart, 'height', [TAG_HEADER_FROM_TOP], -1)

      if (headerTop > wallTop) {
        yield yieldError(
          `Header does not fit: needs ${formatLength(config.headerThickness)} but only ${formatLength(wallTop - adjustedHeader)} available`,
          [headerElement]
        )
      }
    }

    if (!sillArea.isEmpty) {
      const sillElement = createElementFromArea(sillArea, config.sillMaterial, [TAG_SILL], 'sill')
      yield* yieldElement(sillElement)

      yield* yieldMeasurementFromArea(bottomPart, 'height', [TAG_SILL_HEIGHT], 1, false)

      // Generate opening height measurement if both sill and header exist
      // Otherwise it would be the same as TAG_HEADER_HEIGHT
      if (!headerArea.isEmpty) {
        yield* yieldMeasurementFromArea(rawOpeningArea, 'height', [TAG_OPENING_HEIGHT], 1, false)
      }

      if (sillBottom < wallBottom) {
        yield yieldError(
          `Sill does not fit: needs ${formatLength(config.sillThickness)} but only ${formatLength(adjustedSill)} available`,
          [sillElement]
        )
      }
    }

    // Create wall above header/opening (if space remains)
    if (!aboveHeader.isEmpty) {
      yield* infill(aboveHeader)
    }

    // Create wall below sill/opening (if space remains)
    if (!belowSill.isEmpty) {
      yield* infill(belowSill)
    }
  }

  getSegmentationPadding = (config: PostOpeningConfig) => config.posts.width
  needsWallStands = (config: PostOpeningConfig) => !config.replacePosts
}
