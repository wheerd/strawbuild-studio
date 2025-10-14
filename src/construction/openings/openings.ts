import { vec3 } from 'gl-matrix'

import type { Opening } from '@/building/model/model'
import { type ConstructionElement, createConstructionElement, createCuboidShape } from '@/construction/elements'
import { IDENTITY } from '@/construction/geometry'
import type { MaterialId } from '@/construction/materials/material'
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
import { type Length, type Vec3, vec3Add } from '@/shared/geometry'
import { formatLength } from '@/shared/utils/formatLength'

export interface OpeningConstructionConfig {
  padding: Length // Default: 15mm

  sillThickness: Length // Default: 60mm
  sillMaterial: MaterialId

  headerThickness: Length // Default: 60mm
  headerMaterial: MaterialId
}

function extractUnifiedDimensions(
  openings: Opening[],
  zOffset: Length
): {
  sillTop: Length
  headerBottom: Length
} {
  // All openings in a segment have same sill/header heights (guaranteed by segmentWall)
  const firstOpening = openings[0]
  // Apply zOffset to convert from finished floor coordinates to wall construction coordinates
  const sillTop = ((firstOpening.sillHeight ?? 0) + zOffset) as Length
  const headerBottom = (sillTop + firstOpening.height) as Length

  return { sillTop, headerBottom }
}

export function* constructOpeningFrame(
  openingSegment: WallSegment3D,
  config: OpeningConstructionConfig,
  infill: InfillConstructionConfig
): Generator<ConstructionResult> {
  if (openingSegment.type !== 'opening' || !openingSegment.openings) {
    throw new Error('constructOpeningFrame requires an opening segment with openings array')
  }

  const openings = openingSegment.openings
  const [openingLeft, wallFront, wallBottom] = openingSegment.position
  const [openingRight, , wallTop] = vec3Add(openingSegment.position, openingSegment.size)
  const [openingWidth, wallThickness] = openingSegment.size
  const openingCenterX = (openingLeft + openingRight) / 2

  const zOffset = openingSegment.zOffset ?? (0 as Length)
  const { sillTop, headerBottom } = extractUnifiedDimensions(openings, zOffset)

  // Check if header is required and fits
  const isOpeningAtWallTop = headerBottom >= wallTop
  const headerRequired = !isOpeningAtWallTop

  if (headerRequired) {
    const headerTop = (headerBottom + config.headerThickness) as Length

    // Create single header spanning entire segment width
    const headerElement: ConstructionElement = createConstructionElement(
      config.headerMaterial,
      createCuboidShape([openingLeft, wallFront, headerBottom], [openingWidth, wallThickness, config.headerThickness]),
      IDENTITY,
      [TAG_HEADER]
    )

    yield yieldElement(headerElement)

    // Generate opening width measurement (horizontal, above wall)
    yield yieldMeasurement({
      startPoint: vec3.fromValues(openingLeft, wallFront, sillTop),
      endPoint: vec3.fromValues(openingLeft + openingWidth, wallFront, sillTop),
      size: [openingWidth, wallThickness, headerBottom - sillTop],
      tags: [TAG_OPENING_WIDTH]
    })

    // Generate header height measurement (vertical, in opening center)
    yield yieldMeasurement({
      startPoint: vec3.fromValues(openingCenterX, 0, 0),
      endPoint: vec3.fromValues(openingCenterX, 0, headerBottom),
      label: formatLength(headerBottom),
      tags: [TAG_HEADER_HEIGHT],
      offset: -1
    })

    if (headerTop > wallTop) {
      yield yieldError({
        description: `Header does not fit: needs ${formatLength(config.headerThickness)} but only ${formatLength((wallTop - headerBottom) as Length)} available`,
        elements: [headerElement.id],
        bounds: headerElement.bounds
      })
    }
  }

  // Check if sill is required and fits
  const sillRequired = sillTop !== wallBottom
  if (sillRequired) {
    const sillBottom = (sillTop - config.sillThickness) as Length

    // Create single sill spanning entire segment width
    const sillElement = createConstructionElement(
      config.sillMaterial,
      createCuboidShape(
        [openingLeft, wallFront, sillBottom] as Vec3,
        [openingWidth, wallThickness, config.sillThickness] as Vec3
      ),
      IDENTITY,
      [TAG_SILL]
    )

    yield yieldElement(sillElement)

    // Generate sill height measurement (vertical, in opening center)
    yield yieldMeasurement({
      startPoint: vec3.fromValues(openingCenterX, 0, 0),
      endPoint: vec3.fromValues(openingCenterX, 0, sillTop),
      label: formatLength(sillTop),
      tags: [TAG_SILL_HEIGHT],
      offset: 1
    })

    // Generate opening height measurement if both sill and header exist
    if (headerRequired) {
      const openingHeight = (headerBottom - sillTop) as Length
      if (openingHeight > 0) {
        yield yieldMeasurement({
          startPoint: vec3.fromValues(openingCenterX, 0, sillTop),
          endPoint: vec3.fromValues(openingCenterX, 0, headerBottom),
          label: formatLength(openingHeight),
          tags: [TAG_OPENING_HEIGHT],
          offset: 1
        })
      }
    }

    if (sillBottom < wallBottom) {
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

    const openingPos = vec3.fromValues(
      openingLeft + openingOffsetInSegment + config.padding,
      wallFront,
      sillTop + config.padding
    )
    const openingEnd = vec3Add(openingPos, [fillingWidth, wallThickness, fillingHeight])

    yield yieldArea({
      type: 'cuboid',
      areaType: opening.type,
      label,
      bounds: { min: openingPos, max: openingEnd },
      transform: IDENTITY,
      tags,
      renderPosition: 'bottom'
    })
  }

  // Create wall above header (if space remains)
  if (headerRequired) {
    const wallAboveBottom = (headerBottom + config.headerThickness) as Length
    const wallAboveHeight = (wallTop - wallAboveBottom) as Length

    if (wallAboveHeight > 0) {
      const wallAbovePosition: Vec3 = [openingLeft, wallFront, wallAboveBottom]
      const wallAboveSize: Vec3 = [openingWidth, wallThickness, wallAboveHeight]

      yield* infillWallArea(wallAbovePosition, wallAboveSize, infill)
    }
  }

  // Create wall below sill (if space remains)
  if (sillRequired) {
    const sillThickness = config.sillThickness ?? (60 as Length)
    const wallBelowHeight = (sillTop - sillThickness - wallBottom) as Length

    if (wallBelowHeight > 0) {
      const wallBelowPosition: Vec3 = [openingLeft, wallFront, wallBottom]
      const wallBelowSize: Vec3 = [openingWidth, wallThickness, wallBelowHeight]

      yield* infillWallArea(wallBelowPosition, wallBelowSize, infill)
    }
  }
}
