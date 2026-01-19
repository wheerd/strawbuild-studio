import React from 'react'

import { useReactiveTool } from '@/editor/tools/system/hooks/useReactiveTool'
import type { ToolOverlayComponentProps } from '@/editor/tools/system/types'

import type { AddOpeningTool } from './AddOpeningTool'

/**
 * React overlay component for AddOpeningTool with zoom-responsive rendering.
 */
export function AddOpeningToolOverlay({ tool }: ToolOverlayComponentProps<AddOpeningTool>): React.JSX.Element | null {
  const { state } = useReactiveTool(tool)

  // Don't render anything if no preview state
  if (!state.hoveredPerimeterWall || !state.previewPosition) {
    return null
  }

  const wall = state.hoveredPerimeterWall.wall
  const wallDirection = wall.direction
  const wallAngle = (Math.atan2(wallDirection[1], wallDirection[0]) * 180) / Math.PI

  const halfWidth = state.width / 2

  return (
    <g
      transform={`translate(${state.previewPosition[0]} ${state.previewPosition[1]}) rotate(${wallAngle})`}
      pointerEvents="none"
    >
      {/* Opening Preview */}
      <rect
        x={-halfWidth}
        y={0}
        width={state.width}
        height={wall.thickness}
        fill={
          state.canPlace
            ? tool.getNeedsConversion()
              ? 'var(--color-orange-1000)'
              : 'var(--color-green-900)'
            : 'var(--color-red-900)'
        }
        opacity={0.6}
        stroke="var(--color-gray-100)"
        strokeWidth={3}
      />
      <g transform={`translate(0 ${wall.thickness}) scale(1, -1)`}>
        <text
          x={0}
          y={wall.thickness / 2}
          fontSize={wall.thickness * 0.7}
          textAnchor="middle"
          dominantBaseline="central"
          fill="var(--color-gray-100)"
          fontFamily="Arial"
        >
          {tool.getNeedsConversion() ? '⚠' : getOpeningIcon(state.openingType)}
        </text>
      </g>

      {/* Snap Indicator */}
      {state.snapDirection && (
        <circle
          cx={state.snapDirection === 'right' ? -halfWidth : halfWidth}
          cy={wall.thickness / 2}
          r={wall.thickness * 0.15}
          fill="var(--color-primary)"
          stroke="var(--color-gray-100)"
          strokeWidth={2}
          opacity={0.9}
        />
      )}
    </g>
  )
}

function getOpeningIcon(openingType: string): string {
  switch (openingType) {
    case 'door':
      return '🚪'
    case 'window':
      return '🪟'
    case 'passage':
      return '⬜'
    default:
      return '⬜'
  }
}
