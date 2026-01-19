import React from 'react'

import type { MovementPreviewComponentProps } from '@/editor/tools/basic/movement/MovementBehavior'
import type {
  OpeningEntityContext,
  OpeningMovementState
} from '@/editor/tools/basic/movement/behaviors/OpeningMovementBehavior'
import { scaleAddVec2 } from '@/shared/geometry'
import { polygonToSvgPath } from '@/shared/utils/svg'

export function OpeningMovementPreview({
  movementState,
  isValid,
  context
}: MovementPreviewComponentProps<OpeningEntityContext, OpeningMovementState>): React.JSX.Element {
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

  const pathData = polygonToSvgPath({ points: [insideStart, insideEnd, outsideEnd, outsideStart] })

  return (
    <g pointerEvents="none">
      {/* Show opening rectangle */}
      <path
        d={pathData}
        fill={isValid ? 'var(--color-green-900)' : 'var(--color-red-900)'}
        stroke="var(--color-gray-100)"
        strokeWidth={5}
        opacity={0.6}
      />

      {/* Show movement indicator */}
      <line
        x1={originalStart[0]}
        y1={originalStart[1]}
        x2={openingStart[0]}
        y2={openingStart[1]}
        stroke="var(--color-gray-900)"
        strokeWidth={10}
        strokeDasharray="20 20"
        opacity={0.7}
      />
    </g>
  )
}
