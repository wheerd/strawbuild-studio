import { type WallConstructionArea } from '@/construction/geometry'
import { yieldMeasurementFromArea } from '@/construction/measurements'
import { BaseOpeningAssembly } from '@/construction/openings/base'
import type { SimpleOpeningConfig } from '@/construction/openings/types'
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

export class SimpleOpeningAssembly extends BaseOpeningAssembly<SimpleOpeningConfig> {
  *construct(
    area: WallConstructionArea,
    adjustedHeader: Length,
    adjustedSill: Length,
    infill: InfillMethod
  ): Generator<ConstructionResult> {
    const wallTop = area.size[2]

    const sillBottom = adjustedSill - this.config.sillThickness
    const headerTop = adjustedHeader + this.config.headerThickness

    const [belowHeader, topPart] = area.splitInZ(adjustedHeader)
    const [bottomPart, rawOpeningArea] = belowHeader.splitInZ(adjustedSill)
    const [belowSill, sillArea] = bottomPart.splitInZ(sillBottom)
    const [headerArea, aboveHeader] = topPart.splitInZ(this.config.headerThickness)

    if (adjustedHeader > wallTop) {
      yield yieldError(`Opening is higher than the wall by ${formatLength(adjustedHeader - wallTop)}`, [])
    }

    yield* yieldMeasurementFromArea(rawOpeningArea, 'width', [TAG_OPENING_WIDTH])

    if (!headerArea.isEmpty) {
      const headerElement = createElementFromArea(headerArea, this.config.headerMaterial, [TAG_HEADER], {
        type: 'header',
        requiresSinglePiece: true
      })
      yield* yieldElement(headerElement)

      yield* yieldMeasurementFromArea(belowHeader, 'height', [TAG_HEADER_HEIGHT], -1)
      yield* yieldMeasurementFromArea(topPart, 'height', [TAG_HEADER_FROM_TOP], -1)

      if (headerTop > wallTop) {
        yield yieldError(
          `Header does not fit: needs ${formatLength(this.config.headerThickness)} but only ${formatLength(wallTop - adjustedHeader)} available`,
          [headerElement]
        )
      }
    }

    if (!sillArea.isEmpty) {
      const sillElement = createElementFromArea(sillArea, this.config.sillMaterial, [TAG_SILL], { type: 'sill' })
      yield* yieldElement(sillElement)

      yield* yieldMeasurementFromArea(bottomPart, 'height', [TAG_SILL_HEIGHT], 1, false)

      // Generate opening height measurement if both sill and header exist
      // Otherwise it would be the same as TAG_HEADER_HEIGHT
      if (!headerArea.isEmpty) {
        yield* yieldMeasurementFromArea(rawOpeningArea, 'height', [TAG_OPENING_HEIGHT], 1, false)
      }

      if (sillBottom < 0) {
        yield yieldError(
          `Sill does not fit: needs ${formatLength(this.config.sillThickness)} but only ${formatLength(sillArea.minHeight)} available`,
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

  readonly segmentationPadding = 0 as Length
  readonly needsWallStands = true
}
