import React from 'react'
import { Group, Line } from 'react-konva'
import { COLORS } from '@/theme/colors'
import { add } from '@/types/geometry'
import type { MovementPreviewComponentProps } from '../MovementBehavior'
import type { Perimeter } from '@/types/model'
import type { PerimeterMovementState } from '../behaviors/PerimeterMovementBehavior'

interface PerimeterMovementPreviewProps extends MovementPreviewComponentProps<Perimeter, PerimeterMovementState> {}

export function PerimeterMovementPreview({
  movementState,
  isValid,
  context
}: PerimeterMovementPreviewProps): React.JSX.Element {
  const previewBoundary = context.entity.boundary.map(point => add(point, movementState.offset))

  return (
    <Group>
      {/* Main polygon outline */}
      <Line
        points={previewBoundary.flatMap(p => [p[0], p[1]])}
        closed
        stroke={isValid ? COLORS.ui.success : COLORS.ui.danger}
        strokeWidth={20}
        dash={[80, 40]}
        opacity={0.6}
        listening={false}
      />

      {/* Semi-transparent fill for better visibility */}
      <Line
        points={previewBoundary.flatMap(p => [p[0], p[1]])}
        closed
        fill={isValid ? COLORS.ui.success : COLORS.ui.danger}
        opacity={0.3}
        listening={false}
      />
    </Group>
  )
}
