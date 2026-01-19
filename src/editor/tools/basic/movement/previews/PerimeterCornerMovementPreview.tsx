import React from 'react'

import type { MovementPreviewComponentProps } from '@/editor/tools/basic/movement/MovementBehavior'
import type {
  CornerEntityContext,
  CornerMovementState
} from '@/editor/tools/basic/movement/behaviors/PerimeterCornerMovementBehavior'
import { SnappingLines } from '@/editor/utils/SnappingLines'
import { polygonToSvgPath } from '@/shared/utils/svg'

export function PerimeterCornerMovementPreview({
  movementState,
  isValid,
  context
}: MovementPreviewComponentProps<CornerEntityContext, CornerMovementState>): React.JSX.Element {
  const { corner } = context.entity

  const boundaryPath = polygonToSvgPath({ points: movementState.newBoundary })

  return (
    <g pointerEvents="none">
      <SnappingLines snapResult={movementState.snapResult} />

      {/* Show the new corner position */}
      <circle
        cx={movementState.position[0]}
        cy={movementState.position[1]}
        r={30}
        fill={isValid ? 'var(--color-green-900)' : 'var(--color-red-900)'}
        stroke="var(--color-gray-100)"
        strokeWidth={5}
        opacity={0.8}
      />

      {/* Show movement line */}
      <line
        x1={corner.referencePoint[0]}
        y1={corner.referencePoint[1]}
        x2={movementState.position[0]}
        y2={movementState.position[1]}
        stroke="var(--color-gray-900)"
        strokeWidth={10}
        strokeDasharray="50 50"
        opacity={0.7}
      />

      {/* Show the updated wall boundary preview */}
      <path
        d={boundaryPath}
        fill="none"
        stroke={isValid ? 'var(--color-green-900)' : 'var(--color-red-900)'}
        strokeWidth={10}
        strokeDasharray="80 40"
        opacity={0.6}
      />
      <path
        d={boundaryPath}
        fill={isValid ? 'var(--color-green-900)' : 'var(--color-red-900)'}
        stroke="none"
        opacity={0.3}
      />
    </g>
  )
}
