import React from 'react'
import { Group, Line } from 'react-konva'
import { COLORS } from '@/theme/colors'
import { add, scale } from '@/types/geometry'
import type { MovementPreviewComponentProps } from '../MovementBehavior'
import type { OpeningEntityContext, OpeningMovementState } from '../behaviors/OpeningMovementBehavior'

interface OpeningMovementPreviewProps
  extends MovementPreviewComponentProps<OpeningEntityContext, OpeningMovementState> {}

export function OpeningMovementPreview({
  movementState,
  isValid,
  context
}: OpeningMovementPreviewProps): React.JSX.Element {
  const { wall, opening } = context.entity

  // Calculate the opening rectangle in new position
  const wallStart = wall.insideLine.start
  const outsideDirection = wall.outsideDirection

  const openingStart = add(wallStart, scale(wall.direction, movementState.newOffset))
  const openingEnd = add(openingStart, scale(wall.direction, opening.width))

  // Create opening rectangle
  const insideStart = openingStart
  const insideEnd = openingEnd
  const outsideStart = add(openingStart, scale(outsideDirection, wall.thickness))
  const outsideEnd = add(openingEnd, scale(outsideDirection, wall.thickness))

  // Original position for movement indicator
  const originalStart = add(wallStart, scale(wall.direction, opening.offsetFromStart))

  return (
    <Group>
      {/* Show opening rectangle */}
      <Line
        points={[insideStart, insideEnd, outsideEnd, outsideStart].flatMap(p => [p[0], p[1]])}
        closed
        fill={isValid ? COLORS.ui.success : COLORS.ui.danger}
        stroke={COLORS.ui.white}
        strokeWidth={5}
        opacity={0.6}
        listening={false}
      />

      {/* Show movement indicator */}
      <Line
        points={[originalStart[0], originalStart[1], openingStart[0], openingStart[1]]}
        stroke={COLORS.ui.gray600}
        strokeWidth={10}
        dash={[20, 20]}
        opacity={0.7}
        listening={false}
      />
    </Group>
  )
}
