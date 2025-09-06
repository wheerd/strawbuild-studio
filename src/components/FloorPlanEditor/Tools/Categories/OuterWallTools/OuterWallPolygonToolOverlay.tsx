import React from 'react'
import { Group, Line, Circle } from 'react-konva'
import type { ToolOverlayComponentProps } from '@/components/FloorPlanEditor/Tools/ToolSystem/types'
import type { OuterWallPolygonTool } from './OuterWallPolygonTool'
import { useStageHeight, useStageWidth, useZoom } from '@/components/FloorPlanEditor/hooks/useViewportStore'
import { COLORS } from '@/theme/colors'
import { useReactiveTool } from '@/components/FloorPlanEditor/Tools/hooks/useReactiveTool'

interface OuterWallPolygonToolOverlayProps extends ToolOverlayComponentProps<OuterWallPolygonTool> {}

/**
 * React overlay component for OuterWallPolygonTool with zoom-responsive rendering.
 * Uses viewport hooks directly for automatic re-rendering on zoom changes.
 */
export function OuterWallPolygonToolOverlay({ tool }: OuterWallPolygonToolOverlayProps): React.JSX.Element | null {
  const { state } = useReactiveTool(tool)
  const zoom = useZoom()
  const stageWidth = useStageWidth()
  const stageHeight = useStageHeight()

  // Calculate zoom-responsive values
  const scaledLineWidth = Math.max(1, 2 / zoom)
  const scaledSnapLineWidth = Math.max(1, 2 / zoom)
  const dashSize = 10 / zoom
  const scaledDashPattern = [dashSize, dashSize]
  const scaledPointRadius = 5 / zoom
  const scaledPointStrokeWidth = 1 / zoom
  const lineExtend = (Math.max(stageWidth, stageHeight) * 2) / zoom

  const currentPos = state.snapResult?.position ?? state.mouse
  const isClosingSnap = tool.isSnappingToFirstPoint()

  const lines =
    state.snapResult?.lines?.map(l => [
      l.point[0] - lineExtend * l.direction[0],
      l.point[1] - lineExtend * l.direction[1],
      l.point[0] + lineExtend * l.direction[0],
      l.point[1] + lineExtend * l.direction[1]
    ]) ?? []

  return (
    <Group>
      {/* Draw existing points */}
      {lines.map((line, index) => (
        <Line
          key={`snap-line-${index}`}
          points={line}
          stroke={COLORS.snapping.lines}
          strokeWidth={scaledSnapLineWidth}
          opacity={0.5}
          listening={false}
        />
      ))}

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
