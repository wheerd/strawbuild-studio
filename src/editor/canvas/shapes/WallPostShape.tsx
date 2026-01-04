import { Group, Line } from 'react-konva/lib/ReactKonvaCore'

import type { PerimeterId } from '@/building/model/ids'
import type { PerimeterWall, WallPost } from '@/building/model/model'
import { useModelActions } from '@/building/store'
import { ClickableLengthIndicator } from '@/editor/canvas/utils/ClickableLengthIndicator'
import { LengthIndicator } from '@/editor/canvas/utils/LengthIndicator'
import { useSelectionStore } from '@/editor/hooks/useSelectionStore'
import { useViewportActions } from '@/editor/hooks/useViewportStore'
import { activateLengthInput } from '@/editor/services/length-input'
import {
  type Length,
  type Vec2,
  ZERO_VEC2,
  addVec2,
  lerpVec2,
  midpoint,
  scaleAddVec2,
  scaleVec2
} from '@/shared/geometry'
import { useFormatters } from '@/shared/i18n/useFormatters'
import { useCanvasTheme } from '@/shared/theme/CanvasThemeContext'
import { MATERIAL_COLORS } from '@/shared/theme/colors'

interface WallPostShapeProps {
  post: WallPost
  wall: PerimeterWall
  perimeterId: PerimeterId

  // Corner reference points (same as wall)
  insideStartCorner: Vec2
  insideEndCorner: Vec2
  outsideStartCorner: Vec2
  outsideEndCorner: Vec2
}

