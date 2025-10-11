import React from 'react'
import { Circle, Group, Line } from 'react-konva/lib/ReactKonvaCore'

import { SnappingLines } from '@/editor/canvas/utils/SnappingLines'
import type { MovementPreviewComponentProps } from '@/editor/tools/basic/movement/MovementBehavior'
import type {
  PerimeterEntityContext,
  PerimeterMovementState
} from '@/editor/tools/basic/movement/behaviors/PerimeterMovementBehavior'
import { add } from '@/shared/geometry'
import { useCanvasTheme } from '@/shared/theme/CanvasThemeContext'

export function PerimeterMovementPreview({
  movementState,
  isValid,
  context
}: MovementPreviewComponentProps<PerimeterEntityContext, PerimeterMovementState>): React.JSX.Element {
  const theme = useCanvasTheme()
  const perimeter = context.entity.perimeter
  const previewBoundary = perimeter.corners.map(corner => add(corner.insidePoint, movementState.movementDelta))

  return (
    <Group>
      <SnappingLines snapResult={movementState.snapResult} />

      {movementState.snapResult?.position && (
        <Circle
          x={movementState.snapResult?.position[0]}
          y={movementState.snapResult?.position[1]}
          radius={50}
          fill={theme.info}
          stroke={theme.white}
          strokeWidth={5}
          opacity={0.8}
          listening={false}
        />
      )}

      {/* Main polygon outline */}
      <Line
        points={previewBoundary.flatMap(p => [p[0], p[1]])}
        closed
        stroke={isValid ? theme.success : theme.danger}
        strokeWidth={20}
        dash={[80, 40]}
        opacity={0.6}
        listening={false}
      />

      {/* Semi-transparent fill for better visibility */}
      <Line
        points={previewBoundary.flatMap(p => [p[0], p[1]])}
        closed
        fill={isValid ? theme.success : theme.danger}
        opacity={0.3}
        listening={false}
      />
    </Group>
  )
}
