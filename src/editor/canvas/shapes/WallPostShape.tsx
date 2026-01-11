import { Group, Line } from 'react-konva/lib/ReactKonvaCore'

import { type WallPostId, isOpeningId } from '@/building/model/ids'
import { useModelActions, usePerimeterCornerById, usePerimeterWallById, useWallPostById } from '@/building/store'
import { ClickableLengthIndicator } from '@/editor/canvas/utils/ClickableLengthIndicator'
import { LengthIndicator } from '@/editor/canvas/utils/LengthIndicator'
import { useSelectionStore } from '@/editor/hooks/useSelectionStore'
import { useViewportActions } from '@/editor/hooks/useViewportStore'
import { activateLengthInput } from '@/editor/services/length-input'
import { type Length, type Vec2, ZERO_VEC2, lerpVec2, midpoint } from '@/shared/geometry'
import { useFormatters } from '@/shared/i18n/useFormatters'
import { useCanvasTheme } from '@/shared/theme/CanvasThemeContext'
import { MATERIAL_COLORS } from '@/shared/theme/colors'

export function WallPostShape({ postId }: { postId: WallPostId }): React.JSX.Element {
  const { formatLength } = useFormatters()
  const select = useSelectionStore()
  const theme = useCanvasTheme()
  const modelActions = useModelActions()
  const viewportActions = useViewportActions()

  const post = useWallPostById(postId)
  const wall = usePerimeterWallById(post.wallId)
  const startCorner = usePerimeterCornerById(wall.startCornerId)
  const endCorner = usePerimeterCornerById(wall.endCornerId)

  // Get post geometry from store
  const postPolygonArray = post.polygon.points.flatMap((p: Vec2) => [p[0], p[1]])
  const insidePostStart = post.insideLine.start
  const insidePostEnd = post.insideLine.end
  const outsidePostStart = post.outsideLine.start
  const outsidePostEnd = post.outsideLine.end

  // Calculate layered sections for visual rendering (inside/center/outside thirds)
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
  const insidePolygonArray = insidePolygon.flatMap(point => [point[0], point[1]])
  const centerPolygonArray = centerPolygon.flatMap(point => [point[0], point[1]])
  const outsidePolygonArray = outsidePolygon.flatMap(point => [point[0], point[1]])

  const isPostSelected = select.isCurrentSelection(post.id)

  // Calculate post-to-post and post-to-opening distances
  const allObstacles = wall.entityIds
    .map(id => (isOpeningId(id) ? modelActions.getWallOpeningById(id) : modelActions.getWallPostById(id)))
    .sort((a, b) => a.centerOffsetFromWallStart - b.centerOffsetFromWallStart)

  const currentIndex = allObstacles.findIndex(o => o.id === post.id)
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
        ? midpoint(startCorner.insidePoint, post.insideLine.start)
        : measurementType === 'endCorner'
          ? midpoint(endCorner.insidePoint, post.insideLine.end)
          : measurementType === 'prevObstacle' && previousObstacle
            ? midpoint(previousObstacle.outsideLine.end, post.outsideLine.start)
            : nextObstacle
              ? midpoint(nextObstacle.outsideLine.start, post.outsideLine.end)
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
        const isValid = modelActions.isWallPostPlacementValid(wall.id, newCenterOffset, post.width, post.id)

        if (isValid) {
          modelActions.updateWallPost(post.id, { centerOffsetFromWallStart: newCenterOffset })
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
      parentIds={[post.perimeterId, post.wallId]}
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
      {(post.postType === 'inside' || post.postType === 'double') && (
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

      {post.postType === 'center' && (
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

      {(post.postType === 'outside' || post.postType === 'double') && (
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
            <ClickableLengthIndicator
              startPoint={previousObstacle.outsideLine.end}
              endPoint={post.outsideLine.start}
              offset={60}
              color={theme.textSecondary}
              fontSize={50}
              strokeWidth={4}
              onClick={measurement => {
                handleMeasurementClick(measurement, 'prevObstacle')
              }}
            />
          )}

          {nextObstacle && (
            <ClickableLengthIndicator
              startPoint={post.outsideLine.end}
              endPoint={nextObstacle.outsideLine.start}
              offset={60}
              color={theme.textSecondary}
              fontSize={50}
              strokeWidth={4}
              onClick={measurement => {
                handleMeasurementClick(measurement, 'nextObstacle')
              }}
            />
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
            startPoint={startCorner.insidePoint}
            endPoint={insidePostStart}
            offset={-60}
            color={theme.text}
            fontSize={50}
            strokeWidth={4}
            onClick={measurement => {
              handleMeasurementClick(measurement, 'startCorner')
            }}
          />
          <ClickableLengthIndicator
            startPoint={insidePostEnd}
            endPoint={endCorner.insidePoint}
            offset={-60}
            color={theme.text}
            fontSize={50}
            strokeWidth={4}
            onClick={measurement => {
              handleMeasurementClick(measurement, 'endCorner')
            }}
          />
          <ClickableLengthIndicator
            startPoint={startCorner.outsidePoint}
            endPoint={outsidePostStart}
            offset={hasNeighbors ? 120 : 60}
            color={theme.text}
            fontSize={50}
            strokeWidth={4}
            onClick={measurement => {
              handleMeasurementClick(measurement, 'startCorner')
            }}
          />
          <ClickableLengthIndicator
            startPoint={outsidePostEnd}
            endPoint={endCorner.outsidePoint}
            offset={hasNeighbors ? 120 : 60}
            color={theme.text}
            fontSize={50}
            strokeWidth={4}
            onClick={measurement => {
              handleMeasurementClick(measurement, 'endCorner')
            }}
          />
        </>
      )}
    </Group>
  )
}
