import { Circle, Group, Line } from 'react-konva/lib/ReactKonvaCore'

import type { MovementPreviewComponentProps } from '@/editor/tools/basic/movement/MovementBehavior'
import type {
  WallPostEntityContext,
  WallPostMovementState
} from '@/editor/tools/basic/movement/behaviors/WallPostMovementBehavior'
import { addVec2, scaleAddVec2, scaleVec2 } from '@/shared/geometry'
import { useCanvasTheme } from '@/shared/theme/CanvasThemeContext'

const POST_COLOR = '#8B4513' // Brown color for posts
const PREVIEW_OPACITY = 0.7

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
  const outsideDirection = wall.outsideDirection

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

  // Calculate position indicator
  const centerPoint = scaleAddVec2(insideStart, wallVector, movementState.newOffset)
  const outsideCenterPoint = scaleAddVec2(outsideStart, wallVector, movementState.newOffset)
  const midPointX = (centerPoint[0] + outsideCenterPoint[0]) / 2
  const midPointY = (centerPoint[1] + outsideCenterPoint[1]) / 2

  let positionIndicatorX: number
  let positionIndicatorY: number
  if (post.position === 'inside') {
    positionIndicatorX = midPointX + outsideDirection[0] * (-wall.thickness / 4)
    positionIndicatorY = midPointY + outsideDirection[1] * (-wall.thickness / 4)
  } else if (post.position === 'outside') {
    positionIndicatorX = midPointX + outsideDirection[0] * (wall.thickness / 4)
    positionIndicatorY = midPointY + outsideDirection[1] * (wall.thickness / 4)
  } else {
    positionIndicatorX = midPointX
    positionIndicatorY = midPointY
  }

  const strokeColor = isValid ? theme.primary : theme.textSecondary
  const fillColor = isValid ? POST_COLOR : theme.textSecondary

  return (
    <Group listening={false}>
      {/* Post preview */}
      <Line
        points={postPolygonArray}
        fill={fillColor}
        opacity={PREVIEW_OPACITY}
        stroke={strokeColor}
        strokeWidth={10}
        lineCap="butt"
        closed
        listening={false}
      />

      {/* Position indicator */}
      <Circle
        x={positionIndicatorX}
        y={positionIndicatorY}
        radius={30}
        fill={strokeColor}
        opacity={PREVIEW_OPACITY}
        stroke={theme.border}
        strokeWidth={5}
        listening={false}
      />
    </Group>
  )
}
