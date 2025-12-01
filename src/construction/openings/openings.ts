import { vec3 } from 'gl-matrix'

import type { Opening } from '@/building/model/model'
import { type ConstructionElement, createCuboidElement } from '@/construction/elements'
import { IDENTITY, WallConstructionArea } from '@/construction/geometry'
import type { MaterialId } from '@/construction/materials/material'
import { dimensionalPartInfo } from '@/construction/parts'
import { type ConstructionResult, yieldArea, yieldElement, yieldError, yieldMeasurement } from '@/construction/results'
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
import { Bounds3D, type Length } from '@/shared/geometry'
import { formatLength } from '@/shared/utils/formatting'

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
  const sillTop = (firstOpening.sillHeight ?? 0) + zOffset
  const headerBottom = sillTop + firstOpening.height

  return { sillTop, headerBottom }
}

export function* constructOpeningFrame(
  area: WallConstructionArea,
  openings: Opening[],
  zOffset: Length,
  config: OpeningConstructionConfig,
  infill: InfillMethod
): Generator<ConstructionResult> {
  const [openingLeft, wallFront, wallBottom] = area.position
  const [openingRight, , wallTop] = vec3.add(vec3.create(), area.position, area.size)
  const [openingWidth, wallThickness] = area.size

  const { sillTop, headerBottom } = extractUnifiedDimensions(openings, zOffset)

  // Check if header is required and fits
  const isOpeningAtWallTop = headerBottom >= wallTop
  const headerRequired = !isOpeningAtWallTop

  if (headerRequired) {
    const headerTop = headerBottom + config.headerThickness

    // Create single header spanning entire segment width
    const headerSize = vec3.fromValues(openingWidth, wallThickness, config.headerThickness)
    const headerElement: ConstructionElement = createCuboidElement(
      config.headerMaterial,
      vec3.fromValues(openingLeft, wallFront, headerBottom),
      headerSize,
      [TAG_HEADER],
      dimensionalPartInfo('header', headerSize)
    )

    yield* yieldElement(headerElement)

    // Generate opening width measurement (horizontal, above wall)
    yield yieldMeasurement({
      startPoint: vec3.fromValues(openingLeft, wallFront, sillTop),
      endPoint: vec3.fromValues(openingLeft + openingWidth, wallFront, sillTop),
      size: [openingWidth, wallThickness, headerBottom - sillTop],
      tags: [TAG_OPENING_WIDTH]
    })

    // Generate header height measurement (vertical, on opening left)
    yield yieldMeasurement({
      startPoint: vec3.fromValues(openingLeft, 0, 0),
      endPoint: vec3.fromValues(openingLeft, 0, headerBottom),
      size: [openingWidth, wallThickness, headerBottom],
      label: formatLength(headerBottom),
      tags: [TAG_HEADER_HEIGHT],
      offset: -1
    })

    // Above height measurement (vertical, on opening left)
    yield yieldMeasurement({
      startPoint: vec3.fromValues(openingLeft, 0, headerBottom),
      endPoint: vec3.fromValues(openingLeft, 0, wallTop),
      size: [openingWidth, wallThickness, wallTop - headerBottom],
      label: formatLength(wallTop - headerBottom),
      tags: [TAG_HEADER_FROM_TOP],
      offset: -1
    })

    if (headerTop > wallTop) {
      yield yieldError(
        `Header does not fit: needs ${formatLength(config.headerThickness)} but only ${formatLength(wallTop - headerBottom)} available`,
        [headerElement]
      )
    }
  }

  // Check if sill is required and fits
  const sillRequired = sillTop !== wallBottom
  if (sillRequired) {
    const sillBottom = sillTop - config.sillThickness

    // Create single sill spanning entire segment width
    const sillSize = vec3.fromValues(openingWidth, wallThickness, config.sillThickness)
    const sillElement = createCuboidElement(
      config.sillMaterial,
      vec3.fromValues(openingLeft, wallFront, sillBottom),
      sillSize,
      [TAG_SILL],
      dimensionalPartInfo('sill', sillSize)
    )

    yield* yieldElement(sillElement)

    // Generate sill height measurement (vertical, in opening right)
    yield yieldMeasurement({
      startPoint: vec3.fromValues(openingRight, 0, 0),
      endPoint: vec3.fromValues(openingRight, 0, sillTop),
      size: [openingWidth, wallThickness, sillTop],
      label: formatLength(sillTop),
      tags: [TAG_SILL_HEIGHT],
      offset: 1
    })

    // Generate opening height measurement if both sill and header exist
    if (headerRequired) {
      const openingHeight = headerBottom - sillTop
      if (openingHeight > 0) {
        yield yieldMeasurement({
          startPoint: vec3.fromValues(openingRight, 0, sillTop),
          endPoint: vec3.fromValues(openingRight, 0, headerBottom),
          size: [openingWidth, wallThickness, openingHeight],
          label: formatLength(openingHeight),
          tags: [TAG_OPENING_HEIGHT],
          offset: 1
        })
      }
    }

    if (sillBottom < wallBottom) {
      yield yieldError(
        `Sill does not fit: needs ${formatLength(config.sillThickness)} but only ${formatLength(sillTop)} available`,
        [sillElement]
      )
    }
  }

  for (const opening of openings) {
    const fillingWidth = opening.width - 2 * config.padding
    const fillingHeight = opening.height - 2 * config.padding

    // Calculate position relative to segment start
    // opening.offsetFromStart is relative to wall start, but segment is already positioned correctly
    // So we need the offset within this segment
    const openingOffsetInSegment = opening.offsetFromStart - openings[0].offsetFromStart

    const tags = opening.type === 'door' ? [TAG_OPENING_DOOR] : opening.type === 'window' ? [TAG_OPENING_WINDOW] : []
    const label = opening.type === 'door' ? 'Door' : opening.type === 'window' ? 'Window' : 'Passage'

    const openingPos = vec3.fromValues(
      openingLeft + openingOffsetInSegment + config.padding,
      wallFront,
      sillTop + config.padding
    )

    yield yieldArea({
      type: 'cuboid',
      areaType: opening.type,
      label,
      bounds: Bounds3D.fromCuboid(openingPos, [fillingWidth, wallThickness, fillingHeight]),
      transform: IDENTITY,
      tags,
      renderPosition: 'bottom'
    })
  }

  // Create wall above header (if space remains)
  if (headerRequired) {
    const wallAboveBottom = headerBottom + config.headerThickness
    if (wallTop > wallAboveBottom) {
      const aboveArea = area.withZAdjustment(wallAboveBottom)
      yield* infill(aboveArea)
    }
  }

  // Create wall below sill (if space remains)
  if (sillRequired) {
    const sillThickness = config.sillThickness ?? 60
    const wallBelowHeight = sillTop - sillThickness - wallBottom

    if (wallBelowHeight > 0) {
      const wallBelowPosition = vec3.fromValues(openingLeft, wallFront, wallBottom)
      const wallBelowSize = vec3.fromValues(openingWidth, wallThickness, wallBelowHeight)

      yield* infill(new WallConstructionArea(wallBelowPosition, wallBelowSize))
    }
  }
}
