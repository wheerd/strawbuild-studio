import React from 'react'
import { Group, Line, Circle } from 'react-konva'
import type { ToolOverlayComponentProps } from '@/components/FloorPlanEditor/Tools/ToolSystem/types'
import type { PerimeterTool } from './PerimeterTool'
import { useZoom } from '@/components/FloorPlanEditor/hooks/useViewportStore'
import { COLORS } from '@/theme/colors'
import { useReactiveTool } from '@/components/FloorPlanEditor/Tools/hooks/useReactiveTool'
import { SnappingLines } from '@/components/FloorPlanEditor/components/SnappingLines'

interface PerimeterToolOverlayProps extends ToolOverlayComponentProps<PerimeterTool> {}

/**
 * React overlay component for PerimeterTool with zoom-responsive rendering.
 * Uses viewport hooks directly for automatic re-rendering on zoom changes.
 */
export function PerimeterToolOverlay({ tool }: PerimeterToolOverlayProps): React.JSX.Element | null {
  const { state } = useReactiveTool(tool)
  const zoom = useZoom()

  // Calculate zoom-responsive values
  const scaledLineWidth = Math.max(1, 2 / zoom)
  const dashSize = 10 / zoom
  const scaledDashPattern = [dashSize, dashSize]
  const scaledPointRadius = 5 / zoom
  const scaledPointStrokeWidth = 1 / zoom

  const currentPos = state.snapResult?.position ?? state.mouse
  const isClosingSnap = tool.isSnappingToFirstPoint()

  return (
    <Group>
      {/* Snapping lines */}
      <SnappingLines snapResult={state.snapResult} />

      {/* Draw lines between points */}
      {state.points.length > 1 && (
        <Line
          points={state.points.flatMap(point => [point[0], point[1]])}
          stroke={COLORS.ui.secondary}
          strokeWidth={scaledLineWidth}
          lineCap="round"
          lineJoin="round"
          listening={false}
        />
      )}
      {/* Draw line to current mouse position */}
      {state.points.length > 0 && !isClosingSnap && (
        <Line
          points={[
            state.points[state.points.length - 1][0],
            state.points[state.points.length - 1][1],
            currentPos[0],
            currentPos[1]
          ]}
          stroke={state.isCurrentLineValid ? COLORS.ui.gray500 : COLORS.ui.danger}
          strokeWidth={scaledLineWidth}
          dash={scaledDashPattern}
          listening={false}
        />
      )}

      {/* Draw closing line preview when near first point */}
      {state.points.length >= 3 && isClosingSnap && (
        <Line
          points={[
            state.points[state.points.length - 1][0],
            state.points[state.points.length - 1][1],
            state.points[0][0],
            state.points[0][1]
          ]}
          stroke={state.isClosingLineValid ? COLORS.ui.success : COLORS.ui.danger}
          strokeWidth={scaledLineWidth}
          dash={scaledDashPattern}
          listening={false}
        />
      )}

      {/* Draw existing points */}
      {state.points.map((point, index) => (
        <Circle
          key={`point-${index}`}
          x={point[0]}
          y={point[1]}
          radius={scaledPointRadius}
          fill={index === 0 ? COLORS.ui.primary : COLORS.ui.secondary}
          stroke={COLORS.ui.white}
          strokeWidth={scaledPointStrokeWidth}
          listening={false}
        />
      ))}

      {/* Draw snap position */}
      <Circle
        key="snap-point"
        x={currentPos[0]}
        y={currentPos[1]}
        radius={scaledPointRadius}
        fill={COLORS.snapping.points}
        stroke={COLORS.snapping.pointStroke}
        strokeWidth={scaledPointStrokeWidth}
        listening={false}
      />
    </Group>
  )
}
