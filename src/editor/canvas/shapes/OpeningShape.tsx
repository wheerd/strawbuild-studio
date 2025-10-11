import { Group, Line } from 'react-konva/lib/ReactKonvaCore'

import type { PerimeterId } from '@/building/model/ids'
import type { Opening, PerimeterWall } from '@/building/model/model'
import { useModelActions } from '@/building/store'
import { ClickableLengthIndicator } from '@/editor/canvas/utils/ClickableLengthIndicator'
import { LengthIndicator } from '@/editor/canvas/utils/LengthIndicator'
import { useSelectionStore } from '@/editor/hooks/useSelectionStore'
import { useViewportActions } from '@/editor/hooks/useViewportStore'
import { activateLengthInput } from '@/editor/services/length-input'
import { type Length, type Vec2, add, createLength, midpoint, scale } from '@/shared/geometry'
import { useCanvasTheme } from '@/shared/theme/CanvasThemeContext'
import { MATERIAL_COLORS } from '@/shared/theme/colors'
import { formatLength } from '@/shared/utils/formatLength'

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
  const select = useSelectionStore()
  const theme = useCanvasTheme()
  const modelActions = useModelActions()
  const viewportActions = useViewportActions()

  // Extract wall geometry
  const insideStart = wall.insideLine.start
  const outsideStart = wall.outsideLine.start
  const wallVector = wall.direction
  const offsetDistance = opening.offsetFromStart
  const centerStart = midpoint(insideStart, outsideStart)
  const offsetStart = scale(wallVector, offsetDistance)
  const offsetEnd = add(offsetStart, scale(wallVector, opening.width))
  const openingStart = add(centerStart, scale(wallVector, offsetDistance))
  const openingEnd = add(openingStart, scale(wallVector, opening.width))

  // Calculate opening polygon corners
  const insideOpeningStart = add(insideStart, offsetStart)
  const insideOpeningEnd = add(insideStart, offsetEnd)
  const outsideOpeningStart = add(outsideStart, offsetStart)
  const outsideOpeningEnd = add(outsideStart, offsetEnd)

  const openingPolygon = [insideOpeningStart, insideOpeningEnd, outsideOpeningEnd, outsideOpeningStart]
  const openingPolygonArray = openingPolygon.flatMap(point => [point[0], point[1]])

  const isOpeningSelected = select.isCurrentSelection(opening.id)

  // Calculate opening-to-opening distances
  const sortedOpenings = [...wall.openings].sort((a, b) => a.offsetFromStart - b.offsetFromStart)

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
                add(outsideStart, scale(wall.direction, previousOpening.offsetFromStart + previousOpening.width)),
                add(outsideStart, scale(wall.direction, opening.offsetFromStart))
              )
            : nextOpening
              ? midpoint(
                  add(outsideStart, scale(wall.direction, opening.offsetFromStart + opening.width)),
                  add(outsideStart, scale(wall.direction, nextOpening.offsetFromStart))
                )
              : ([0, 0] as Vec2)

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
          actualDelta = createLength(rawDelta)
        } else {
          // For end corner and next opening distances: positive delta moves opening toward start (negative offset change)
          actualDelta = createLength(-rawDelta)
        }

        const newOffsetFromStart = createLength(opening.offsetFromStart + actualDelta)

        // Validate the new position
        const isValid = modelActions.isPerimeterWallOpeningPlacementValid(
          perimeterId,
          wall.id,
          newOffsetFromStart,
          opening.width,
          opening.id
        )

        if (isValid) {
          modelActions.updatePerimeterWallOpening(perimeterId, wall.id, opening.id, {
            offsetFromStart: newOffsetFromStart
          })
        } else {
          // Could add error feedback here in the future
          console.warn('Invalid opening position:', formatLength(newOffsetFromStart))
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
        fill={isOpeningSelected ? theme.primaryLight : theme.bgCanvas}
        stroke={isOpeningSelected ? theme.primaryLightOutline : theme.black}
        strokeWidth={10}
        lineCap="butt"
        opacity={0.8}
        closed
        listening
      />

      {/* Door/Window indicator line */}
      {opening.type !== 'passage' && (
        <Line
          points={[openingStart[0], openingStart[1], openingEnd[0], openingEnd[1]]}
          stroke={opening.type === 'door' ? MATERIAL_COLORS.door : MATERIAL_COLORS.window}
          strokeWidth={30}
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
                const prevEndOffset = previousOpening.offsetFromStart + previousOpening.width
                const currentStartOffset = opening.offsetFromStart
                const prevEndPoint = add(outsideStart, scale(wallVector, prevEndOffset))
                const currentStartPoint = add(outsideStart, scale(wallVector, currentStartOffset))
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
                const currentEndOffset = opening.offsetFromStart + opening.width
                const nextStartOffset = nextOpening.offsetFromStart
                const currentEndPoint = add(outsideStart, scale(wallVector, currentEndOffset))
                const nextStartPoint = add(outsideStart, scale(wallVector, nextStartOffset))
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
