import React from 'react'

import type { MovementPreviewComponentProps } from '@/editor/tools/basic/movement/MovementBehavior'
import type { PolygonMovementState } from '@/editor/tools/basic/movement/behaviors/PolygonMovementBehavior'
import { SnappingLines } from '@/editor/utils/SnappingLines'
import type { Vec2 } from '@/shared/geometry'
import { polygonToSvgPath } from '@/shared/utils/svg'

export function PolygonMovementPreview<TEntity>({
  movementState,
  isValid
}: MovementPreviewComponentProps<TEntity, PolygonMovementState>): React.JSX.Element {
  const pathData = polygonToSvgPath({ points: movementState.previewPolygon as Vec2[] })

  return (
    <g pointerEvents="none">
      <SnappingLines snapResult={movementState.snapResult} />

      {movementState.snapResult?.position && (
        <circle
          cx={movementState.snapResult.position[0]}
          cy={movementState.snapResult.position[1]}
          r={50}
          fill="var(--color-blue-900)"
          stroke="var(--color-schematic-gray-1)"
          strokeWidth={5}
          opacity={0.8}
        />
      )}

      <path
        d={pathData}
        fill="none"
        stroke={isValid ? 'var(--color-green-900)' : 'var(--color-red-900)'}
        strokeWidth={20}
        strokeDasharray="80 40"
        opacity={0.6}
      />

      <path
        d={pathData}
        fill={isValid ? 'var(--color-green-900)' : 'var(--color-red-900)'}
        stroke="none"
        opacity={0.3}
      />
    </g>
  )
}
