import React from 'react'
import { Circle, Group, Rect, Text } from 'react-konva/lib/ReactKonvaCore'

import { useReactiveTool } from '@/editor/tools/system/hooks/useReactiveTool'
import type { ToolOverlayComponentProps } from '@/editor/tools/system/types'
import { COLORS } from '@/shared/theme/colors'

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

  return (
    <Group x={state.previewPosition[0]} y={state.previewPosition[1]} rotation={wallAngle} listening={false}>
      {/* Opening Preview */}
      <Rect
        x={0}
        y={0}
        width={state.width}
        height={wall.thickness}
        fill={state.canPlace ? COLORS.ui.success : COLORS.ui.danger}
        opacity={0.6}
        stroke={COLORS.ui.white}
        strokeWidth={3}
      />
      <Text
        text={getOpeningIcon(state.openingType)}
        fontSize={wall.thickness * 0.7}
        x={0}
        y={wall.thickness}
        width={state.width}
        height={wall.thickness}
        align="center"
        verticalAlign="middle"
        fill={COLORS.ui.white}
        fontFamily="Arial"
        scaleY={-1}
      />

      {/* Snap Indicator */}
      {state.snapDirection && (
        <Circle
          x={state.snapDirection === 'right' ? 0 : state.width}
          y={wall.thickness / 2}
          radius={wall.thickness * 0.15}
          fill={COLORS.snapping.highlight}
          stroke={COLORS.snapping.highlightStroke}
          strokeWidth={2}
          opacity={0.9}
        />
      )}
    </Group>
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
