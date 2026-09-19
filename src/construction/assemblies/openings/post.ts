import { BaseOpeningAssembly } from '@/construction/assemblies/openings/base'
import type { PostOpeningConfig } from '@/construction/assemblies/openings/types'
import { constructPost } from '@/construction/assemblies/perimeterWalls/posts'
import type { SegmentInfillMethod } from '@/construction/assemblies/perimeterWalls/types'
import { type WallConstructionArea } from '@/construction/assemblies/utils/WallConstructionArea'
import { type ConstructionResult, yieldElement, yieldError } from '@/construction/model/results'
import {
  TAG_HEADER,
  TAG_HEADER_FROM_TOP,
  TAG_HEADER_HEIGHT,
  TAG_OPENING_HEIGHT,
  TAG_OPENING_WIDTH,
  TAG_SILL,
  TAG_SILL_HEIGHT
} from '@/construction/model/tags'
import { type Length } from '@/shared/geometry'

export class PostOpeningAssembly extends BaseOpeningAssembly<PostOpeningConfig> {
  *construct(
    area: WallConstructionArea,
    adjustedHeader: Length,
    adjustedSill: Length,
    infill: SegmentInfillMethod
  ): Generator<ConstructionResult> {
    const wallTop = area.size[2]

    const sillBottom = adjustedSill - this.config.sillThickness
    const headerTop = adjustedHeader + this.config.headerThickness

    let leftPost, rightPost, topPart, belowHeader
    if (this.config.postsSupportHeader === true) {
      let bottom, rest
      ;[bottom, topPart] = area.splitInZ(adjustedHeader)
      ;[leftPost, rest] = bottom.splitInX(this.config.posts.width)
      ;[belowHeader, rightPost] = rest.splitInX(rest.size[0] - this.config.posts.width)
    } else {
      let middle, rest
      ;[leftPost, rest] = area.splitInX(this.config.posts.width)
      ;[middle, rightPost] = rest.splitInX(rest.size[0] - this.config.posts.width)
      ;[belowHeader, topPart] = middle.splitInZ(adjustedHeader)
    }

    yield* constructPost(leftPost, this.config.posts)
    yield* constructPost(rightPost, this.config.posts)

    const [bottomPart, rawOpeningArea] = belowHeader.splitInZ(adjustedSill)
    const [belowSill, sillArea] = bottomPart.splitInZ(sillBottom)
    const [headerArea, aboveHeader] = topPart.splitInZ(this.config.headerThickness)

    if (adjustedHeader > wallTop) {
      yield yieldError($ => $.construction.opening.heightExceedsWall, { excess: adjustedHeader - wallTop }, [])
    }

    yield* rawOpeningArea.yieldMeasurement('width', [TAG_OPENING_WIDTH])

    if (!headerArea.isEmpty) {
      const headerElement = headerArea.extrude(this.config.headerMaterial, [TAG_HEADER], {
        type: 'header',
        requiresSinglePiece: true
      })
      yield* yieldElement(headerElement)

      yield* belowHeader.yieldMeasurement('height', [TAG_HEADER_HEIGHT], -1)
      yield* topPart.yieldMeasurement('height', [TAG_HEADER_FROM_TOP], -1)

      if (headerTop > wallTop) {
        yield yieldError(
          $ => $.construction.opening.headerDoesNotFit,
          { required: this.config.headerThickness, available: wallTop - adjustedHeader },
          [headerElement]
        )
      }
    }

    if (!sillArea.isEmpty) {
      const sillElement = sillArea.extrude(this.config.sillMaterial, [TAG_SILL], { type: 'sill' })
      yield* yieldElement(sillElement)

      yield* bottomPart.yieldMeasurement('height', [TAG_SILL_HEIGHT], 1, false)

      // Generate opening height measurement if both sill and header exist
      // Otherwise it would be the same as TAG_HEADER_HEIGHT
      if (!headerArea.isEmpty) {
        yield* rawOpeningArea.yieldMeasurement('height', [TAG_OPENING_HEIGHT], 1, false)
      }

      if (sillBottom < 0) {
        yield yieldError(
          $ => $.construction.opening.sillDoesNotFit,
          { required: this.config.sillThickness, available: sillArea.minHeight },
          [sillElement]
        )
      }
    }

    // Create wall above header/opening (if space remains)
    if (!aboveHeader.isEmpty) {
      yield* infill(aboveHeader, 'lintel')
    }

    // Create wall below sill/opening (if space remains)
    if (!belowSill.isEmpty) {
      yield* infill(belowSill, 'sill')
    }
  }

  getSegmentationPadding() {
    return this.config.posts.width
  }

  needsWallStands(): boolean {
    return !this.config.replacePosts
  }
}
