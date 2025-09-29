import { vec3 } from 'gl-matrix'

import type { Opening } from '@/building/model/model'
import { type ConstructionElement, createConstructionElement, createCuboidShape } from '@/construction/elements'
import { IDENTITY } from '@/construction/geometry'
import type { MaterialId, ResolveMaterialFunction } from '@/construction/materials/material'
import { type ConstructionResult, yieldArea, yieldElement, yieldError, yieldMeasurement } from '@/construction/results'
import {
  TAG_HEADER,
  TAG_HEADER_HEIGHT,
  TAG_OPENING_DOOR,
  TAG_OPENING_HEIGHT,
  TAG_OPENING_WIDTH,
  TAG_OPENING_WINDOW,
  TAG_SILL,
  TAG_SILL_HEIGHT
} from '@/construction/tags'
import type { InfillConstructionConfig } from '@/construction/walls/infill/infill'
import { infillWallArea } from '@/construction/walls/infill/infill'
import type { WallSegment3D } from '@/construction/walls/segmentation'
import type { Length, Vec3 } from '@/shared/geometry'
import { formatLength } from '@/shared/utils/formatLength'

export interface OpeningConstructionConfig {
  padding: Length // Default: 15mm

  sillThickness: Length // Default: 60mm
  sillMaterial: MaterialId

  headerThickness: Length // Default: 60mm
  headerMaterial: MaterialId
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
      config.headerMaterial,
      createCuboidShape(
        [segmentPosition[0], segmentPosition[1], headerBottom],
        [segmentSize[0], segmentSize[1], config.headerThickness]
      ),
      IDENTITY,
      [TAG_HEADER]
    )

    yield yieldElement(headerElement)

    // Generate opening width measurement (horizontal, above wall)
    yield yieldMeasurement({
      startPoint: vec3.fromValues(segmentPosition[0], 0, wallHeight),
      endPoint: vec3.fromValues(segmentPosition[0] + segmentSize[0], 0, wallHeight),
      label: formatLength(segmentSize[0] as Length),
      groupKey: 'segment',
      tags: [TAG_OPENING_WIDTH],
      offset: -1
    })

    // Generate header height measurement (vertical, in opening center)
    const headerCenterX = (segmentPosition[0] + segmentSize[0] / 2) as Length
    yield yieldMeasurement({
      startPoint: vec3.fromValues(headerCenterX, 0, 0),
      endPoint: vec3.fromValues(headerCenterX, 0, headerBottom),
      label: formatLength(headerBottom),
      tags: [TAG_HEADER_HEIGHT],
      offset: -1
    })

    if (headerTop > wallHeight) {
      yield yieldError({
        description: `Header does not fit: needs ${formatLength(config.headerThickness)} but only ${formatLength((wallHeight - headerBottom) as Length)} available`,
        elements: [headerElement.id],
        bounds: headerElement.bounds
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
      config.sillMaterial,
      createCuboidShape(
        [segmentPosition[0], segmentPosition[1], sillBottom] as Vec3,
        [segmentSize[0], segmentSize[1], config.sillThickness] as Vec3
      ),
      IDENTITY,
      [TAG_SILL]
    )

    yield yieldElement(sillElement)

    // Generate sill height measurement (vertical, in opening center)
    const sillCenterX = (segmentPosition[0] + segmentSize[0] / 2) as Length
    yield yieldMeasurement({
      startPoint: vec3.fromValues(sillCenterX, 0, 0),
      endPoint: vec3.fromValues(sillCenterX, 0, sillTop),
      label: formatLength(sillTop),
      tags: [TAG_SILL_HEIGHT],
      offset: 1
    })

    // Generate opening height measurement if both sill and header exist
    if (headerRequired) {
      const openingHeight = (headerHeight - sillTop) as Length
      if (openingHeight > 0) {
        yield yieldMeasurement({
          startPoint: vec3.fromValues(sillCenterX, 0, sillTop),
          endPoint: vec3.fromValues(sillCenterX, 0, headerHeight),
          label: formatLength(openingHeight),
          tags: [TAG_OPENING_HEIGHT],
          offset: 1
        })
      }
    }

    if (sillBottom < 0) {
      yield yieldError({
        description: `Sill does not fit: needs ${formatLength(config.sillThickness)} but only ${formatLength(sillTop)} available`,
        elements: [sillElement.id],
        bounds: sillElement.bounds
      })
    }
  }

  for (const opening of openings) {
    const fillingWidth = (opening.width - 2 * config.padding) as Length
    const fillingHeight = (opening.height - 2 * config.padding) as Length

    // Calculate position relative to segment start
    // opening.offsetFromStart is relative to wall start, but segment is already positioned correctly
    // So we need the offset within this segment
    const openingOffsetInSegment = (opening.offsetFromStart - openings[0].offsetFromStart) as Length

    const tags = opening.type === 'door' ? [TAG_OPENING_DOOR] : opening.type === 'window' ? [TAG_OPENING_WINDOW] : []
    const label = opening.type === 'door' ? 'Door' : opening.type === 'window' ? 'Window' : 'Passage'

    const openingPos = [
      (segmentPosition[0] + openingOffsetInSegment + config.padding) as Length,
      0,
      (sillHeight + config.padding) as Length
    ] as Vec3
    const openingEnd = [openingPos[0] + fillingWidth, wallThickness, openingPos[2] + fillingHeight] as Vec3

    yield yieldArea({
      label,
      bounds: { min: openingPos, max: openingEnd },
      transform: IDENTITY,
      tags
    })
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
