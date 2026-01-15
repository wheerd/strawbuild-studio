import { Circle, Group, Rect } from 'react-konva/lib/ReactKonvaCore'

import { useReactiveTool } from '@/editor/tools/system/hooks/useReactiveTool'
import type { ToolOverlayComponentProps } from '@/editor/tools/system/types'
import { useCanvasTheme } from '@/shared/theme/CanvasThemeContext'
import { MATERIAL_COLORS } from '@/shared/theme/colors'

import type { AddPostTool } from './AddPostTool'

export function AddPostToolOverlay({ tool }: ToolOverlayComponentProps<AddPostTool>): React.JSX.Element | null {
  const { state } = useReactiveTool(tool)
  const theme = useCanvasTheme()

  if (!state.hoveredPerimeterWall || !state.previewPosition || state.offset === undefined) {
    return null
  }

  const wall = state.hoveredPerimeterWall.wall
  const wallDirection = wall.direction
  const wallAngle = (Math.atan2(wallDirection[1], wallDirection[0]) * 180) / Math.PI

  const halfWidth = state.width / 2

  const fillColor = state.canPlace ? 'var(--gray-1)' : theme.danger

  return (
    <Group x={state.previewPosition[0]} y={state.previewPosition[1]} rotation={wallAngle} listening={false}>
      {/* Post preview */}
      <Rect
        x={-halfWidth}
        y={0}
        opacity={0.6}
        width={state.width}
        height={wall.thickness}
        fill={fillColor}
        stroke={'var(--gray-11)'}
        strokeWidth={3}
      />

      {/* Position indicators */}
      {(tool.state.type === 'inside' || tool.state.type === 'double') && (
        <Rect
          x={-halfWidth}
          y={0}
          width={state.width}
          height={wall.thickness / 3}
          fill={MATERIAL_COLORS.woodSupport}
          stroke={'var(--gray-11)'}
          strokeWidth={2}
          listening={false}
        />
      )}

      {tool.state.type === 'center' && (
        <Rect
          x={-halfWidth}
          y={wall.thickness / 3}
          width={state.width}
          height={wall.thickness / 3}
          fill={MATERIAL_COLORS.woodSupport}
          stroke={'var(--gray-11)'}
          strokeWidth={2}
          listening={false}
        />
      )}

      {(tool.state.type === 'outside' || tool.state.type === 'double') && (
        <Rect
          x={-halfWidth}
          y={(wall.thickness * 2) / 3}
          width={state.width}
          height={wall.thickness / 3}
          fill={MATERIAL_COLORS.woodSupport}
          stroke={'var(--gray-11)'}
          strokeWidth={2}
          listening={false}
        />
      )}

      {/* Snap direction indicator */}
      {state.snapDirection && (
        <Circle
          x={state.snapDirection === 'right' ? -halfWidth : halfWidth}
          y={wall.thickness / 2}
          radius={wall.thickness * 0.15}
          fill={'var(--color-primary)'}
          stroke={'var(--gray-1)'}
          strokeWidth={2}
          opacity={0.9}
        />
      )}
    </Group>
  )
}
