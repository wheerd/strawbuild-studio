import React from 'react'
import { Circle, Group, Line } from 'react-konva/lib/ReactKonvaCore'

import type { MovementPreviewComponentProps } from '@/editor/tools/basic/movement/MovementBehavior'
import type {
  PerimeterWallEntityContext,
  PerimeterWallMovementState
} from '@/editor/tools/basic/movement/behaviors/PerimeterWallMovementBehavior'
import { addVec2, midpoint } from '@/shared/geometry'
import { useCanvasTheme } from '@/shared/theme/CanvasThemeContext'

export function PerimeterWallMovementPreview({
  movementState,
  isValid,
  context
}: MovementPreviewComponentProps<PerimeterWallEntityContext, PerimeterWallMovementState>): React.JSX.Element {
  const theme = useCanvasTheme()
  const { wall } = context.entity
  const { movementDelta, newBoundary } = movementState

  // Calculate original and new midpoints for visualization
  const originalMidpoint = midpoint(wall.insideLine.start, wall.insideLine.end)
  const newMidpoint = addVec2(originalMidpoint, movementDelta)

  return (
    <Group>
      {/* Show the new wall midpoint */}
      <Circle
        x={newMidpoint[0]}
        y={newMidpoint[1]}
        radius={20}
        fill={isValid ? theme.success : theme.danger}
        stroke={'var(--gray-1)'}
        strokeWidth={2}
        opacity={0.8}
        listening={false}
      />

      {/* Show movement line */}
      <Line
        points={[originalMidpoint[0], originalMidpoint[1], newMidpoint[0], newMidpoint[1]]}
        stroke={'var(--color-text-secondary)'}
        strokeWidth={10}
        dash={[50, 50]}
        opacity={0.7}
        listening={false}
      />

      {/* Show the updated wall boundary preview */}
      <Line
        points={newBoundary.flatMap(p => [p[0], p[1]])}
        closed
        stroke={isValid ? theme.success : theme.danger}
        strokeWidth={10}
        dash={[80, 40]}
        opacity={0.6}
        listening={false}
      />
      <Line
        points={newBoundary.flatMap(p => [p[0], p[1]])}
        closed
        fill={isValid ? theme.success : theme.danger}
        opacity={0.3}
        listening={false}
      />
    </Group>
  )
}
