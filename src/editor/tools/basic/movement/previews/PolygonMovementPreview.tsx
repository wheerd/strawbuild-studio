import type { vec2 } from 'gl-matrix'
import React from 'react'
import { Circle, Group, Line } from 'react-konva/lib/ReactKonvaCore'

import { SnappingLines } from '@/editor/canvas/utils/SnappingLines'
import type { MovementPreviewComponentProps } from '@/editor/tools/basic/movement/MovementBehavior'
import type { PolygonMovementState } from '@/editor/tools/basic/movement/behaviors/PolygonMovementBehavior'
import { useCanvasTheme } from '@/shared/theme/CanvasThemeContext'

function flattenPolygonPoints(points: readonly vec2[]): number[] {
  return points.flatMap(point => [point[0], point[1]])
}

export function PolygonMovementPreview<TEntity>({
  movementState,
  isValid
}: MovementPreviewComponentProps<TEntity, PolygonMovementState>): React.JSX.Element {
  const theme = useCanvasTheme()
  const flattenedPoints = flattenPolygonPoints(movementState.previewPolygon)

  return (
    <Group>
      <SnappingLines snapResult={movementState.snapResult} />

      {movementState.snapResult?.position && (
        <Circle
          x={movementState.snapResult.position[0]}
          y={movementState.snapResult.position[1]}
          radius={50}
          fill={theme.info}
          stroke={theme.white}
          strokeWidth={5}
          opacity={0.8}
          listening={false}
        />
      )}

      <Line
        points={flattenedPoints}
        closed
        stroke={isValid ? theme.success : theme.danger}
        strokeWidth={20}
        dash={[80, 40]}
        opacity={0.6}
        listening={false}
      />

      <Line
        points={flattenedPoints}
        closed
        fill={isValid ? theme.success : theme.danger}
        opacity={0.3}
        listening={false}
      />
    </Group>
  )
}
