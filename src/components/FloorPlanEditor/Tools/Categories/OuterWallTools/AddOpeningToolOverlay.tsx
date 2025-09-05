import React, { useEffect, useState } from 'react'
import { Group, Rect, Text, Circle } from 'react-konva'
import type { ToolOverlayComponentProps } from '../../ToolSystem/types'
import type { AddOpeningTool } from './AddOpeningTool'
import { COLORS } from '@/theme/colors'

interface AddOpeningToolOverlayProps extends ToolOverlayComponentProps<AddOpeningTool> {}

/**
 * React overlay component for AddOpeningTool with zoom-responsive rendering.
 */
export function AddOpeningToolOverlay({ tool }: AddOpeningToolOverlayProps): React.JSX.Element | null {
  // Force re-renders when tool state changes
  const [, forceUpdate] = useState({})

  useEffect(() => {
    const unsubscribe = tool.onRenderNeeded(() => {
      forceUpdate({})
    })
    return unsubscribe
  }, [tool])

  // Don't render anything if no preview state
  if (!tool.state.hoveredWallSegment || !tool.state.previewPosition) {
    return null
  }

  const segment = tool.state.hoveredWallSegment.segment
  const wallDirection = segment.direction
  const wallAngle = (Math.atan2(wallDirection[1], wallDirection[0]) * 180) / Math.PI

  return (
    <Group x={tool.state.previewPosition[0]} y={tool.state.previewPosition[1]} rotation={wallAngle} listening={false}>
      {/* Opening Preview */}
      <Rect
        x={0}
        y={0}
        width={tool.state.width}
        height={segment.thickness}
        fill={tool.state.canPlace ? COLORS.ui.success : COLORS.ui.danger}
        opacity={0.6}
        stroke={COLORS.ui.white}
        strokeWidth={3}
      />
      <Text
        text={getOpeningIcon(tool.state.openingType)}
        fontSize={segment.thickness * 0.7}
        x={0}
        y={0}
        width={tool.state.width}
        height={segment.thickness}
        align="center"
        verticalAlign="middle"
        fill={COLORS.ui.white}
        fontFamily="Arial"
      />

      {/* Snap Indicator */}
      {tool.state.snapDirection && (
        <Circle
          x={tool.state.snapDirection === 'right' ? 0 : tool.state.width}
          y={segment.thickness / 2}
          radius={segment.thickness * 0.15}
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
