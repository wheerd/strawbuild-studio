import React from 'react'

import { useZoom } from '@/editor/hooks/useViewportStore'
import { useReactiveTool } from '@/editor/tools/system/hooks/useReactiveTool'
import type { ToolImplementation, ToolOverlayComponentProps } from '@/editor/tools/system/types'
import { SnappingLines } from '@/editor/utils/SnappingLines'

import type { BasePolygonTool, PolygonToolStateBase } from './BasePolygonTool'

export function PolygonToolOverlay<TTool extends BasePolygonTool<PolygonToolStateBase> & ToolImplementation>({
  tool
}: ToolOverlayComponentProps<TTool>): React.JSX.Element | null {
  const { state } = useReactiveTool(tool)
  const zoom = useZoom()

  const scaledLineWidth = Math.max(1, 2 / zoom)
  const dashSize = 10 / zoom
  const scaledDashPattern = `${dashSize} ${dashSize}`
  const scaledPointRadius = 5 / zoom
  const scaledPointStrokeWidth = 1 / zoom

  const previewPos = tool.getPreviewPosition()
  const isClosingSnap = tool.isSnappingToFirstPoint()

  const pointsString = state.points.map(p => `${p[0]},${p[1]}`).join(' ')

  return (
    <g pointerEvents="none">
      <SnappingLines snapResult={state.snapResult} />

      {state.points.length > 1 && (
        <polyline
          points={pointsString}
          fill="none"
          stroke="var(--color-gray-900)"
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
          stroke={state.isCurrentSegmentValid ? 'var(--color-gray-1000)' : 'var(--color-red-900)'}
          strokeWidth={scaledLineWidth}
          strokeDasharray={scaledDashPattern}
        />
      )}

      {state.points.length >= tool.getMinimumPointCount() && isClosingSnap && (
        <line
          x1={state.points[state.points.length - 1][0]}
          y1={state.points[state.points.length - 1][1]}
          x2={state.points[0][0]}
          y2={state.points[0][1]}
          stroke={state.isClosingSegmentValid ? 'var(--color-green-900)' : 'var(--color-red-900)'}
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
          fill={index === 0 ? 'var(--color-primary)' : 'var(--color-gray-900)'}
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
