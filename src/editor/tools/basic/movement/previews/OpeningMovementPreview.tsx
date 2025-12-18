import React from 'react'
import { Group, Line } from 'react-konva/lib/ReactKonvaCore'

import type { MovementPreviewComponentProps } from '@/editor/tools/basic/movement/MovementBehavior'
import type {
  OpeningEntityContext,
  OpeningMovementState
} from '@/editor/tools/basic/movement/behaviors/OpeningMovementBehavior'
import { scaleAddVec2 } from '@/shared/geometry'
import { useCanvasTheme } from '@/shared/theme/CanvasThemeContext'

export function OpeningMovementPreview({
  movementState,
  isValid,
  context
}: MovementPreviewComponentProps<OpeningEntityContext, OpeningMovementState>): React.JSX.Element {
  const theme = useCanvasTheme()
  const { wall, opening } = context.entity

  // Calculate the opening rectangle in new position
  const wallStart = wall.insideLine.start
  const outsideDirection = wall.outsideDirection
  const halfWidth = opening.width / 2

  const openingStart = scaleAddVec2(wallStart, wall.direction, movementState.newOffset - halfWidth)
  const openingEnd = scaleAddVec2(wallStart, wall.direction, movementState.newOffset + halfWidth)

  // Create opening rectangle
  const insideStart = openingStart
  const insideEnd = openingEnd
  const outsideStart = scaleAddVec2(openingStart, outsideDirection, wall.thickness)
  const outsideEnd = scaleAddVec2(openingEnd, outsideDirection, wall.thickness)

  // Original position for movement indicator
  const originalStart = scaleAddVec2(wallStart, wall.direction, opening.centerOffsetFromWallStart)

  return (
    <Group>
      {/* Show opening rectangle */}
      <Line
        points={[insideStart, insideEnd, outsideEnd, outsideStart].flatMap(p => [p[0], p[1]])}
        closed
        fill={isValid ? theme.success : theme.danger}
        stroke={theme.white}
        strokeWidth={5}
        opacity={0.6}
        listening={false}
      />

      {/* Show movement indicator */}
      <Line
        points={[originalStart[0], originalStart[1], openingStart[0], openingStart[1]]}
        stroke={theme.textSecondary}
        strokeWidth={10}
        dash={[20, 20]}
        opacity={0.7}
        listening={false}
      />
    </Group>
  )
}
