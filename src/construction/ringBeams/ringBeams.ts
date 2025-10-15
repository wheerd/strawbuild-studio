import { vec2 } from 'gl-matrix'

import type { Perimeter, PerimeterCorner } from '@/building/model/model'
import { createConstructionElement } from '@/construction/elements'
import type { MaterialId } from '@/construction/materials/material'
import { type ConstructionModel, createUnsupportedModel } from '@/construction/model'
import {
  type ConstructionResult,
  aggregateResults,
  yieldArea,
  yieldElement,
  yieldMeasurement
} from '@/construction/results'
import { createExtrudedPolygon } from '@/construction/shapes'
import { TAG_PERIMETER_INSIDE, TAG_PERIMETER_OUTSIDE } from '@/construction/tags'
import {
  type Length,
  type Polygon2D,
  boundsFromPoints,
  lineFromPoints,
  lineIntersection,
  offsetPolygon,
  simplifyPolygon
} from '@/shared/geometry'

export interface BaseRingBeamConfig {
  type: 'full' | 'double'
  height: Length // Default: 60mm
  material: MaterialId
}

export interface FullRingBeamConfig extends BaseRingBeamConfig {
  type: 'full'
  width: Length // Default: 360mm
  offsetFromEdge: Length // From inside construction edge of wall
  // Default material: 36x6 wood
}

export interface DoubleRingBeamConfig extends BaseRingBeamConfig {
  type: 'double'
  thickness: Length // Default: 120mm
  // Default material: 12x6 wood
  infillMaterial: MaterialId // Default: straw
  offsetFromEdge: Length // From inside construction edge of wall
  spacing: Length // In between the two beams
}

export type RingBeamConfig = FullRingBeamConfig | DoubleRingBeamConfig

function* _constructFullRingBeam(perimeter: Perimeter, config: FullRingBeamConfig): Generator<ConstructionResult> {
  const insidePolygon: Polygon2D = { points: perimeter.corners.map(c => c.insidePoint) }
  const simplifiedPolygon = simplifyPolygon(insidePolygon)
  const beamInsidePolygon = offsetPolygon(simplifiedPolygon, config.offsetFromEdge).points
  const beamOutsidePolygon = offsetPolygon(simplifiedPolygon, config.offsetFromEdge + config.width).points

  const numCorners = simplifiedPolygon.points.length
  for (let currentStart = 0; currentStart < numCorners; currentStart++) {
    const previousStart = (currentStart - 1 + numCorners) % numCorners
    const currentEnd = (currentStart + 1) % numCorners
    const nextEnd = (currentStart + 2) % numCorners

    const startCorner = perimeter.corners.find((c: PerimeterCorner) =>
      vec2.equals(c.insidePoint, simplifiedPolygon.points[currentStart])
    )
    const endCorner = perimeter.corners.find((c: PerimeterCorner) =>
      vec2.equals(c.insidePoint, simplifiedPolygon.points[currentEnd])
    )

    const previousEdge =
      startCorner?.constructedByWall === 'previous'
        ? lineFromPoints(beamOutsidePolygon[previousStart], beamOutsidePolygon[currentStart])
        : lineFromPoints(beamInsidePolygon[previousStart], beamInsidePolygon[currentStart])
    const nextEdge =
      endCorner?.constructedByWall === 'next'
        ? lineFromPoints(beamOutsidePolygon[currentEnd], beamOutsidePolygon[nextEnd])
        : lineFromPoints(beamInsidePolygon[currentEnd], beamInsidePolygon[nextEnd])
    const insideEdge = lineFromPoints(beamInsidePolygon[currentStart], beamInsidePolygon[currentEnd])
    const outsideEdge = lineFromPoints(beamOutsidePolygon[currentStart], beamOutsidePolygon[currentEnd])

    if (!previousEdge || !nextEdge || !insideEdge || !outsideEdge) {
      throw new Error('Failed to create beam segment edges from polygon points')
    }

    const startInside = lineIntersection(previousEdge, insideEdge)
    const startOutside = lineIntersection(previousEdge, outsideEdge)
    const endInside = lineIntersection(nextEdge, insideEdge)
    const endOutside = lineIntersection(nextEdge, outsideEdge)

    if (!startInside || !startOutside || !endInside || !endOutside) {
      throw new Error('Failed to calculate beam segment corner intersections')
    }

    yield yieldElement(
      createConstructionElement(
        config.material,
        createExtrudedPolygon(
          { outer: { points: [startInside, endInside, endOutside, startOutside] }, holes: [] },
          'xy',
          config.height
        )
      )
    )

    yield yieldMeasurement({
      startPoint: [...startInside, 0],
      endPoint: [...endInside, 0],
      size: [1, 1, config.height]
    })

    yield yieldMeasurement({
      startPoint: [...startOutside, 0],
      endPoint: [...endOutside, 0],
      size: [1, 1, config.height]
    })

    yield yieldArea({
      type: 'polygon',
      areaType: 'outer-perimeter',
      renderPosition: 'bottom',
      plane: 'xy',
      polygon: { points: perimeter.corners.map(c => c.outsidePoint) },
      tags: [TAG_PERIMETER_OUTSIDE]
    })

    yield yieldArea({
      type: 'polygon',
      areaType: 'inner-perimeter',
      renderPosition: 'bottom',
      plane: 'xy',
      polygon: { points: perimeter.corners.map(c => c.insidePoint) },
      tags: [TAG_PERIMETER_INSIDE]
    })
  }
}

