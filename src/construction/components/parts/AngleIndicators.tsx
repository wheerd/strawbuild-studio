import React, { useMemo } from 'react'

import {
  type Polygon2D,
  type PolygonWithHoles2D,
  type Vec2,
  addVec2,
  ensurePolygonIsClockwise,
  newVec2,
  scaleAddVec2,
  scaleVec2
} from '@/shared/geometry'

import {
  calculateInteriorAngle,
  getAngleBisector,
  getEdgeDirections,
  getSmallerAngle,
  isRightAngle
} from './utils/angleUtils'
import { type ICoordinateMapper, IdentityCoordinateMapper } from './utils/coordinateMapper'

interface AngleIndicatorProps {
  vertex: Vec2
  prevPoint: Vec2
  nextPoint: Vec2
  scaleFactor: number
}

function RightAngleIndicator({ vertex, prevPoint, nextPoint, scaleFactor }: AngleIndicatorProps): React.JSX.Element {
  const bisector = getAngleBisector(prevPoint, vertex, nextPoint)

  const { dir1, dir2 } = getEdgeDirections(prevPoint, vertex, nextPoint)
  const size = 6 * scaleFactor

  // Calculate the two perpendicular edges of the square
  const p1 = scaleAddVec2(vertex, dir1, size)
  const corner = scaleAddVec2(vertex, bisector, size * Math.SQRT2)
  const p2 = scaleAddVec2(vertex, dir2, size)

  return (
    <path
      d={`M ${p1[0]} ${p1[1]} L ${corner[0]} ${corner[1]} L ${p2[0]} ${p2[1]}`}
      stroke="var(--color-gray-900)"
      strokeWidth={Math.max(1, scaleFactor)}
      opacity={0.5}
      fill="none"
    />
  )
}

function AngleArcIndicator({ vertex, prevPoint, nextPoint, scaleFactor }: AngleIndicatorProps): React.JSX.Element {
  const interiorAngle = calculateInteriorAngle(prevPoint, vertex, nextPoint)
  const { angle, useExterior } = getSmallerAngle(interiorAngle)
  const { dir1, dir2 } = getEdgeDirections(prevPoint, vertex, nextPoint)

  const radius = 12 * scaleFactor
  const fontSize = 6 * scaleFactor
  const strokeWidth = Math.max(1, scaleFactor)

  // Calculate start and end angles for the arc
  const startAngle = Math.atan2(dir1[1], dir1[0])
  const endAngle = Math.atan2(dir2[1], dir2[0])

  // Calculate arc endpoints
  const startX = vertex[0] + radius * Math.cos(startAngle)
  const startY = vertex[1] + radius * Math.sin(startAngle)
  const endX = vertex[0] + radius * Math.cos(endAngle)
  const endY = vertex[1] + radius * Math.sin(endAngle)

  // Determine sweep direction
  // For interior angles: sweep clockwise (sweepFlag = 1)
  // For exterior angles: sweep counter-clockwise (sweepFlag = 0)
  const largeArcFlag = angle > 180 ? 1 : 0
  const sweepFlag = useExterior ? 0 : 1

  // Calculate label position (at the bisector)
  const bisector = getAngleBisector(prevPoint, vertex, nextPoint)
  const labelPos = addVec2(vertex, scaleVec2(bisector, radius * 0.6))

  const arcPath = `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${endX} ${endY}`

  return (
    <g>
      <path d={arcPath} stroke="var(--color-gray-900)" strokeWidth={strokeWidth} fill="none" />
      <text
        x={labelPos[0]}
        y={labelPos[1]}
        fontSize={fontSize}
        fill="var(--color-gray-900)"
        textAnchor="middle"
        dominantBaseline="central"
      >
        {Math.round(angle)}
      </text>
    </g>
  )
}

function AngleIndicator({ vertex, prevPoint, nextPoint, scaleFactor }: AngleIndicatorProps): React.JSX.Element {
  const interiorAngle = calculateInteriorAngle(prevPoint, vertex, nextPoint)
  const { angle } = getSmallerAngle(interiorAngle)

  if (isRightAngle(angle)) {
    return <RightAngleIndicator vertex={vertex} prevPoint={prevPoint} nextPoint={nextPoint} scaleFactor={scaleFactor} />
  } else {
    return <AngleArcIndicator vertex={vertex} prevPoint={prevPoint} nextPoint={nextPoint} scaleFactor={scaleFactor} />
  }
}

function getPolygonAngles(
  polygon: Polygon2D,
  coordinateMapper: ICoordinateMapper
): {
  vertex: Vec2
  prevPoint: Vec2
  nextPoint: Vec2
}[] {
  const angles: { vertex: Vec2; prevPoint: Vec2; nextPoint: Vec2 }[] = []
  const points = polygon.points

  for (let i = 0; i < points.length; i++) {
    const prevIdx = (i - 1 + points.length) % points.length
    const nextIdx = (i + 1) % points.length

    const prevVirtual = points[prevIdx]
    const vertexVirtual = points[i]
    const nextVirtual = points[nextIdx]

    // Map to display coordinates
    const prevDisplay = coordinateMapper.toDisplay(prevVirtual[0])
    const vertexDisplay = coordinateMapper.toDisplay(vertexVirtual[0])
    const nextDisplay = coordinateMapper.toDisplay(nextVirtual[0])

    // Skip if any point is in a gap
    if (prevDisplay === null || vertexDisplay === null || nextDisplay === null) {
      continue
    }

    // Create display space points (X is mapped, Y stays the same)
    const prevPoint = newVec2(prevDisplay, prevVirtual[1])
    const vertex = newVec2(vertexDisplay, vertexVirtual[1])
    const nextPoint = newVec2(nextDisplay, nextVirtual[1])

    angles.push({ vertex, prevPoint, nextPoint })
  }

  return angles
}

export function PolygonAngleIndicators({
  polygon,
  coordinateMapper: providedMapper,
  scaleFactor
}: {
  polygon: PolygonWithHoles2D
  coordinateMapper?: ICoordinateMapper
  scaleFactor?: number
}): React.JSX.Element {
  // Use identity mapper if none provided
  const coordinateMapper = useMemo(() => providedMapper ?? new IdentityCoordinateMapper(), [providedMapper])
  const scale = scaleFactor ?? 1.0

  const allAngles = useMemo(() => {
    const angles = getPolygonAngles(polygon.outer, coordinateMapper)

    // Add angles from holes
    for (const hole of polygon.holes) {
      angles.push(...getPolygonAngles(ensurePolygonIsClockwise(hole), coordinateMapper))
    }

    return angles
  }, [polygon, coordinateMapper])

  return (
    <g className="angle-indicators">
      {allAngles.map((angleData, index) => (
        <AngleIndicator key={`angle-${index}`} {...angleData} scaleFactor={scale} />
      ))}
    </g>
  )
}
