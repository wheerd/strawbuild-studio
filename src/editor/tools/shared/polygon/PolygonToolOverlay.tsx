import React from 'react'
import { Circle, Group, Line } from 'react-konva/lib/ReactKonvaCore'

import { SnappingLines } from '@/editor/canvas/utils/SnappingLines'
import { useZoom } from '@/editor/hooks/useViewportStore'
import { useReactiveTool } from '@/editor/tools/system/hooks/useReactiveTool'
import type { ToolImplementation, ToolOverlayComponentProps } from '@/editor/tools/system/types'
import { useCanvasTheme } from '@/shared/theme/CanvasThemeContext'

import type { BasePolygonTool, PolygonToolStateBase } from './BasePolygonTool'

export function PolygonToolOverlay<TTool extends BasePolygonTool<PolygonToolStateBase> & ToolImplementation>({
  tool
}: ToolOverlayComponentProps<TTool>): React.JSX.Element | null {
  const { state } = useReactiveTool(tool)
  const zoom = useZoom()
  const theme = useCanvasTheme()

  const scaledLineWidth = Math.max(1, 2 / zoom)
  const dashSize = 10 / zoom
  const scaledDashPattern = [dashSize, dashSize]
  const scaledPointRadius = 5 / zoom
  const scaledPointStrokeWidth = 1 / zoom

  const previewPos = tool.getPreviewPosition()
  const isClosingSnap = tool.isSnappingToFirstPoint()

  return (
    <Group>
      <SnappingLines snapResult={state.snapResult} />

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
          fill={index === 0 ? 'var(--color-primary)' : theme.secondary}
          stroke={'var(--gray-1)'}
          strokeWidth={scaledPointStrokeWidth}
          listening={false}
        />
      ))}

      <Circle
        key="snap-point"
        x={previewPos[0]}
        y={previewPos[1]}
        radius={scaledPointRadius}
        fill={state.lengthOverride ? 'var(--color-primary)' : theme.secondary}
        stroke={state.lengthOverride ? 'var(--gray-1)' : 'var(--gray-12)'}
        strokeWidth={scaledPointStrokeWidth}
        listening={false}
      />
    </Group>
  )
}
