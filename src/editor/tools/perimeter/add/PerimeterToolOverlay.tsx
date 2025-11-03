import { vec2 } from 'gl-matrix'
import React, { useMemo } from 'react'
import { Circle, Group, Line } from 'react-konva/lib/ReactKonvaCore'

import { SnappingLines } from '@/editor/canvas/utils/SnappingLines'
import { useZoom } from '@/editor/hooks/useViewportStore'
import { useReactiveTool } from '@/editor/tools/system/hooks/useReactiveTool'
import type { ToolOverlayComponentProps } from '@/editor/tools/system/types'
import { direction, perpendicularCCW, offsetPolygon  } from '@/shared/geometry'
import { ensurePolygonIsClockwise } from '@/shared/geometry/polygon'
import { useCanvasTheme } from '@/shared/theme/CanvasThemeContext'

import type { PerimeterTool } from './PerimeterTool'

interface SegmentLine {
  points: number[]
}

interface DerivedPolygon {
  type: 'polygon'
  points: number[]
}

interface DerivedSegments {
  type: 'segments'
  segments: SegmentLine[]
}

function clonePoints(points: readonly vec2[]): vec2[] {
  return points.map(point => vec2.clone(point))
}

function toFlatPoints(points: readonly vec2[], close = false): number[] {
  const flat = points.flatMap(point => [point[0], point[1]])
  if (close && points.length > 0) {
    flat.push(points[0][0], points[0][1])
  }
  return flat
}

function computeDerivedPolygon(
  inputPoints: readonly vec2[],
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
      points: toFlatPoints(offset.points, true)
    }
  } catch (error) {
    console.warn('Failed to compute derived perimeter polygon preview:', error)
    return null
  }
}

function computeDerivedSegments(
  inputPoints: readonly vec2[],
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
    const offset = vec2.scale(vec2.create(), outward, thickness * multiplier)

    const offsetStart = vec2.add(vec2.create(), start, offset)
    const offsetEnd = vec2.add(vec2.create(), end, offset)

    segments.push({ points: [offsetStart[0], offsetStart[1], offsetEnd[0], offsetEnd[1]] })
  }

  return { type: 'segments', segments }
}

export function PerimeterToolOverlay({ tool }: ToolOverlayComponentProps<PerimeterTool>): React.JSX.Element | null {
  const { state } = useReactiveTool(tool)
  const zoom = useZoom()
  const theme = useCanvasTheme()

  const scaledLineWidth = Math.max(1, 2 / zoom)
  const dashSize = 10 / zoom
  const scaledDashPattern = [dashSize, dashSize]
  const scaledDashPattern2 = [3 / zoom, 10 / zoom]
  const scaledPointRadius = 5 / zoom
  const scaledPointStrokeWidth = 1 / zoom

  const previewPos = tool.getPreviewPosition()
  const isClosingSnap = tool.isSnappingToFirstPoint()

  const workingPoints = useMemo(() => {
    const points: vec2[] = [...state.points]
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
    <Group>
      <SnappingLines snapResult={state.snapResult} />

      {derivedGeometry?.type === 'polygon' && (
        <Line
          points={derivedGeometry.points}
          stroke={theme.textSecondary}
          strokeWidth={scaledLineWidth}
          dash={scaledDashPattern2}
          lineCap="round"
          lineJoin="round"
          opacity={0.8}
          listening={false}
        />
      )}

      {derivedGeometry?.type === 'segments' &&
        derivedGeometry.segments.map((segment, index) => (
          <Line
            key={`offset-segment-${index}`}
            points={segment.points}
            stroke={theme.textSecondary}
            strokeWidth={scaledLineWidth}
            dash={scaledDashPattern2}
            lineCap="round"
            lineJoin="round"
            opacity={0.8}
            listening={false}
          />
        ))}

      {state.points.length > 1 && (
        <Line
          points={state.points.flatMap(point => [point[0], point[1]])}
          stroke={theme.secondary}
          strokeWidth={scaledLineWidth}
          lineCap="round"
          lineJoin="round"
          listening={false}
        />
      )}

      {state.points.length > 0 && !isClosingSnap && (
        <Line
          points={[
            state.points[state.points.length - 1][0],
            state.points[state.points.length - 1][1],
            previewPos[0],
            previewPos[1]
          ]}
          stroke={state.isCurrentSegmentValid ? theme.textTertiary : theme.danger}
          strokeWidth={scaledLineWidth}
          dash={scaledDashPattern}
          listening={false}
        />
      )}

      {state.points.length >= 2 && !isClosingSnap && (
        <Line
          points={[previewPos[0], previewPos[1], state.points[0][0], state.points[0][1]]}
          stroke={theme.textTertiary}
          strokeWidth={scaledLineWidth}
          dash={scaledDashPattern2}
          opacity={0.8}
          listening={false}
        />
      )}

      {state.points.length >= tool.getMinimumPointCount() && isClosingSnap && (
        <Line
          points={[
            state.points[state.points.length - 1][0],
            state.points[state.points.length - 1][1],
            state.points[0][0],
            state.points[0][1]
          ]}
          stroke={state.isClosingSegmentValid ? theme.success : theme.danger}
          strokeWidth={scaledLineWidth}
          dash={scaledDashPattern}
          listening={false}
        />
      )}

      {state.points.map((point, index) => (
        <Circle
          key={`point-${index}`}
          x={point[0]}
          y={point[1]}
          radius={scaledPointRadius}
          fill={index === 0 ? theme.primary : theme.secondary}
          stroke={theme.white}
          strokeWidth={scaledPointStrokeWidth}
          listening={false}
        />
      ))}

      <Circle
        key="snap-point"
        x={previewPos[0]}
        y={previewPos[1]}
        radius={scaledPointRadius}
        fill={state.lengthOverride ? theme.primary : theme.secondary}
        stroke={state.lengthOverride ? theme.white : theme.black}
        strokeWidth={scaledPointStrokeWidth}
        listening={false}
      />
    </Group>
  )
}