export function WallPostShape({
  post,
  wall,
  perimeterId,
  insideStartCorner,
  insideEndCorner,
  outsideStartCorner,
  outsideEndCorner
}: WallPostShapeProps): React.JSX.Element {
  const { formatLength } = useFormatters()
  const select = useSelectionStore()
  const theme = useCanvasTheme()
  const modelActions = useModelActions()
  const viewportActions = useViewportActions()

  // Extract wall geometry
  const insideStart = wall.insideLine.start
  const outsideStart = wall.outsideLine.start
  const wallVector = wall.direction

  // Calculate left edge from center position
  const offsetDistance = post.centerOffsetFromWallStart - post.width / 2
  const offsetStart = scaleVec2(wallVector, offsetDistance)
  const offsetEnd = scaleAddVec2(offsetStart, wallVector, post.width)

  // Calculate post polygon corners
  const insidePostStart = addVec2(insideStart, offsetStart)
  const insidePostEnd = addVec2(insideStart, offsetEnd)
  const outsidePostStart = addVec2(outsideStart, offsetStart)
  const outsidePostEnd = addVec2(outsideStart, offsetEnd)

  const postPolygon = [insidePostStart, insidePostEnd, outsidePostEnd, outsidePostStart]
  const insidePolygon = [
    insidePostStart,
    insidePostEnd,
    lerpVec2(insidePostEnd, outsidePostEnd, 1 / 3),
    lerpVec2(insidePostStart, outsidePostStart, 1 / 3)
  ]
  const centerPolygon = [
    lerpVec2(insidePostStart, outsidePostStart, 1 / 3),
    lerpVec2(insidePostEnd, outsidePostEnd, 1 / 3),
    lerpVec2(insidePostEnd, outsidePostEnd, 2 / 3),
    lerpVec2(insidePostStart, outsidePostStart, 2 / 3)
  ]
  const outsidePolygon = [
    outsidePostStart,
    outsidePostEnd,
    lerpVec2(insidePostEnd, outsidePostEnd, 2 / 3),
    lerpVec2(insidePostStart, outsidePostStart, 2 / 3)
  ]
  const postPolygonArray = postPolygon.flatMap(point => [point[0], point[1]])
  const insidePolygonArray = insidePolygon.flatMap(point => [point[0], point[1]])
  const centerPolygonArray = centerPolygon.flatMap(point => [point[0], point[1]])
  const outsidePolygonArray = outsidePolygon.flatMap(point => [point[0], point[1]])

  const isPostSelected = select.isCurrentSelection(post.id)

  // Calculate post-to-post and post-to-opening distances
  const sortedPosts = [...wall.posts].sort((a, b) => a.centerOffsetFromWallStart - b.centerOffsetFromWallStart)
  const sortedOpenings = [...wall.openings].sort((a, b) => a.centerOffsetFromWallStart - b.centerOffsetFromWallStart)

  // Combine and sort all obstacles
  const allObstacles = [
    ...sortedPosts.map(p => ({ id: p.id, center: p.centerOffsetFromWallStart, width: p.width, type: 'post' as const })),
    ...sortedOpenings.map(o => ({
      id: o.id,
      center: o.centerOffsetFromWallStart,
      width: o.width,
      type: 'opening' as const
    }))
  ].sort((a, b) => a.center - b.center)

  const currentIndex = allObstacles.findIndex(o => o.id === post.id && o.type === 'post')
  const previousObstacle = currentIndex > 0 ? allObstacles[currentIndex - 1] : null
  const nextObstacle = currentIndex < allObstacles.length - 1 ? allObstacles[currentIndex + 1] : null

  const hasNeighbors = allObstacles.length > 1

  // Handler for updating post position based on measurement clicks
  const handleMeasurementClick = (
    currentMeasurement: Length,
    measurementType: 'startCorner' | 'endCorner' | 'prevObstacle' | 'nextObstacle'
  ) => {
    // Calculate world position for the measurement
    const worldPosition =
      measurementType === 'startCorner'
        ? midpoint(insideStartCorner, insidePostStart)
        : measurementType === 'endCorner'
          ? midpoint(insidePostEnd, insideEndCorner)
          : measurementType === 'prevObstacle' && previousObstacle
            ? midpoint(
                scaleAddVec2(outsideStart, wall.direction, previousObstacle.center + previousObstacle.width / 2),
                scaleAddVec2(outsideStart, wall.direction, post.centerOffsetFromWallStart - post.width / 2)
              )
            : nextObstacle
              ? midpoint(
                  scaleAddVec2(outsideStart, wall.direction, post.centerOffsetFromWallStart + post.width / 2),
                  scaleAddVec2(outsideStart, wall.direction, nextObstacle.center - nextObstacle.width / 2)
                )
              : ZERO_VEC2

    const stagePos = viewportActions.worldToStage(worldPosition)
    activateLengthInput({
      showImmediately: true,
      position: { x: stagePos.x + 20, y: stagePos.y - 30 },
      initialValue: currentMeasurement,
      placeholder: 'Enter distance...',
      onCommit: enteredValue => {
        const rawDelta = enteredValue - currentMeasurement

        // Apply delta in the correct direction based on measurement type
        let actualDelta: Length
        if (measurementType === 'startCorner' || measurementType === 'prevObstacle') {
          actualDelta = rawDelta
        } else {
          actualDelta = -rawDelta
        }

        const newCenterOffset = post.centerOffsetFromWallStart + actualDelta

        // Validate the new position
        const isValid = modelActions.isPerimeterWallPostPlacementValid(
          perimeterId,
          wall.id,
          newCenterOffset,
          post.width,
          post.id
        )

        if (isValid) {
          modelActions.updatePerimeterWallPost(perimeterId, wall.id, post.id, {
            centerOffsetFromWallStart: newCenterOffset
          })
        } else {
          console.warn('Invalid post position:', formatLength(newCenterOffset))
        }
      },
      onCancel: () => {
        // Nothing to do on cancel
      }
    })
  }

  return (
    <Group
      name={`wall-post-${post.id}`}
      entityId={post.id}
      entityType="wall-post"
      parentIds={[perimeterId, wall.id]}
      listening
    >
      {/* Post rectangle - render as brown colored shape */}
      <Line
        points={postPolygonArray}
        fill={theme.bgCanvas80A}
        stroke={theme.border}
        strokeWidth={10}
        lineCap="butt"
        closed
        listening
      />

      {/* Position indicators */}
      {(post.type === 'inside' || post.type === 'double') && (
        <Line
          points={insidePolygonArray}
          fill={MATERIAL_COLORS.woodSupport}
          stroke={theme.border}
          strokeWidth={5}
          lineCap="butt"
          closed
          listening
        />
      )}

      {post.type === 'center' && (
        <Line
          points={centerPolygonArray}
          fill={MATERIAL_COLORS.woodSupport}
          stroke={theme.border}
          strokeWidth={5}
          lineCap="butt"
          closed
          listening
        />
      )}

      {(post.type === 'outside' || post.type === 'double') && (
        <Line
          points={outsidePolygonArray}
          fill={MATERIAL_COLORS.woodSupport}
          stroke={theme.border}
          strokeWidth={5}
          lineCap="butt"
          closed
          listening
        />
      )}

      {/* Length indicators when selected */}
      {isPostSelected && (
        <>
          {/* Obstacle-to-obstacle distance indicators (closest to wall) */}
          {previousObstacle && (
            <>
              {(() => {
                const prevEndOffset = previousObstacle.center + previousObstacle.width / 2
                const currentStartOffset = post.centerOffsetFromWallStart - post.width / 2
                const prevEndPoint = scaleAddVec2(outsideStart, wallVector, prevEndOffset)
                const currentStartPoint = scaleAddVec2(outsideStart, wallVector, currentStartOffset)
                return (
                  <ClickableLengthIndicator
                    startPoint={prevEndPoint}
                    endPoint={currentStartPoint}
                    offset={60}
                    color={theme.textSecondary}
                    fontSize={50}
                    strokeWidth={4}
                    onClick={measurement => handleMeasurementClick(measurement, 'prevObstacle')}
                  />
                )
              })()}
            </>
          )}

          {nextObstacle && (
            <>
              {(() => {
                const currentEndOffset = post.centerOffsetFromWallStart + post.width / 2
                const nextStartOffset = nextObstacle.center - nextObstacle.width / 2
                const currentEndPoint = scaleAddVec2(outsideStart, wallVector, currentEndOffset)
                const nextStartPoint = scaleAddVec2(outsideStart, wallVector, nextStartOffset)
                return (
                  <ClickableLengthIndicator
                    startPoint={currentEndPoint}
                    endPoint={nextStartPoint}
                    offset={60}
                    color={theme.textSecondary}
                    fontSize={50}
                    strokeWidth={4}
                    onClick={measurement => handleMeasurementClick(measurement, 'nextObstacle')}
                  />
                )
              })()}
            </>
          )}

          {/* Post width indicators (middle layer) */}
          <LengthIndicator
            startPoint={insidePostStart}
            endPoint={insidePostEnd}
            label={formatLength(post.width)}
            offset={-60}
            color={theme.primary}
            fontSize={50}
            strokeWidth={4}
          />
          <LengthIndicator
            startPoint={outsidePostStart}
            endPoint={outsidePostEnd}
            label={formatLength(post.width)}
            offset={hasNeighbors ? 90 : 60}
            color={theme.primary}
            fontSize={50}
            strokeWidth={4}
          />

          {/* Corner distance indicators (outermost layer) */}
          <ClickableLengthIndicator
            startPoint={insideStartCorner}
            endPoint={insidePostStart}
            offset={-60}
            color={theme.text}
            fontSize={50}
            strokeWidth={4}
            onClick={measurement => handleMeasurementClick(measurement, 'startCorner')}
          />
          <ClickableLengthIndicator
            startPoint={insidePostEnd}
            endPoint={insideEndCorner}
            offset={-60}
            color={theme.text}
            fontSize={50}
            strokeWidth={4}
            onClick={measurement => handleMeasurementClick(measurement, 'endCorner')}
          />
          <ClickableLengthIndicator
            startPoint={outsideStartCorner}
            endPoint={outsidePostStart}
            offset={hasNeighbors ? 120 : 60}
            color={theme.text}
            fontSize={50}
            strokeWidth={4}
            onClick={measurement => handleMeasurementClick(measurement, 'startCorner')}
          />
          <ClickableLengthIndicator
            startPoint={outsidePostEnd}
            endPoint={outsideEndCorner}
            offset={hasNeighbors ? 120 : 60}
            color={theme.text}
            fontSize={50}
            strokeWidth={4}
            onClick={measurement => handleMeasurementClick(measurement, 'endCorner')}
          />
        </>
      )}
    </Group>
  )
}
