import { Group, Line } from 'react-konva/lib/ReactKonvaCore'

import type { PerimeterId } from '@/building/model/ids'
import type { Opening, PerimeterWall } from '@/building/model/model'
import { useModelActions } from '@/building/store'
import { ClickableLengthIndicator } from '@/editor/canvas/utils/ClickableLengthIndicator'
import { LengthIndicator } from '@/editor/canvas/utils/LengthIndicator'
import { useSelectionStore } from '@/editor/hooks/useSelectionStore'
import { useViewportActions } from '@/editor/hooks/useViewportStore'
import { activateLengthInput } from '@/editor/services/length-input'
import { type Length, type Vec2, ZERO_VEC2, addVec2, midpoint, scaleAddVec2, scaleVec2 } from '@/shared/geometry'
import { useFormatters } from '@/shared/i18n/useFormatters'
import { useCanvasTheme } from '@/shared/theme/CanvasThemeContext'
import { MATERIAL_COLORS } from '@/shared/theme/colors'

interface OpeningShapeProps {
  opening: Opening
  wall: PerimeterWall
  perimeterId: PerimeterId

  // Corner reference points (same as wall wall)
  insideStartCorner: Vec2
  insideEndCorner: Vec2
  outsideStartCorner: Vec2
  outsideEndCorner: Vec2
}

export function OpeningShape({
  opening,
  wall,
  perimeterId,
  insideStartCorner,
  insideEndCorner,
  outsideStartCorner,
  outsideEndCorner
}: OpeningShapeProps): React.JSX.Element {
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
  const offsetDistance = opening.centerOffsetFromWallStart - opening.width / 2
  const centerStart = midpoint(insideStart, outsideStart)
  const offsetStart = scaleVec2(wallVector, offsetDistance)
  const offsetEnd = scaleAddVec2(offsetStart, wallVector, opening.width)
  const openingStart = scaleAddVec2(centerStart, wallVector, offsetDistance)
  const openingEnd = scaleAddVec2(openingStart, wallVector, opening.width)

  // Calculate opening polygon corners
  const insideOpeningStart = addVec2(insideStart, offsetStart)
  const insideOpeningEnd = addVec2(insideStart, offsetEnd)
  const outsideOpeningStart = addVec2(outsideStart, offsetStart)
  const outsideOpeningEnd = addVec2(outsideStart, offsetEnd)

  const openingPolygon = [insideOpeningStart, insideOpeningEnd, outsideOpeningEnd, outsideOpeningStart]
  const openingPolygonArray = openingPolygon.flatMap(point => [point[0], point[1]])

  const isOpeningSelected = select.isCurrentSelection(opening.id)

  // Calculate opening-to-opening distances
  const sortedOpenings = [...wall.openings].sort((a, b) => a.centerOffsetFromWallStart - b.centerOffsetFromWallStart)

  const currentIndex = sortedOpenings.findIndex(o => o.id === opening.id)
  const previousOpening = currentIndex > 0 ? sortedOpenings[currentIndex - 1] : null
  const nextOpening = currentIndex < sortedOpenings.length - 1 ? sortedOpenings[currentIndex + 1] : null

  const hasNeighbors = wall.openings.length > 1

  // Handler for updating opening position based on measurement clicks
  const handleMeasurementClick = (
    currentMeasurement: Length,
    measurementType: 'startCorner' | 'endCorner' | 'prevOpening' | 'nextOpening'
  ) => {
    // Calculate world position for the measurement
    const worldPosition =
      measurementType === 'startCorner'
        ? midpoint(insideStartCorner, insideOpeningStart)
        : measurementType === 'endCorner'
          ? midpoint(insideOpeningEnd, insideEndCorner)
          : measurementType === 'prevOpening' && previousOpening
            ? midpoint(
                scaleAddVec2(
                  outsideStart,
                  wall.direction,
                  previousOpening.centerOffsetFromWallStart + previousOpening.width / 2
                ),
                scaleAddVec2(outsideStart, wall.direction, opening.centerOffsetFromWallStart - opening.width / 2)
              )
            : nextOpening
              ? midpoint(
                  scaleAddVec2(outsideStart, wall.direction, opening.centerOffsetFromWallStart + opening.width / 2),
                  scaleAddVec2(
                    outsideStart,
                    wall.direction,
                    nextOpening.centerOffsetFromWallStart - nextOpening.width / 2
                  )
                )
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
        const isValid = modelActions.isPerimeterWallOpeningPlacementValid(
          perimeterId,
          wall.id,
          newCenterOffset,
          opening.width,
          opening.id
        )

        if (isValid) {
          modelActions.updatePerimeterWallOpening(perimeterId, wall.id, opening.id, {
            centerOffsetFromWallStart: newCenterOffset
          })
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
      parentIds={[perimeterId, wall.id]}
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
      {opening.type !== 'passage' && (
        <Line
          points={[openingStart[0], openingStart[1], openingEnd[0], openingEnd[1]]}
          stroke={opening.type === 'door' ? MATERIAL_COLORS.door : MATERIAL_COLORS.window}
          strokeWidth={60}
          lineCap="butt"
          listening
        />
      )}

      {/* Length indicators when selected */}
      {isOpeningSelected && (
        <>
          {/* Opening-to-opening distance indicators (closest to wall) */}
          {previousOpening && (
            <>
              {(() => {
                const prevEndOffset = previousOpening.centerOffsetFromWallStart + previousOpening.width / 2
                const currentStartOffset = opening.centerOffsetFromWallStart - opening.width / 2
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
                    onClick={measurement => handleMeasurementClick(measurement, 'prevOpening')}
                  />
                )
              })()}
            </>
          )}

          {nextOpening && (
            <>
              {(() => {
                const currentEndOffset = opening.centerOffsetFromWallStart + opening.width / 2
                const nextStartOffset = nextOpening.centerOffsetFromWallStart - nextOpening.width / 2
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
                    onClick={measurement => handleMeasurementClick(measurement, 'nextOpening')}
                  />
                )
              })()}
            </>
          )}

          {/* Opening width indicators (middle layer) */}
          <LengthIndicator
            startPoint={insideOpeningStart}
            endPoint={insideOpeningEnd}
            label={formatLength(opening.width)}
            offset={-60}
            color={theme.primary}
            fontSize={50}
            strokeWidth={4}
          />
          <LengthIndicator
            startPoint={outsideOpeningStart}
            endPoint={outsideOpeningEnd}
            label={formatLength(opening.width)}
            offset={hasNeighbors ? 90 : 60}
            color={theme.primary}
            fontSize={50}
            strokeWidth={4}
          />

          {/* Corner distance indicators (outermost layer) */}
          <ClickableLengthIndicator
            startPoint={insideStartCorner}
            endPoint={insideOpeningStart}
            offset={-60}
            color={theme.text}
            fontSize={50}
            strokeWidth={4}
            onClick={measurement => handleMeasurementClick(measurement, 'startCorner')}
          />
          <ClickableLengthIndicator
            startPoint={insideOpeningEnd}
            endPoint={insideEndCorner}
            offset={-60}
            color={theme.text}
            fontSize={50}
            strokeWidth={4}
            onClick={measurement => handleMeasurementClick(measurement, 'endCorner')}
          />
          <ClickableLengthIndicator
            startPoint={outsideStartCorner}
            endPoint={outsideOpeningStart}
            offset={hasNeighbors ? 120 : 60}
            color={theme.text}
            fontSize={50}
            strokeWidth={4}
            onClick={measurement => handleMeasurementClick(measurement, 'startCorner')}
          />
          <ClickableLengthIndicator
            startPoint={outsideOpeningEnd}
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
