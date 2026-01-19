import { useReactiveTool } from '@/editor/tools/system/hooks/useReactiveTool'
import type { ToolOverlayComponentProps } from '@/editor/tools/system/types'
import { MATERIAL_COLORS } from '@/shared/theme/colors'

import type { AddPostTool } from './AddPostTool'

export function AddPostToolOverlay({ tool }: ToolOverlayComponentProps<AddPostTool>): React.JSX.Element | null {
  const { state } = useReactiveTool(tool)

  if (!state.hoveredPerimeterWall || !state.previewPosition || state.offset === undefined) {
    return null
  }

  const wall = state.hoveredPerimeterWall.wall
  const wallDirection = wall.direction
  const wallAngle = (Math.atan2(wallDirection[1], wallDirection[0]) * 180) / Math.PI

  const halfWidth = state.width / 2

  const fillColor = state.canPlace ? 'var(--color-gray-100)' : 'var(--color-red-900)'

  return (
    <g
      transform={`translate(${state.previewPosition[0]} ${state.previewPosition[1]}) rotate(${wallAngle})`}
      pointerEvents="none"
    >
      {/* Post preview */}
      <rect
        x={-halfWidth}
        y={0}
        opacity={0.6}
        width={state.width}
        height={wall.thickness}
        fill={fillColor}
        stroke="var(--color-gray-900)"
        strokeWidth={3}
      />

      {/* Position indicators */}
      {(tool.state.type === 'inside' || tool.state.type === 'double') && (
        <rect
          x={-halfWidth}
          y={0}
          width={state.width}
          height={wall.thickness / 3}
          fill={MATERIAL_COLORS.woodSupport}
          stroke="var(--color-gray-900)"
          strokeWidth={2}
        />
      )}

      {tool.state.type === 'center' && (
        <rect
          x={-halfWidth}
          y={wall.thickness / 3}
          width={state.width}
          height={wall.thickness / 3}
          fill={MATERIAL_COLORS.woodSupport}
          stroke="var(--color-gray-900)"
          strokeWidth={2}
        />
      )}

      {(tool.state.type === 'outside' || tool.state.type === 'double') && (
        <rect
          x={-halfWidth}
          y={(wall.thickness * 2) / 3}
          width={state.width}
          height={wall.thickness / 3}
          fill={MATERIAL_COLORS.woodSupport}
          stroke="var(--color-gray-900)"
          strokeWidth={2}
        />
      )}

      {/* Snap direction indicator */}
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
