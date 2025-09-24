import React from 'react'
import { Group, Line, Circle } from 'react-konva/lib/ReactKonvaCore'
import { COLORS } from '@/shared/theme/colors'
import { midpoint, add } from '@/shared/geometry'
import type { MovementPreviewComponentProps } from '../MovementBehavior'
import type { PerimeterWallEntityContext, PerimeterWallMovementState } from '../behaviors/PerimeterWallMovementBehavior'

export function PerimeterWallMovementPreview({
  movementState,
  isValid,
  context
}: MovementPreviewComponentProps<PerimeterWallEntityContext, PerimeterWallMovementState>): React.JSX.Element {
  const { wall } = context.entity
  const { projectedDelta, newBoundary } = movementState

  // Calculate original and new midpoints for visualization
  const originalMidpoint = midpoint(wall.insideLine.start, wall.insideLine.end)
  const newMidpoint = add(originalMidpoint, projectedDelta)

  return (
    <Group>
      {/* Show the new wall midpoint */}
      <Circle
        x={newMidpoint[0]}
        y={newMidpoint[1]}
        radius={20}
        fill={isValid ? COLORS.ui.success : COLORS.ui.danger}
        stroke={COLORS.ui.white}
        strokeWidth={2}
        opacity={0.8}
        listening={false}
      />

      {/* Show movement line */}
      <Line
        points={[originalMidpoint[0], originalMidpoint[1], newMidpoint[0], newMidpoint[1]]}
        stroke={COLORS.ui.gray600}
        strokeWidth={10}
        dash={[50, 50]}
        opacity={0.7}
        listening={false}
      />

      {/* Show the updated wall boundary preview */}
      <Line
        points={newBoundary.flatMap(p => [p[0], p[1]])}
        closed
        stroke={isValid ? COLORS.ui.success : COLORS.ui.danger}
        strokeWidth={10}
        dash={[80, 40]}
        opacity={0.6}
        listening={false}
      />
      <Line
        points={newBoundary.flatMap(p => [p[0], p[1]])}
        closed
        fill={isValid ? COLORS.ui.success : COLORS.ui.danger}
        opacity={0.3}
        listening={false}
      />
    </Group>
  )
}
