import type { MovementPreviewComponentProps } from '@/editor/tools/basic/movement/MovementBehavior'
import type {
  WallPostEntityContext,
  WallPostMovementState
} from '@/editor/tools/basic/movement/behaviors/WallPostMovementBehavior'
import { addVec2, midpoint, scaleAddVec2, scaleVec2 } from '@/shared/geometry'
import { polygonToSvgPath } from '@/shared/utils/svg'

export function WallPostMovementPreview({
  movementState,
  context,
  isValid
}: MovementPreviewComponentProps<WallPostEntityContext, WallPostMovementState>): React.JSX.Element {
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
  const pathData = polygonToSvgPath({ points: postPolygon })

  // Movement indicator
  const base = midpoint(insideStart, outsideStart)
  const originalMid = scaleAddVec2(base, wall.direction, post.centerOffsetFromWallStart)
  const previewMid = scaleAddVec2(base, wall.direction, movementState.newOffset)

  const fillColor = isValid ? 'var(--color-green-900)' : 'var(--color-red-900)'

  return (
    <g pointerEvents="none">
      {/* Post preview */}
      <path
        d={pathData}
        fill={fillColor}
        opacity={0.6}
        stroke="var(--color-gray-100)"
        strokeWidth={5}
        strokeLinejoin="miter"
      />

      {/* Show movement indicator */}
      <line
        x1={originalMid[0]}
        y1={originalMid[1]}
        x2={previewMid[0]}
        y2={previewMid[1]}
        stroke="var(--color-gray-900)"
        strokeWidth={10}
        strokeDasharray="20 20"
        opacity={0.7}
      />
    </g>
  )
}
