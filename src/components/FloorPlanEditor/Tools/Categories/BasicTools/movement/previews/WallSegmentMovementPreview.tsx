import React from 'react'
import { Group, Line, Circle } from 'react-konva'
import { COLORS } from '@/theme/colors'
import { midpoint, add } from '@/types/geometry'
import type { MovementPreviewComponentProps } from '../MovementBehavior'
import type { WallSegmentEntityContext, WallSegmentMovementState } from '../behaviors/WallSegmentMovementBehavior'

interface WallSegmentMovementPreviewProps
  extends MovementPreviewComponentProps<WallSegmentEntityContext, WallSegmentMovementState> {}

export function WallSegmentMovementPreview({
  movementState,
  isValid,
  context
}: WallSegmentMovementPreviewProps): React.JSX.Element {
  const { segment } = context.entity
  const { projectedDelta, newBoundary } = movementState

  // Calculate original and new midpoints for visualization
  const originalMidpoint = midpoint(segment.insideLine.start, segment.insideLine.end)
  const newMidpoint = add(originalMidpoint, projectedDelta)

  return (
    <Group>
      {/* Show the new segment midpoint */}
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
