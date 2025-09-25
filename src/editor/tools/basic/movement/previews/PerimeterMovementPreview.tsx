import React from 'react'
import { Group, Line } from 'react-konva/lib/ReactKonvaCore'

import type { Perimeter } from '@/building/model/model'
import type { MovementPreviewComponentProps } from '@/editor/tools/basic/movement/MovementBehavior'
import type { PerimeterMovementState } from '@/editor/tools/basic/movement/behaviors/PerimeterMovementBehavior'
import { add } from '@/shared/geometry'
import { COLORS } from '@/shared/theme/colors'

export function PerimeterMovementPreview({
  movementState,
  isValid,
  context
}: MovementPreviewComponentProps<Perimeter, PerimeterMovementState>): React.JSX.Element {
  const previewBoundary = context.entity.corners.map(corner => add(corner.insidePoint, movementState.offset))

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
