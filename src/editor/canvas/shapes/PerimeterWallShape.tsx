import { Group, Line } from 'react-konva/lib/ReactKonvaCore'

import type { PerimeterId } from '@/building/model/ids'
import type { PerimeterWall } from '@/building/model/model'
import { usePerimeterConstructionMethodById } from '@/construction/config/store'
import { LengthIndicator } from '@/editor/canvas/utils/LengthIndicator'
import { useSelectionStore } from '@/editor/hooks/useSelectionStore'
import { type Vec2, direction } from '@/shared/geometry'
import { useCanvasTheme } from '@/shared/theme/CanvasThemeContext'
import { MATERIAL_COLORS } from '@/shared/theme/colors'
import { formatLength } from '@/shared/utils/formatLength'

import { OpeningShape } from './OpeningShape'

interface PerimeterWallShapeProps {
  wall: PerimeterWall
  perimeterId: PerimeterId
  insideStartCorner: Vec2
  insideEndCorner: Vec2
  outsideStartCorner: Vec2
  outsideEndCorner: Vec2
}

export function PerimeterWallShape({
  wall,
  perimeterId,
  insideStartCorner,
  insideEndCorner,
  outsideStartCorner,
  outsideEndCorner
}: PerimeterWallShapeProps): React.JSX.Element {
  const select = useSelectionStore()
  const theme = useCanvasTheme()

  // Calculate wall properties
  const insideStart = wall.insideLine.start
  const insideEnd = wall.insideLine.end
  const outsideStart = wall.outsideLine.start
  const outsideEnd = wall.outsideLine.end

  // Calculate text rotation to align with wall
  const wallDirection = direction(insideStart, insideEnd)
  let angleDegrees = (Math.atan2(wallDirection[1], wallDirection[0]) * 180) / Math.PI

  // Keep text readable
  if (angleDegrees > 90) {
    angleDegrees -= 180
  } else if (angleDegrees < -90) {
    angleDegrees += 180
  }

  const constructionMethod = usePerimeterConstructionMethodById(wall.constructionMethodId)
  const baseColor =
    constructionMethod?.config.type === 'non-strawbale' ? MATERIAL_COLORS.other : MATERIAL_COLORS.strawbale
  const finalMainColor = select.isSelected(wall.id) ? theme.primary : baseColor

  return (
    <Group name={`wall-${wall.id}`} entityId={wall.id} entityType="perimeter-wall" parentIds={[perimeterId]} listening>
      {/* Main wall body - fill the area between inside and outside lines */}
      <Line
        points={[
          insideStart[0],
          insideStart[1],
          insideEnd[0],
          insideEnd[1],
          outsideEnd[0],
          outsideEnd[1],
          outsideStart[0],
          outsideStart[1]
        ]}
        fill={finalMainColor}
        stroke={theme.black}
        strokeWidth={10}
        closed
        listening
      />

      {/* Render openings in this wall */}
      {wall.openings.map(opening => (
        <OpeningShape
          key={`opening-${opening.id}`}
          opening={opening}
          wall={wall}
          perimeterId={perimeterId}
          insideStartCorner={insideStartCorner}
          insideEndCorner={insideEndCorner}
          outsideStartCorner={outsideStartCorner}
          outsideEndCorner={outsideEndCorner}
        />
      ))}

      {/* Length indicators when selected */}
      {select.isCurrentSelection(wall.id) && (
        <>
          <LengthIndicator
            startPoint={insideStartCorner}
            endPoint={insideEndCorner}
            label={formatLength(wall.insideLength)}
            offset={-60}
            color={theme.text}
            fontSize={60}
            strokeWidth={5}
          />
          <LengthIndicator
            startPoint={outsideStartCorner}
            endPoint={outsideEndCorner}
            label={formatLength(wall.outsideLength)}
            offset={60}
            color={theme.text}
            fontSize={60}
            strokeWidth={5}
          />
        </>
      )}
    </Group>
  )
}
