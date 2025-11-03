import type { vec2 } from 'gl-matrix'
import { vec2 as Vec2 } from 'gl-matrix'
import React, { useMemo } from 'react'

import type { PerimeterReferenceSide } from '@/building/model/model'
import { Bounds2D, type Polygon2D, ensurePolygonIsClockwise, offsetPolygon } from '@/shared/geometry'
import { formatLength } from '@/shared/utils/formatting'

interface PolygonReferencePreviewProps {
  referencePoints: readonly vec2[]
  thickness: number
  referenceSide: PerimeterReferenceSide
  size?: number
}

interface ScaledPoint {
  x: number
  y: number
}

type PushDirection = 'inward' | 'outward'

function toPath(points: ScaledPoint[]): string {
  if (points.length === 0) return ''
  return points
    .reduce((path, point, index) => `${path}${index === 0 ? 'M' : 'L'} ${point.x} ${point.y} `, '')
    .concat('Z')
}

function generateLabels(
  scaledPoints: ScaledPoint[],
  originalPoints: readonly vec2[],
  pushDirection: PushDirection,
  color: string
): React.ReactNode {
  if (scaledPoints.length === 0) return null

  return scaledPoints.map((point, index) => {
    const nextIndex = (index + 1) % scaledPoints.length
    const nextPoint = scaledPoints[nextIndex]

    const originalStart = originalPoints[index]
    const originalEnd = originalPoints[nextIndex]
    const length = Vec2.distance(originalStart, originalEnd)

    const midX = (point.x + nextPoint.x) / 2
    const midY = (point.y + nextPoint.y) / 2

    const dx = nextPoint.x - point.x
    const dy = nextPoint.y - point.y
    let textAngle = (Math.atan2(dy, dx) * 180) / Math.PI
    if (textAngle > 90) {
      textAngle -= 180
    } else if (textAngle < -90) {
      textAngle += 180
    }

    const segmentNotGoingRightwards = dx >= 0
    const isTextAboveLine = (pushDirection === 'inward') === segmentNotGoingRightwards
    return (
      <g transform={`translate(${midX} ${midY})`} key={`${pushDirection}-${index}`}>
        <text
          x={0}
          y={0}
          textAnchor="middle"
          dominantBaseline={isTextAboveLine ? 'text-before-edge' : 'text-after-edge'}
          fontSize={12}
          fill={color}
          className="font-mono"
          transform={`rotate(${textAngle})`}
          style={{ filter: 'drop-shadow(1px 1px 2px var(--gray-1))' }}
        >
          {formatLength(length)}
        </text>
      </g>
    )
  })
}

export function PolygonReferencePreview({
  referencePoints,
  thickness,
  referenceSide,
  size = 200
}: PolygonReferencePreviewProps): React.JSX.Element {
  const { referencePath, derivedPath, referenceLabels, derivedLabels } = useMemo(() => {
    if (referencePoints.length < 3 || thickness <= 0) {
      return {
        referencePath: '',
        derivedPath: '',
        referenceLabels: null,
        derivedLabels: null
      }
    }

    const referencePolygon: Polygon2D = ensurePolygonIsClockwise({
      points: referencePoints.map(point => Vec2.clone(point))
    })

    let derivedPolygon: Polygon2D | null = null
    try {
      derivedPolygon = offsetPolygon(referencePolygon, referenceSide === 'inside' ? thickness : -thickness)
      if (derivedPolygon.points.length === 0) {
        derivedPolygon = null
      }
    } catch (error) {
      console.warn('Failed to compute offset polygon preview:', error)
      derivedPolygon = null
    }

    const derivedPoints = derivedPolygon?.points ?? null
    const exteriorPoints =
      referenceSide === 'inside' ? (derivedPoints ?? referencePolygon.points) : referencePolygon.points

    const bounds = Bounds2D.fromPoints(exteriorPoints)
    const center = bounds.center
    const maxDimension = Math.max(...bounds.size)
    const scale = maxDimension > 0 ? size / maxDimension : 1
    const centerX = size / 2
    const centerY = size / 2

    const transformPoint = (point: vec2): ScaledPoint => ({
      x: (point[0] - center[0]) * scale + centerX,
      y: -(point[1] - center[1]) * scale + centerY
    })

    const scaledReferencePoints = referencePolygon.points.map(transformPoint)
    const scaledDerivedPoints = derivedPoints?.map(transformPoint) ?? null

    const referencePath = toPath(scaledReferencePoints)
    const derivedPath = scaledDerivedPoints ? toPath(scaledDerivedPoints) : ''

    const referenceLabels = generateLabels(
      scaledReferencePoints,
      referencePolygon.points,
      referenceSide === 'inside' ? 'inward' : 'outward',
      'var(--accent-12)'
    )

    const derivedLabels =
      scaledDerivedPoints && derivedPoints
        ? generateLabels(
            scaledDerivedPoints,
            derivedPoints,
            referenceSide === 'inside' ? 'outward' : 'inward',
            'var(--gray-12)'
          )
        : null

    return {
      referencePath,
      derivedPath,
      referenceLabels,
      derivedLabels
    }
  }, [referencePoints, thickness, referenceSide, size])

  const referenceFill = referenceSide === 'inside' ? 'var(--accent-3)' : 'var(--accent-3)'
  const referenceStroke = referenceSide === 'inside' ? 'var(--accent-8)' : 'var(--accent-8)'

  const derivedFill = referenceSide === 'inside' ? 'var(--gray-3)' : 'var(--gray-2)'
  const derivedStroke = referenceSide === 'inside' ? 'var(--gray-8)' : 'var(--gray-8)'

  const showDerived = derivedPath.length > 0

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
      {referenceSide === 'inside' ? (
        <>
          {showDerived && (
            <path d={derivedPath} fill={derivedFill} stroke={derivedStroke} strokeWidth="1" strokeDasharray="3,3" />
          )}
          <path d={referencePath} fill={referenceFill} stroke={referenceStroke} strokeWidth="2" />
        </>
      ) : (
        <>
          <path d={referencePath} fill={referenceFill} stroke={referenceStroke} strokeWidth="2" />
          {showDerived && (
            <path d={derivedPath} fill={derivedFill} stroke={derivedStroke} strokeWidth="1" strokeDasharray="3,3" />
          )}
        </>
      )}

      {referenceLabels}
      {derivedLabels}
    </svg>
  )
}
