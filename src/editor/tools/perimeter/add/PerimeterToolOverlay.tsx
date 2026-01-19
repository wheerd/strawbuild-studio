import React, { useMemo } from 'react'

import { useZoom } from '@/editor/hooks/useViewportStore'
import { useReactiveTool } from '@/editor/tools/system/hooks/useReactiveTool'
import type { ToolOverlayComponentProps } from '@/editor/tools/system/types'
import { SnappingLines } from '@/editor/utils/SnappingLines'
import { type Vec2, addVec2, copyVec2, direction, offsetPolygon, perpendicularCCW, scaleVec2 } from '@/shared/geometry'
import { ensurePolygonIsClockwise } from '@/shared/geometry/polygon'

import type { PerimeterTool } from './PerimeterTool'

interface SegmentLine {
  points: string
}

interface DerivedPolygon {
  type: 'polygon'
  points: string
}

interface DerivedSegments {
  type: 'segments'
  segments: SegmentLine[]
}

function clonePoints(points: readonly Vec2[]): Vec2[] {
  return points.map(point => copyVec2(point))
}

function toSvgPoints(points: readonly Vec2[], close = false): string {
  let result = points.map(point => `${point[0]},${point[1]}`).join(' ')
  if (close && points.length > 0) {
    result += ` ${points[0][0]},${points[0][1]}`
  }
  return result
}

function computeDerivedPolygon(
  inputPoints: readonly Vec2[],
  referenceSide: 'inside' | 'outside',
  thickness: number
): DerivedPolygon | null {
  if (thickness <= 0 || inputPoints.length < 3) {
    return null
  }

  try {
    const clonedPoints = clonePoints(inputPoints)
    const oriented = ensurePolygonIsClockwise({ points: clonedPoints })
    const offset = offsetPolygon(oriented, referenceSide === 'inside' ? thickness : -thickness)
    return {
      type: 'polygon',
      points: toSvgPoints(offset.points, true)
    }
  } catch (error) {
    console.warn('Failed to compute derived perimeter polygon preview:', error)
    return null
  }
}

function computeDerivedSegments(
  inputPoints: readonly Vec2[],
  referenceSide: 'inside' | 'outside',
  thickness: number,
  isClosed: boolean
): DerivedSegments | null {
  if (thickness <= 0 || inputPoints.length < 2) {
    return null
  }

  const multiplier = referenceSide === 'inside' ? 1 : -1
  const segments: SegmentLine[] = []
  const segmentCount = isClosed ? inputPoints.length : inputPoints.length - 1

  for (let i = 0; i < segmentCount; i += 1) {
    const start = inputPoints[i]
    const end = inputPoints[(i + 1) % inputPoints.length]

    const segDirection = direction(start, end)
    const outward = perpendicularCCW(segDirection)
    const offset = scaleVec2(outward, thickness * multiplier)

    const offsetStart = addVec2(start, offset)
    const offsetEnd = addVec2(end, offset)

    segments.push({ points: `${offsetStart[0]},${offsetStart[1]} ${offsetEnd[0]},${offsetEnd[1]}` })
  }

  return { type: 'segments', segments }
}

