import React from 'react'

import type { MovementPreviewComponentProps } from '@/editor/tools/basic/movement/MovementBehavior'
import type {
  PerimeterWallEntityContext,
  PerimeterWallMovementState
} from '@/editor/tools/basic/movement/behaviors/PerimeterWallMovementBehavior'
import { addVec2, midpoint } from '@/shared/geometry'
import { polygonToSvgPath } from '@/shared/utils/svg'

export function PerimeterWallMovementPreview({
  movementState,
  isValid,
  context
}: MovementPreviewComponentProps<PerimeterWallEntityContext, PerimeterWallMovementState>): React.JSX.Element {
  const { wall } = context.entity
  const { movementDelta, newBoundary } = movementState

  // Calculate original and new midpoints for visualization
  const originalMidpoint = midpoint(wall.insideLine.start, wall.insideLine.end)
  const newMidpoint = addVec2(originalMidpoint, movementDelta)

  const boundaryPath = polygonToSvgPath({ points: newBoundary })

  return (
    <g pointerEvents="none">
      {/* Show the new wall midpoint */}
      <circle
        cx={newMidpoint[0]}
        cy={newMidpoint[1]}
        r={20}
        fill={isValid ? 'var(--color-green-600)' : 'var(--color-red-600)'}
        stroke="var(--color-border-contrast)"
        strokeWidth={2}
        opacity={0.8}
      />

      {/* Show movement line */}
      <line
        x1={originalMidpoint[0]}
        y1={originalMidpoint[1]}
        x2={newMidpoint[0]}
        y2={newMidpoint[1]}
        stroke="var(--color-border-contrast)"
        strokeWidth={10}
        strokeDasharray="50 50"
        opacity={0.7}
      />

      {/* Show the updated wall boundary preview */}
      <path
        d={boundaryPath}
        fill="none"
        stroke={isValid ? 'var(--color-green-600)' : 'var(--color-red-600)'}
        strokeWidth={10}
        strokeDasharray="80 40"
        opacity={0.6}
      />
      <path
        d={boundaryPath}
        fill={isValid ? 'var(--color-green-600)' : 'var(--color-red-600)'}
        stroke="none"
        opacity={0.3}
      />
    </g>
  )
}
