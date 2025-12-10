import { IDENTITY, type WallConstructionArea } from '@/construction/geometry'
import { yieldMeasurementFromArea } from '@/construction/measurements'
import type { OpeningAssembly, SimpleOpeningConfig } from '@/construction/openings/types'
import { type ConstructionResult, yieldArea, yieldElement, yieldError } from '@/construction/results'
import { createElementFromArea } from '@/construction/shapes'
import {
  TAG_HEADER,
  TAG_HEADER_FROM_TOP,
  TAG_HEADER_HEIGHT,
  TAG_OPENING_DOOR,
  TAG_OPENING_HEIGHT,
  TAG_OPENING_WIDTH,
  TAG_OPENING_WINDOW,
  TAG_SILL,
  TAG_SILL_HEIGHT
} from '@/construction/tags'
import type { InfillMethod } from '@/construction/walls'
import { type Length } from '@/shared/geometry'
import { formatLength } from '@/shared/utils/formatting'
import type { OpeningConstructionDimensions } from '@/shared/utils/openingDimensions'

export class SimpleOpeningAssembly implements OpeningAssembly<SimpleOpeningConfig> {
  *construct(
    area: WallConstructionArea,
    openings: OpeningConstructionDimensions[],
    zOffset: Length,
    config: SimpleOpeningConfig,
    infill: InfillMethod
  ): Generator<ConstructionResult> {
    const wallBottom = area.position[2]
    const wallTop = area.bounds.max[2]

    const { sillTop, headerBottom } = this.extractUnifiedDimensions(openings, zOffset)
    const sillBottom = sillTop - config.sillThickness
    const headerTop = headerBottom + config.headerThickness

    const [belowHeader, topPart] = area.splitInZ(headerBottom)
    const [bottomPart, rawOpeningArea] = belowHeader.splitInZ(sillTop)
    const [belowSill, sillArea] = bottomPart.splitInZ(sillBottom)
    const [headerArea, aboveHeader] = topPart.splitInZ(config.headerThickness)

    if (headerBottom > wallTop) {
      yield yieldError(`Opening is higher than the wall by ${formatLength(headerBottom - wallTop)}`, [])
    }

    yield* yieldMeasurementFromArea(rawOpeningArea, 'width', [TAG_OPENING_WIDTH])

    if (!headerArea.isEmpty) {
      const headerElement = createElementFromArea(headerArea, config.headerMaterial, [TAG_HEADER], 'header')
      yield* yieldElement(headerElement)

      yield* yieldMeasurementFromArea(belowHeader, 'height', [TAG_HEADER_HEIGHT], -1)
      yield* yieldMeasurementFromArea(topPart, 'height', [TAG_HEADER_FROM_TOP], -1)

      if (headerTop > wallTop) {
        yield yieldError(
          `Header does not fit: needs ${formatLength(config.headerThickness)} but only ${formatLength(wallTop - headerBottom)} available`,
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
          `Sill does not fit: needs ${formatLength(config.sillThickness)} but only ${formatLength(sillTop)} available`,
          [sillElement]
        )
      }
    }

    for (const opening of openings) {
      const openingOffsetInSegment = opening.offsetFromStart - rawOpeningArea.position[0]
      const openingArea = rawOpeningArea
        .withXAdjustment(openingOffsetInSegment + config.padding, opening.width - 2 * config.padding)
        .withZAdjustment(config.padding, opening.height - 2 * config.padding)

      const tags = opening.type === 'door' ? [TAG_OPENING_DOOR] : opening.type === 'window' ? [TAG_OPENING_WINDOW] : []
      const label = opening.type === 'door' ? 'Door' : opening.type === 'window' ? 'Window' : 'Passage'

      yield yieldArea({
        type: 'cuboid',
        areaType: opening.type,
        label,
        bounds: openingArea.bounds,
        transform: IDENTITY,
        tags,
        renderPosition: 'bottom'
      })
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

  private extractUnifiedDimensions(
    openings: OpeningConstructionDimensions[],
    zOffset: Length
  ): {
    sillTop: Length
    headerBottom: Length
  } {
    // All openings in a segment have same sill/header heights (guaranteed by segmentWall)
    const firstOpening = openings[0]
    // Apply zOffset to convert from finished floor coordinates to wall construction coordinates
    const sillTop = (firstOpening.sillHeight ?? 0) + zOffset
    const headerBottom = sillTop + firstOpening.height

    return { sillTop, headerBottom }
  }
}
