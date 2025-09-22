import type { Opening, OpeningId } from '@/model'
import type { Length, Vec3 } from '@/types/geometry'
import { createVec2 } from '@/types/geometry'
import { formatLength } from '@/utils/formatLength'
import type { MaterialId, ResolveMaterialFunction } from './material'
import {
  createCuboidShape,
  createConstructionElement,
  yieldElement,
  yieldError,
  yieldMeasurement,
  type BaseConstructionSegment,
  type ConstructionElement,
  type ConstructionResult,
  type WallSegment3D
} from './base'
import type { InfillConstructionConfig } from './infill'
import { infillWallArea } from './infill'

export interface OpeningConstructionConfig {
  padding: Length // Default: 15mm

  sillThickness?: Length // Default: 60mm
  sillMaterial?: MaterialId

  headerThickness: Length // Default: 60mm
  headerMaterial: MaterialId

  fillingThickness?: Length // Default: 30mm
  fillingMaterial?: MaterialId
}

export interface OpeningConstruction extends BaseConstructionSegment {
  type: 'opening'
  openingIds: OpeningId[] // Array to support merged adjacent openings
}

function extractUnifiedDimensions(openings: Opening[]): {
  sillHeight: Length
  headerHeight: Length
} {
  // All openings in a segment have same sill/header heights (guaranteed by segmentWall)
  const firstOpening = openings[0]
  const sillHeight = (firstOpening.sillHeight ?? 0) as Length
  const headerHeight = (sillHeight + firstOpening.height) as Length

  return { sillHeight, headerHeight }
}

