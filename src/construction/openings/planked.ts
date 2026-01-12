import { type WallConstructionArea } from '@/construction/geometry'
import { yieldMeasurementFromArea } from '@/construction/measurements'
import { BaseOpeningAssembly } from '@/construction/openings/base'
import type { PlankedOpeningConfig } from '@/construction/openings/types'
import { type ConstructionResult, yieldElement, yieldError } from '@/construction/results'
import { createElementFromArea } from '@/construction/shapes'
import {
  TAG_HEADER,
  TAG_HEADER_FROM_TOP,
  TAG_HEADER_HEIGHT,
  TAG_OPENING_HEIGHT,
  TAG_OPENING_SIDE_PLANK,
  TAG_OPENING_WIDTH,
  TAG_SILL,
  TAG_SILL_HEIGHT
} from '@/construction/tags'
import type { InfillMethod } from '@/construction/walls'
import { type Length } from '@/shared/geometry'

export class PlankedOpeningAssembly extends BaseOpeningAssembly<PlankedOpeningConfig> {
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

    const [leftPlank, rest] = rawOpeningArea.splitInX(this.config.plankThickness)
    const [middle, rightPlank] = rest.splitInX(rest.size[0] - this.config.plankThickness)

    yield* yieldElement(
      createElementFromArea(leftPlank, this.config.plankMaterial, [TAG_OPENING_SIDE_PLANK], {
        type: 'side-plank'
      })
    )
    yield* yieldElement(
      createElementFromArea(rightPlank, this.config.plankMaterial, [TAG_OPENING_SIDE_PLANK], {
        type: 'side-plank'
      })
    )

    if (adjustedHeader > wallTop) {
      yield yieldError($ => $.construction.opening.heightExceedsWall, { excess: adjustedHeader - wallTop }, [])
    }

    yield* yieldMeasurementFromArea(middle, 'width', [TAG_OPENING_WIDTH])

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
          $ => $.construction.opening.headerDoesNotFit,
          { required: this.config.headerThickness, available: wallTop - adjustedHeader },
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
        yield* yieldMeasurementFromArea(middle, 'height', [TAG_OPENING_HEIGHT], 1, false)
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
      yield* infill(aboveHeader)
    }

    // Create wall below sill/opening (if space remains)
    if (!belowSill.isEmpty) {
      yield* infill(belowSill)
    }
  }

  get segmentationPadding(): Length {
    return this.config.plankThickness
  }

  readonly needsWallStands = true
}