export function constructFullRingBeam(perimeter: Perimeter, config: FullRingBeamConfig): ConstructionModel {
  const aggRes = aggregateResults([..._constructFullRingBeam(perimeter, config)])
  const bounds2D = boundsFromPoints(perimeter.corners.map(c => c.outsidePoint))
  const bounds3D = { min: [...bounds2D.min, 0], max: [...bounds2D.max, config.height] }

  return {
    bounds: bounds3D,
    elements: aggRes.elements,
    measurements: aggRes.measurements,
    areas: aggRes.areas,
    errors: aggRes.errors,
    warnings: aggRes.warnings
  }
}

const constructDoubleRingBeam = (_perimeter: Perimeter, _config: DoubleRingBeamConfig): ConstructionModel => {
  // TODO: Implement double ring beam construction.
  return createUnsupportedModel('Double ring beam construction is not yet supported.', 'unsupported-ring-beam-double')
}

// Validation functions for ring beam configurations
export const validateRingBeamConfig = (config: RingBeamConfig): void => {
  // Validate common fields
  if (Number(config.height) <= 0) {
    throw new Error('Ring beam height must be greater than 0')
  }

  if (config.type === 'full') {
    validateFullRingBeamConfig(config)
  } else if (config.type === 'double') {
    validateDoubleRingBeamConfig(config)
  } else {
    throw new Error('Invalid ring beam type')
  }
}

const validateFullRingBeamConfig = (config: FullRingBeamConfig): void => {
  if (Number(config.width) <= 0) {
    throw new Error('Ring beam width must be greater than 0')
  }
  // offsetFromEdge can be any value (positive, negative, or zero)
}

const validateDoubleRingBeamConfig = (config: DoubleRingBeamConfig): void => {
  if (Number(config.thickness) <= 0) {
    throw new Error('Ring beam thickness must be greater than 0')
  }
  if (Number(config.spacing) < 0) {
    throw new Error('Ring beam spacing cannot be negative')
  }
  // offsetFromEdge can be any value (positive, negative, or zero)
}

export const constructRingBeam = (perimeter: Perimeter, config: RingBeamConfig): ConstructionModel => {
  if (config.type === 'full') {
    return constructFullRingBeam(perimeter, config)
  } else if (config.type === 'double') {
    return constructDoubleRingBeam(perimeter, config)
  } else {
    throw new Error('Invalid ring beam type')
  }
}
