import { type OpeningId, isOpeningId } from '@/building/model/ids'
import { useModelActions, usePerimeterCornerById, usePerimeterWallById, useWallOpeningById } from '@/building/store'
import { useSelectionStore } from '@/editor/hooks/useSelectionStore'
import { useViewportActions } from '@/editor/hooks/useViewportStore'
import { activateLengthInput } from '@/editor/services/length-input'
import { ClickableLengthIndicator } from '@/editor/utils/ClickableLengthIndicator'
import { LengthIndicator } from '@/editor/utils/LengthIndicator'
import { type Length, ZERO_VEC2, midpoint } from '@/shared/geometry'
import { useFormatters } from '@/shared/i18n/useFormatters'
import { MATERIAL_COLORS } from '@/shared/theme/colors'
import { polygonToSvgPath } from '@/shared/utils/svg'

export function OpeningShape({ openingId }: { openingId: OpeningId }): React.JSX.Element {
  const { formatLength } = useFormatters()
  const select = useSelectionStore()
  const modelActions = useModelActions()
  const viewportActions = useViewportActions()

  const opening = useWallOpeningById(openingId)
  const wall = usePerimeterWallById(opening.wallId)
  const startCorner = usePerimeterCornerById(wall.startCornerId)
  const endCorner = usePerimeterCornerById(wall.endCornerId)

  const openingPath = polygonToSvgPath(opening.polygon)
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
      position: { x: stagePos[0] + 20, y: stagePos[1] - 30 },
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
    <g
      name={`opening-${opening.id}`}
      data-entity-id={opening.id}
      data-entity-type="opening"
      data-parent-ids={JSON.stringify([opening.perimeterId, opening.wallId])}
    >
      {/* Opening cutout - render as a different colored line */}
      <path
        d={openingPath}
        fill="var(--color-gray-400)"
        fillOpacity={0.7}
        stroke="var(--color-gray-900)"
        strokeWidth={10}
      />

      {/* Door/Window indicator line */}
      {opening.openingType !== 'passage' && (
        <line
          x1={centerLineStart[0]}
          y1={centerLineStart[1]}
          x2={centerLineEnd[0]}
          y2={centerLineEnd[1]}
          stroke={opening.openingType === 'door' ? MATERIAL_COLORS.door : MATERIAL_COLORS.window}
          strokeWidth={60}
          strokeLinecap="butt"
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
              color="var(--color-gray-900)"
              fontSize={50}
              strokeWidth={4}
              onClick={measurement => {
                handleMeasurementClick(measurement, 'prevOpening')
              }}
            />
          )}

          {nextObstacle && (
            <ClickableLengthIndicator
              startPoint={opening.outsideLine.end}
              endPoint={nextObstacle.outsideLine.start}
              offset={60}
              color="var(--color-gray-900)"
              fontSize={50}
              strokeWidth={4}
              onClick={measurement => {
                handleMeasurementClick(measurement, 'nextOpening')
              }}
            />
          )}

          {/* Opening width indicators (middle layer) */}
          <LengthIndicator
            startPoint={opening.insideLine.start}
            endPoint={opening.insideLine.end}
            label={formatLength(opening.width)}
            offset={-60}
            color="var(--color-primary-900)"
            fontSize={50}
            strokeWidth={4}
          />
          <LengthIndicator
            startPoint={opening.outsideLine.start}
            endPoint={opening.outsideLine.end}
            label={formatLength(opening.width)}
            offset={hasNeighbors ? 90 : 60}
            color="var(--color-primary-900)"
            fontSize={50}
            strokeWidth={4}
          />

          {/* Corner distance indicators (outermost layer) */}
          <ClickableLengthIndicator
            startPoint={startCorner.insidePoint}
            endPoint={opening.insideLine.start}
            offset={-60}
            color="var(--color-gray-900)"
            fontSize={50}
            strokeWidth={4}
            onClick={measurement => {
              handleMeasurementClick(measurement, 'startCorner')
            }}
          />
          <ClickableLengthIndicator
            startPoint={opening.insideLine.end}
            endPoint={endCorner.insidePoint}
            offset={-60}
            color="var(--color-gray-900)"
            fontSize={50}
            strokeWidth={4}
            onClick={measurement => {
              handleMeasurementClick(measurement, 'endCorner')
            }}
          />
          <ClickableLengthIndicator
            startPoint={startCorner.outsidePoint}
            endPoint={opening.outsideLine.start}
            offset={hasNeighbors ? 120 : 60}
            color="var(--color-gray-900)"
            fontSize={50}
            strokeWidth={4}
            onClick={measurement => {
              handleMeasurementClick(measurement, 'startCorner')
            }}
          />
          <ClickableLengthIndicator
            startPoint={opening.outsideLine.end}
            endPoint={endCorner.outsidePoint}
            offset={hasNeighbors ? 120 : 60}
            color="var(--color-gray-900)"
            fontSize={50}
            strokeWidth={4}
            onClick={measurement => {
              handleMeasurementClick(measurement, 'endCorner')
            }}
          />
        </>
      )}
    </g>
  )
}