export function* constructOpeningFrame(
  openingSegment: WallSegment3D,
  config: OpeningConstructionConfig,
  infill: InfillConstructionConfig,
  resolveMaterial: ResolveMaterialFunction
): Generator<ConstructionResult> {
  if (openingSegment.type !== 'opening' || !openingSegment.openings) {
    throw new Error('constructOpeningFrame requires an opening segment with openings array')
  }

  const openings = openingSegment.openings
  const segmentPosition = openingSegment.position
  const segmentSize = openingSegment.size
  const wallHeight = segmentSize[2]
  const wallThickness = segmentSize[1]

  const { sillHeight, headerHeight } = extractUnifiedDimensions(openings)

  // Check if header is required and fits
  const isOpeningAtWallTop = headerHeight >= wallHeight
  const headerRequired = !isOpeningAtWallTop

  if (headerRequired) {
    const headerBottom = headerHeight
    const headerTop = (headerBottom + config.headerThickness) as Length

    // Create single header spanning entire segment width
    const headerElement: ConstructionElement = createConstructionElement(
      'header',
      config.headerMaterial,
      createCuboidShape(
        [segmentPosition[0], segmentPosition[1], headerBottom],
        [segmentSize[0], segmentSize[1], config.headerThickness]
      )
    )

    yield yieldElement(headerElement)

    // Generate opening width measurement (horizontal, above wall)
    yield yieldMeasurement({
      type: 'opening-width',
      startPoint: createVec2(segmentPosition[0], wallHeight),
      endPoint: createVec2(segmentPosition[0] + segmentSize[0], wallHeight),
      label: formatLength(segmentSize[0] as Length),
      offset: -60
    })

    // Generate header height measurement (vertical, in opening center)
    const headerCenterX = (segmentPosition[0] + segmentSize[0] / 2) as Length
    yield yieldMeasurement({
      type: 'header-height',
      startPoint: createVec2(headerCenterX, 0),
      endPoint: createVec2(headerCenterX, headerBottom),
      label: formatLength(headerBottom),
      offset: 40
    })

    if (headerTop > wallHeight) {
      yield yieldError({
        description: `Header does not fit: needs ${formatLength(config.headerThickness)} but only ${formatLength((wallHeight - headerBottom) as Length)} available`,
        elements: [headerElement.id]
      })
    }
  }

  // Check if sill is required and fits
  const sillRequired = sillHeight > 0

  if (sillRequired && config.sillThickness && config.sillMaterial) {
    const sillTop = sillHeight
    const sillBottom = (sillTop - config.sillThickness) as Length

    // Create single sill spanning entire segment width
    const sillElement = createConstructionElement(
      'sill',
      config.sillMaterial,
      createCuboidShape(
        [segmentPosition[0], segmentPosition[1], sillBottom] as Vec3,
        [segmentSize[0], segmentSize[1], config.sillThickness] as Vec3
      )
    )

    yield yieldElement(sillElement)

    // Generate sill height measurement (vertical, in opening center)
    const sillCenterX = (segmentPosition[0] + segmentSize[0] / 2) as Length
    yield yieldMeasurement({
      type: 'sill-height',
      startPoint: createVec2(sillCenterX, 0),
      endPoint: createVec2(sillCenterX, sillTop),
      label: formatLength(sillTop),
      offset: -40
    })

    // Generate opening height measurement if both sill and header exist
    if (headerRequired) {
      const openingHeight = (headerHeight - sillTop) as Length
      if (openingHeight > 0) {
        yield yieldMeasurement({
          type: 'opening-height',
          startPoint: createVec2(sillCenterX, sillTop),
          endPoint: createVec2(sillCenterX, headerHeight),
          label: formatLength(openingHeight),
          offset: -40
        })
      }
    }

    if (sillBottom < 0) {
      yield yieldError({
        description: `Sill does not fit: needs ${formatLength(config.sillThickness)} but only ${formatLength(sillTop)} available`,
        elements: [sillElement.id]
      })
    }
  }

  // Create individual filling elements for each opening if configured
  if (config.fillingMaterial && config.fillingThickness) {
    for (const opening of openings) {
      const fillingWidth = (opening.width - 2 * config.padding) as Length
      const fillingHeight = (opening.height - 2 * config.padding) as Length

      // Calculate position relative to segment start
      // opening.offsetFromStart is relative to wall start, but segment is already positioned correctly
      // So we need the offset within this segment
      const openingOffsetInSegment = (opening.offsetFromStart - openings[0].offsetFromStart) as Length

      const fillingElement: ConstructionElement = createConstructionElement(
        'opening',
        config.fillingMaterial,
        createCuboidShape(
          [
            (segmentPosition[0] + openingOffsetInSegment + config.padding) as Length,
            (wallThickness - config.fillingThickness) / 2,
            (sillHeight + config.padding) as Length
          ] as Vec3,
          [fillingWidth, config.fillingThickness, fillingHeight] as Vec3
        )
      )
      yield yieldElement(fillingElement)
    }
  }

  // Create wall above header (if space remains)
  if (headerRequired) {
    const wallAboveBottom = (headerHeight + config.headerThickness) as Length
    const wallAboveHeight = (wallHeight - wallAboveBottom) as Length

    if (wallAboveHeight > 0) {
      const wallAbovePosition: Vec3 = [segmentPosition[0], segmentPosition[1], wallAboveBottom]
      const wallAboveSize: Vec3 = [segmentSize[0], segmentSize[1], wallAboveHeight]

      yield* infillWallArea(wallAbovePosition, wallAboveSize, infill, resolveMaterial)
    }
  }

  // Create wall below sill (if space remains)
  if (sillRequired) {
    const sillThickness = config.sillThickness ?? (60 as Length)
    const wallBelowHeight = (sillHeight - sillThickness) as Length

    if (wallBelowHeight > 0) {
      const wallBelowPosition: Vec3 = [segmentPosition[0], segmentPosition[1], 0]
      const wallBelowSize: Vec3 = [segmentSize[0], segmentSize[1], wallBelowHeight]

      yield* infillWallArea(wallBelowPosition, wallBelowSize, infill, resolveMaterial)
    }
  }
}

export function* constructOpening(
  openingSegment: WallSegment3D,
  config: OpeningConstructionConfig,
  infill: InfillConstructionConfig,
  resolveMaterial: ResolveMaterialFunction
): Generator<ConstructionResult> {
  if (openingSegment.type !== 'opening' || !openingSegment.openings) {
    throw new Error('constructOpening requires an opening segment with openings array')
  }

  // Yield the frame results
  yield* constructOpeningFrame(openingSegment, config, infill, resolveMaterial)

  // Note: This function used to return an OpeningConstruction segment,
  // but in the generator pattern we might handle segments differently
  // For now, we just yield the frame elements
}
