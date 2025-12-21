import { Circle, Group, Line } from 'react-konva/lib/ReactKonvaCore'

import { useReactiveTool } from '@/editor/tools/system/hooks/useReactiveTool'
import type { ToolOverlayComponentProps } from '@/editor/tools/system/types'
import { addVec2, scaleAddVec2, scaleVec2 } from '@/shared/geometry'
import { useCanvasTheme } from '@/shared/theme/CanvasThemeContext'

import type { AddPostTool } from './AddPostTool'

const POST_COLOR = '#8B4513' // Brown color for posts
const PREVIEW_OPACITY = 0.6

export function AddPostToolOverlay({ tool }: ToolOverlayComponentProps<AddPostTool>): React.JSX.Element | null {
  const { state } = useReactiveTool(tool)
  const theme = useCanvasTheme()

  if (!state.hoveredPerimeterWall || !state.previewPosition || state.offset === undefined) {
    return null
  }

  const wall = state.hoveredPerimeterWall.wall
  const insideStart = wall.insideLine.start
  const outsideStart = wall.outsideLine.start
  const wallVector = wall.direction
  const outsideDirection = wall.outsideDirection

  // Calculate post position
  const offsetDistance = state.offset - state.width / 2
  const offsetStart = scaleVec2(wallVector, offsetDistance)
  const offsetEnd = scaleAddVec2(offsetStart, wallVector, state.width)

  // Calculate post polygon corners
  const insidePostStart = addVec2(insideStart, offsetStart)
  const insidePostEnd = addVec2(insideStart, offsetEnd)
  const outsidePostStart = addVec2(outsideStart, offsetStart)
  const outsidePostEnd = addVec2(outsideStart, offsetEnd)

  const postPolygon = [insidePostStart, insidePostEnd, outsidePostEnd, outsidePostStart]
  const postPolygonArray = postPolygon.flatMap(point => [point[0], point[1]])

  // Calculate position indicator point
  const centerPoint = scaleAddVec2(insideStart, wallVector, state.offset)
  const outsideCenterPoint = scaleAddVec2(outsideStart, wallVector, state.offset)
  const midPointX = (centerPoint[0] + outsideCenterPoint[0]) / 2
  const midPointY = (centerPoint[1] + outsideCenterPoint[1]) / 2

  let positionIndicatorX: number
  let positionIndicatorY: number
  if (state.position === 'inside') {
    positionIndicatorX = midPointX + outsideDirection[0] * (-wall.thickness / 4)
    positionIndicatorY = midPointY + outsideDirection[1] * (-wall.thickness / 4)
  } else if (state.position === 'outside') {
    positionIndicatorX = midPointX + outsideDirection[0] * (wall.thickness / 4)
    positionIndicatorY = midPointY + outsideDirection[1] * (wall.thickness / 4)
  } else {
    positionIndicatorX = midPointX
    positionIndicatorY = midPointY
  }

  const strokeColor = state.canPlace ? theme.primary : theme.textSecondary
  const fillColor = state.canPlace ? POST_COLOR : theme.textSecondary

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

      {/* Snap direction indicator */}
      {state.snapDirection && (
        <Circle
          x={state.previewPosition[0]}
          y={state.previewPosition[1]}
          radius={15}
          fill={theme.warning}
          opacity={0.8}
          listening={false}
        />
      )}
    </Group>
  )
}
