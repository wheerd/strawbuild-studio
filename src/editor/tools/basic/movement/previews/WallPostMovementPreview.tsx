import { Group, Line } from 'react-konva/lib/ReactKonvaCore'

import type { MovementPreviewComponentProps } from '@/editor/tools/basic/movement/MovementBehavior'
import type {
  WallPostEntityContext,
  WallPostMovementState
} from '@/editor/tools/basic/movement/behaviors/WallPostMovementBehavior'
import { addVec2, midpoint, scaleAddVec2, scaleVec2 } from '@/shared/geometry'
import { useCanvasTheme } from '@/shared/theme/CanvasThemeContext'

export function WallPostMovementPreview({
  movementState,
  context,
  isValid
}: MovementPreviewComponentProps<WallPostEntityContext, WallPostMovementState>): React.JSX.Element {
  const theme = useCanvasTheme()
  const { wall, post } = context.entity

  // Extract wall geometry
  const insideStart = wall.insideLine.start
  const outsideStart = wall.outsideLine.start
  const wallVector = wall.direction

  // Calculate post position using the new offset
  const offsetDistance = movementState.newOffset - post.width / 2
  const offsetStart = scaleVec2(wallVector, offsetDistance)
  const offsetEnd = scaleAddVec2(offsetStart, wallVector, post.width)

  // Calculate post polygon corners
  const insidePostStart = addVec2(insideStart, offsetStart)
  const insidePostEnd = addVec2(insideStart, offsetEnd)
  const outsidePostStart = addVec2(outsideStart, offsetStart)
  const outsidePostEnd = addVec2(outsideStart, offsetEnd)

  const postPolygon = [insidePostStart, insidePostEnd, outsidePostEnd, outsidePostStart]
  const postPolygonArray = postPolygon.flatMap(point => [point[0], point[1]])

  // Movement indicator
  const base = midpoint(insideStart, outsideStart)
  const originalMid = scaleAddVec2(base, wall.direction, post.centerOffsetFromWallStart)
  const previewMid = scaleAddVec2(base, wall.direction, movementState.newOffset)

  const fillColor = isValid ? theme.success : theme.danger

  return (
    <Group listening={false}>
      {/* Post preview */}
      <Line
        points={postPolygonArray}
        fill={fillColor}
        opacity={0.6}
        stroke={'var(--gray-1)'}
        strokeWidth={5}
        lineCap="butt"
        closed
        listening={false}
      />

      {/* Show movement indicator */}
      <Line
        points={[originalMid[0], originalMid[1], previewMid[0], previewMid[1]]}
        stroke={'var(--color-text-secondary)'}
        strokeWidth={10}
        dash={[20, 20]}
        opacity={0.7}
        listening={false}
      />
    </Group>
  )
}
