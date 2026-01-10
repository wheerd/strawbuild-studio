import { Group, Line } from 'react-konva/lib/ReactKonvaCore'

import { type OpeningId, isOpeningId } from '@/building/model/ids'
import { useModelActions, usePerimeterCornerById, usePerimeterWallById, useWallOpeningById } from '@/building/store'
import { ClickableLengthIndicator } from '@/editor/canvas/utils/ClickableLengthIndicator'
import { LengthIndicator } from '@/editor/canvas/utils/LengthIndicator'
import { useSelectionStore } from '@/editor/hooks/useSelectionStore'
import { useViewportActions } from '@/editor/hooks/useViewportStore'
import { activateLengthInput } from '@/editor/services/length-input'
import { type Length, type Vec2, ZERO_VEC2, midpoint } from '@/shared/geometry'
import { useFormatters } from '@/shared/i18n/useFormatters'
import { useCanvasTheme } from '@/shared/theme/CanvasThemeContext'
import { MATERIAL_COLORS } from '@/shared/theme/colors'

export function OpeningShape({ openingId }: { openingId: OpeningId }): React.JSX.Element {
  const { formatLength } = useFormatters()
  const select = useSelectionStore()
  const theme = useCanvasTheme()
  const modelActions = useModelActions()
  const viewportActions = useViewportActions()

  const opening = useWallOpeningById(openingId)
  const wall = usePerimeterWallById(opening.wallId)
  const startCorner = usePerimeterCornerById(wall.startCornerId)
  const endCorner = usePerimeterCornerById(wall.endCornerId)

  const openingPolygonArray = opening.polygon.points.flatMap((p: Vec2) => [p[0], p[1]])
  const centerLineStart = midpoint(opening.insideLine.start, opening.outsideLine.start)
  const centerLineEnd = midpoint(opening.insideLine.end, opening.outsideLine.end)

  const isOpeningSelected = select.isCurrentSelection(opening.id)

  // Calculate opening-to-opening distances
  const allObstacles = wall.entityIds
    .map(id => (isOpeningId(id) ? modelActions.getWallOpeningById(id) : modelActions.getWallPostById(id)))
    .sort((a, b) => a.centerOffsetFromWallStart - b.centerOffsetFromWallStart)

  const currentIndex = allObstacles.findIndex(o => o.id === opening.id)
  const previousObstacle = currentIndex > 0 ? allObstacles[currentIndex - 1] : null
  const nextObstacle = currentIndex < allObstacles.length - 1 ? allObstacles[currentIndex + 1] : null

  const hasNeighbors = wall.entityIds.length > 1

  // Handler for updating opening position based on measurement clicks
  const handleMeasurementClick = (
    currentMeasurement: Length,
    measurementType: 'startCorner' | 'endCorner' | 'prevOpening' | 'nextOpening'
  ) => {
    // Calculate world position for the measurement
    const worldPosition =
      measurementType === 'startCorner'
        ? midpoint(startCorner.insidePoint, opening.insideLine.start)
        : measurementType === 'endCorner'
          ? midpoint(endCorner.insidePoint, opening.insideLine.end)
          : measurementType === 'prevOpening' && previousObstacle
            ? midpoint(previousObstacle.outsideLine.end, opening.outsideLine.start)
            : nextObstacle
              ? midpoint(nextObstacle.outsideLine.start, opening.outsideLine.end)
              : ZERO_VEC2

    const stagePos = viewportActions.worldToStage(worldPosition)
    // Add small offset to position input near the indicator
    // Bounds checking is now handled by the LengthInputService
    activateLengthInput({
      showImmediately: true,
      position: { x: stagePos.x + 20, y: stagePos.y - 30 },
      initialValue: currentMeasurement,
      placeholder: 'Enter distance...',
      onCommit: enteredValue => {
        const rawDelta = enteredValue - currentMeasurement

        // Apply delta in the correct direction based on measurement type
        let actualDelta: Length
        if (measurementType === 'startCorner' || measurementType === 'prevOpening') {
          // For start corner and prev opening distances: positive delta moves opening away from start
          actualDelta = rawDelta
        } else {
          // For end corner and next opening distances: positive delta moves opening toward start (negative offset change)
          actualDelta = -rawDelta
        }

        const newCenterOffset = opening.centerOffsetFromWallStart + actualDelta

        // Validate the new position
        const isValid = modelActions.isWallOpeningPlacementValid(wall.id, newCenterOffset, opening.width, opening.id)

        if (isValid) {
          modelActions.updateWallOpening(opening.id, { centerOffsetFromWallStart: newCenterOffset })
        } else {
          // Could add error feedback here in the future
          console.warn('Invalid opening position:', formatLength(newCenterOffset))
        }
      },
      onCancel: () => {
        // Nothing to do on cancel
      }
    })
  }

  return (
    <Group
      name={`opening-${opening.id}`}
      entityId={opening.id}
      entityType="opening"
      parentIds={[opening.perimeterId, opening.wallId]}
      listening
    >
      {/* Opening cutout - render as a different colored line */}
      <Line
        points={openingPolygonArray}
        fill={theme.bgCanvas80A}
        stroke={theme.border}
        strokeWidth={10}
        lineCap="butt"
        closed
        listening
      />

      {/* Door/Window indicator line */}
      {opening.openingType !== 'passage' && (
        <Line
          points={[centerLineStart[0], centerLineStart[1], centerLineEnd[0], centerLineEnd[1]]}
          stroke={opening.openingType === 'door' ? MATERIAL_COLORS.door : MATERIAL_COLORS.window}
          strokeWidth={60}
          lineCap="butt"
          listening
        />
      )}

      {/* Length indicators when selected */}
      {isOpeningSelected && (
        <>
          {/* Opening-to-opening distance indicators (closest to wall) */}
          {previousObstacle && (
            <ClickableLengthIndicator
              startPoint={previousObstacle.outsideLine.end}
              endPoint={opening.outsideLine.start}
              offset={60}
              color={theme.textSecondary}
              fontSize={50}
              strokeWidth={4}
              onClick={measurement => handleMeasurementClick(measurement, 'prevOpening')}
            />
          )}

          {nextObstacle && (
            <ClickableLengthIndicator
              startPoint={opening.outsideLine.end}
              endPoint={nextObstacle.outsideLine.start}
              offset={60}
              color={theme.textSecondary}
              fontSize={50}
              strokeWidth={4}
              onClick={measurement => handleMeasurementClick(measurement, 'nextOpening')}
            />
          )}

          {/* Opening width indicators (middle layer) */}
          <LengthIndicator
            startPoint={opening.insideLine.start}
            endPoint={opening.insideLine.end}
            label={formatLength(opening.width)}
            offset={-60}
            color={theme.primary}
            fontSize={50}
            strokeWidth={4}
          />
          <LengthIndicator
            startPoint={opening.outsideLine.start}
            endPoint={opening.outsideLine.end}
            label={formatLength(opening.width)}
            offset={hasNeighbors ? 90 : 60}
            color={theme.primary}
            fontSize={50}
            strokeWidth={4}
          />

          {/* Corner distance indicators (outermost layer) */}
          <ClickableLengthIndicator
            startPoint={startCorner.insidePoint}
            endPoint={opening.insideLine.start}
            offset={-60}
            color={theme.text}
            fontSize={50}
            strokeWidth={4}
            onClick={measurement => handleMeasurementClick(measurement, 'startCorner')}
          />
          <ClickableLengthIndicator
            startPoint={opening.insideLine.end}
            endPoint={endCorner.insidePoint}
            offset={-60}
            color={theme.text}
            fontSize={50}
            strokeWidth={4}
            onClick={measurement => handleMeasurementClick(measurement, 'endCorner')}
          />
          <ClickableLengthIndicator
            startPoint={startCorner.outsidePoint}
            endPoint={opening.outsideLine.start}
            offset={hasNeighbors ? 120 : 60}
            color={theme.text}
            fontSize={50}
            strokeWidth={4}
            onClick={measurement => handleMeasurementClick(measurement, 'startCorner')}
          />
          <ClickableLengthIndicator
            startPoint={opening.outsideLine.end}
            endPoint={endCorner.outsidePoint}
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