export function PerimeterToolOverlay({ tool }: ToolOverlayComponentProps<PerimeterTool>): React.JSX.Element | null {
  const { state } = useReactiveTool(tool)
  const zoom = useZoom()

  const scaledLineWidth = Math.max(1, 2 / zoom)
  const dashSize = 10 / zoom
  const scaledDashPattern = `${dashSize} ${dashSize}`
  const scaledDashPattern2 = `${3 / zoom} ${10 / zoom}`
  const scaledPointRadius = 5 / zoom
  const scaledPointStrokeWidth = 1 / zoom

  const previewPos = tool.getPreviewPosition()
  const isClosingSnap = tool.isSnappingToFirstPoint()

  const workingPoints = useMemo(() => {
    const points: Vec2[] = [...state.points]
    if (state.points.length > 0 && !isClosingSnap) {
      points.push(previewPos)
    }
    return points
  }, [state.points, previewPos, isClosingSnap])

  const derivedGeometry = useMemo(() => {
    if (workingPoints.length < 2 || state.wallThickness <= 0) {
      return null
    }

    const isClosed = workingPoints.length >= tool.getMinimumPointCount()
    if (workingPoints.length >= 3) {
      const polygon = computeDerivedPolygon(workingPoints, state.referenceSide, state.wallThickness)
      if (polygon) {
        return polygon
      }
    }

    return computeDerivedSegments(workingPoints, state.referenceSide, state.wallThickness, isClosed)
  }, [workingPoints, state.referenceSide, state.wallThickness, tool])

  return (
    <g pointerEvents="none">
      <SnappingLines snapResult={state.snapResult} />

      {derivedGeometry?.type === 'polygon' && (
        <polyline
          points={derivedGeometry.points}
          fill="none"
          stroke="var(--color-gray-500)"
          strokeWidth={scaledLineWidth}
          strokeDasharray={scaledDashPattern2}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.8}
        />
      )}

      {derivedGeometry?.type === 'segments' &&
        derivedGeometry.segments.map((segment, index) => (
          <polyline
            key={`offset-segment-${index}`}
            points={segment.points}
            fill="none"
            stroke="var(--color-gray-500)"
            strokeWidth={scaledLineWidth}
            strokeDasharray={scaledDashPattern2}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.8}
          />
        ))}

      {state.points.length > 1 && (
        <polyline
          points={toSvgPoints(state.points)}
          fill="none"
          stroke="var(--color-gray-700)"
          strokeWidth={scaledLineWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {state.points.length > 0 && !isClosingSnap && (
        <line
          x1={state.points[state.points.length - 1][0]}
          y1={state.points[state.points.length - 1][1]}
          x2={previewPos[0]}
          y2={previewPos[1]}
          stroke={state.isCurrentSegmentValid ? 'var(--color-gray-800)' : 'var(--color-red-600)'}
          strokeWidth={scaledLineWidth}
          strokeDasharray={scaledDashPattern}
        />
      )}

      {state.points.length >= 2 && !isClosingSnap && (
        <line
          x1={previewPos[0]}
          y1={previewPos[1]}
          x2={state.points[0][0]}
          y2={state.points[0][1]}
          stroke="var(--color-gray-900)"
          strokeWidth={scaledLineWidth}
          strokeDasharray={scaledDashPattern2}
          opacity={0.8}
        />
      )}

      {state.points.length >= tool.getMinimumPointCount() && isClosingSnap && (
        <line
          x1={state.points[state.points.length - 1][0]}
          y1={state.points[state.points.length - 1][1]}
          x2={state.points[0][0]}
          y2={state.points[0][1]}
          stroke={state.isClosingSegmentValid ? 'var(--color-green-600)' : 'var(--color-red-600)'}
          strokeWidth={scaledLineWidth}
          strokeDasharray={scaledDashPattern}
        />
      )}

      {state.points.map((point, index) => (
        <circle
          key={`point-${index}`}
          cx={point[0]}
          cy={point[1]}
          r={scaledPointRadius}
          fill={index === 0 ? 'var(--color-blue-600)' : 'var(--color-gray-600)'}
          stroke="var(--color-gray-100)"
          strokeWidth={scaledPointStrokeWidth}
        />
      ))}

      <circle
        key="snap-point"
        cx={previewPos[0]}
        cy={previewPos[1]}
        r={scaledPointRadius}
        fill={state.lengthOverride ? 'var(--color-primary)' : 'var(--color-gray-900)'}
        stroke={state.lengthOverride ? 'var(--color-gray-100)' : 'var(--color-gray-900)'}
        strokeWidth={scaledPointStrokeWidth}
      />
    </g>
  )
}
