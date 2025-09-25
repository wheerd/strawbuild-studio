import React from 'react'
import { Circle, Group, Line } from 'react-konva/lib/ReactKonvaCore'

import type { MovementPreviewComponentProps } from '@/editor/tools/basic/movement/MovementBehavior'
import type {
  CornerEntityContext,
  CornerMovementState
} from '@/editor/tools/basic/movement/behaviors/PerimeterCornerMovementBehavior'
import { COLORS } from '@/shared/theme/colors'

export function PerimeterCornerMovementPreview({
  movementState,
  isValid,
  context
}: MovementPreviewComponentProps<CornerEntityContext, CornerMovementState>): React.JSX.Element {
  const { wall, cornerIndex } = context.entity
  const originalPosition = wall.corners[cornerIndex].insidePoint

  return (
    <Group>
      {/* Show the new corner position */}
      <Circle
        x={movementState.position[0]}
        y={movementState.position[1]}
        radius={30}
        fill={isValid ? COLORS.ui.success : COLORS.ui.danger}
        stroke={COLORS.ui.white}
        strokeWidth={5}
        opacity={0.8}
        listening={false}
      />

      {/* Show movement line */}
      <Line
        points={[originalPosition[0], originalPosition[1], movementState.position[0], movementState.position[1]]}
        stroke={COLORS.ui.gray600}
        strokeWidth={10}
        dash={[50, 50]}
        opacity={0.7}
        listening={false}
      />

      {/* Show the updated wall boundary preview */}
      <Line
        points={movementState.newBoundary.flatMap(p => [p[0], p[1]])}
        closed
        stroke={isValid ? COLORS.ui.success : COLORS.ui.danger}
        strokeWidth={10}
        dash={[80, 40]}
        opacity={0.6}
        listening={false}
      />
      <Line
        points={movementState.newBoundary.flatMap(p => [p[0], p[1]])}
        closed
        fill={isValid ? COLORS.ui.success : COLORS.ui.danger}
        opacity={0.3}
        listening={false}
      />
    </Group>
  )
}
