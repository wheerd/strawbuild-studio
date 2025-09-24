import { Group, Line } from 'react-konva/lib/ReactKonvaCore'
import type { Opening, PerimeterWall } from '@/shared/types/model'
import type { PerimeterId } from '@/shared/types/ids'
import { midpoint, add, scale, type Vec2 } from '@/shared/geometry'
import { useSelectionStore } from '@/editor/hooks/useSelectionStore'
import { LengthIndicator } from '@/editor/overlays/LengthIndicator'
import { COLORS } from '@/shared/theme/colors'
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
        fill={isOpeningSelected ? COLORS.selection.secondary : COLORS.canvas.openingBackground}
        stroke={isOpeningSelected ? COLORS.selection.secondaryOutline : COLORS.ui.black}
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
          stroke={opening.type === 'door' ? COLORS.materials.door : COLORS.materials.window}
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
                  <LengthIndicator
                    startPoint={prevEndPoint}
                    endPoint={currentStartPoint}
                    offset={60}
                    color={COLORS.indicators.secondary}
                    fontSize={50}
                    strokeWidth={4}
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
                  <LengthIndicator
                    startPoint={currentEndPoint}
                    endPoint={nextStartPoint}
                    offset={60}
                    color={COLORS.indicators.secondary}
                    fontSize={50}
                    strokeWidth={4}
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
            color={COLORS.indicators.selected}
            fontSize={50}
            strokeWidth={4}
          />
          <LengthIndicator
            startPoint={outsideOpeningStart}
            endPoint={outsideOpeningEnd}
            label={formatLength(opening.width)}
            offset={hasNeighbors ? 90 : 60}
            color={COLORS.indicators.selected}
            fontSize={50}
            strokeWidth={4}
          />

          {/* Corner distance indicators (outermost layer) */}
          <LengthIndicator
            startPoint={insideStartCorner}
            endPoint={insideOpeningStart}
            offset={-60}
            color={COLORS.indicators.main}
            fontSize={50}
            strokeWidth={4}
          />
          <LengthIndicator
            startPoint={insideOpeningEnd}
            endPoint={insideEndCorner}
            offset={-60}
            color={COLORS.indicators.main}
            fontSize={50}
            strokeWidth={4}
          />
          <LengthIndicator
            startPoint={outsideStartCorner}
            endPoint={outsideOpeningStart}
            offset={hasNeighbors ? 120 : 60}
            color={COLORS.indicators.main}
            fontSize={50}
            strokeWidth={4}
          />
          <LengthIndicator
            startPoint={outsideOpeningEnd}
            endPoint={outsideEndCorner}
            offset={hasNeighbors ? 120 : 60}
            color={COLORS.indicators.main}
            fontSize={50}
            strokeWidth={4}
          />
        </>
      )}
    </Group>
  )
}
