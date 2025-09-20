import {
  direction,
  distance,
  distanceSquared,
  lineFromPoints,
  lineIntersection,
  offsetPolygon,
  projectPointOntoLine,
  simplifyPolygon,
  type Length,
  type Polygon2D,
  type Vec3
} from '@/types/geometry'
import type { MaterialId, ResolveMaterialFunction } from './material'
import {
  createConstructionElement,
  createCutCuboidShape,
  type ConstructionElement,
  type ConstructionIssue,
  type Measurement
} from './base'
import type { Perimeter, PerimeterId } from '@/model'
import { vec2 } from 'gl-matrix'
import { formatLength } from '@/utils/formatLength'

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

const EPSILON = 1e-2

export const constructFullRingBeam = (
  perimeter: Perimeter,
  config: FullRingBeamConfig,
  _resolveMaterial: ResolveMaterialFunction
): RingBeamConstructionPlan => {
  const insidePolygon: Polygon2D = { points: perimeter.corners.map(c => c.insidePoint) }
  const simplifiedPolygon = simplifyPolygon(insidePolygon)
  const beamInsidePolygon = offsetPolygon(simplifiedPolygon.points, config.offsetFromEdge)
  const beamOutsidePolygon = offsetPolygon(simplifiedPolygon.points, config.offsetFromEdge + config.width)

  const segments: RingBeamSegment[] = []
  const numCorners = simplifiedPolygon.points.length
  for (let currentStart = 0; currentStart < numCorners; currentStart++) {
    const previousStart = (currentStart - 1 + numCorners) % numCorners
    const currentEnd = (currentStart + 1) % numCorners
    const nextEnd = (currentStart + 2) % numCorners

    const startCorner = perimeter.corners.find(
      c => distanceSquared(c.insidePoint, simplifiedPolygon.points[currentStart]) < EPSILON
    )
    const endCorner = perimeter.corners.find(
      c => distanceSquared(c.insidePoint, simplifiedPolygon.points[currentEnd]) < EPSILON
    )

    const previousEdge =
      startCorner?.constuctedByWall === 'previous'
        ? lineFromPoints(beamOutsidePolygon[previousStart], beamOutsidePolygon[currentStart])!
        : lineFromPoints(beamInsidePolygon[previousStart], beamInsidePolygon[currentStart])!
    const nextEdge =
      endCorner?.constuctedByWall === 'next'
        ? lineFromPoints(beamOutsidePolygon[currentEnd], beamOutsidePolygon[nextEnd])!
        : lineFromPoints(beamInsidePolygon[currentEnd], beamInsidePolygon[nextEnd])!
    const insideEdge = lineFromPoints(beamInsidePolygon[currentStart], beamInsidePolygon[currentEnd])!
    const outsideEdge = lineFromPoints(beamOutsidePolygon[currentStart], beamOutsidePolygon[currentEnd])!

    const startInside = lineIntersection(previousEdge, insideEdge)!
    const startOutside = lineIntersection(previousEdge, outsideEdge)!
    const endInside = lineIntersection(nextEdge, insideEdge)!
    const endOutside = lineIntersection(nextEdge, outsideEdge)!

    const projectedStart = projectPointOntoLine(startOutside, insideEdge)
    const projectedEnd = projectPointOntoLine(endOutside, insideEdge)

    const totalLength = Math.max(
      distance(projectedStart, endInside),
      distance(projectedStart, projectedEnd),
      distance(startInside, endInside),
      distance(startInside, projectedEnd)
    )

    const finalPosition =
      distance(startInside, endInside) > distance(projectedStart, endInside) ? startInside : projectedStart

    // Calculate angles between beam direction and cut directions
    const startCutDirection = direction(startInside, startOutside)
    const endCutDirection = direction(endInside, endOutside)
    const startAngle = vec2.signedAngle(insideEdge.direction, startCutDirection)
    const endAngle = vec2.signedAngle(insideEdge.direction, endCutDirection)

    // Convert to chop saw angles: 0° = perpendicular cut.
    const startAngleDeg = 90 - (startAngle * 180) / Math.PI
    const endAngleDeg = 90 - (endAngle * 180) / Math.PI

    const segmentAngle = Math.atan2(insideEdge.direction[0], insideEdge.direction[1])

    segments.push({
      elements: [
        createConstructionElement(
          'plate',
          config.material,
          createCutCuboidShape(
            [0, 0, 0],
            [totalLength, config.width, config.height],
            {
              plane: 'xy',
              axis: 'y',
              angle: startAngleDeg
            },
            {
              plane: 'xy',
              axis: 'y',
              angle: endAngleDeg
            }
          )
        )
      ],
      measurements: [
        {
          type: 'ring-beam-inner',
          startPoint: startInside,
          endPoint: endInside,
          label: formatLength(distance(startInside, endInside)),
          offset: 60
        },
        {
          type: 'ring-beam-outer',
          startPoint: startOutside,
          endPoint: endOutside,
          label: formatLength(distance(startOutside, endOutside)),
          offset: -60
        }
      ],
      position: [finalPosition[0], finalPosition[1], 0],
      rotation: [0, 0, segmentAngle]
    })
  }

  return {
    perimeterId: perimeter.id,
    segments,
    errors: [],
    warnings: []
  }
}

const constructDoubleRingBeam = (
  _perimeter: Perimeter,
  _config: DoubleRingBeamConfig,
  _resolveMaterial: ResolveMaterialFunction
): RingBeamConstructionPlan => {
  throw new Error('Not implemented')
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

export const constructRingBeam = (
  perimeter: Perimeter,
  config: RingBeamConfig,
  resolveMaterial: ResolveMaterialFunction
): RingBeamConstructionPlan => {
  if (config.type === 'full') {
    return constructFullRingBeam(perimeter, config, resolveMaterial)
  } else if (config.type === 'double') {
    return constructDoubleRingBeam(perimeter, config, resolveMaterial)
  } else {
    throw new Error('Invalid ring beam type')
  }
}

export interface RingBeamConstructionPlan {
  perimeterId: PerimeterId

  segments: RingBeamSegment[]

  errors: ConstructionIssue[]
  warnings: ConstructionIssue[]
}

export interface RingBeamSegment {
  elements: ConstructionElement[]
  measurements: Measurement[]
  position: Vec3
  rotation: Vec3
}
