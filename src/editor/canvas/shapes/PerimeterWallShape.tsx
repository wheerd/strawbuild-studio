import { Group, Line } from 'react-konva/lib/ReactKonvaCore'

import { type PerimeterWallId, isOpeningId } from '@/building/model/ids'
import { usePerimeterCornerById, usePerimeterWallById } from '@/building/store'
import { useWallAssemblyById } from '@/construction/config/store'
import { LengthIndicator } from '@/editor/canvas/utils/LengthIndicator'
import { useSelectionStore } from '@/editor/hooks/useSelectionStore'
import { direction } from '@/shared/geometry'
import { useFormatters } from '@/shared/i18n/useFormatters'
import { useCanvasTheme } from '@/shared/theme/CanvasThemeContext'
import { MATERIAL_COLORS } from '@/shared/theme/colors'

import { OpeningShape } from './OpeningShape'
import { WallPostShape } from './WallPostShape'

export function PerimeterWallShape({ wallId }: { wallId: PerimeterWallId }): React.JSX.Element {
  const { formatLength } = useFormatters()
  const select = useSelectionStore()
  const theme = useCanvasTheme()

  const wall = usePerimeterWallById(wallId)
  const startCorner = usePerimeterCornerById(wall.startCornerId)
  const endCorner = usePerimeterCornerById(wall.endCornerId)

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

  const wallAssembly = useWallAssemblyById(wall.wallAssemblyId)
  const fillColor = wallAssembly?.type === 'non-strawbale' ? MATERIAL_COLORS.other : MATERIAL_COLORS.strawbale

  return (
    <Group
      name={`wall-${wall.id}`}
      entityId={wall.id}
      entityType="perimeter-wall"
      parentIds={[wall.perimeterId]}
      listening
    >
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
        fill={fillColor}
        stroke={theme.border}
        strokeWidth={10}
        closed
        listening
      />

      {/* Render wall entities in this wall */}
      {wall.entityIds.map(id =>
        isOpeningId(id) ? (
          <OpeningShape key={`opening-${id}`} openingId={id} />
        ) : (
          <WallPostShape key={`post-${id}`} postId={id} />
        )
      )}

      {/* Length indicators when selected */}
      {select.isCurrentSelection(wall.id) && (
        <>
          <LengthIndicator
            startPoint={startCorner.insidePoint}
            endPoint={endCorner.insidePoint}
            label={formatLength(wall.insideLength)}
            offset={-60}
            color={theme.text}
            fontSize={60}
            strokeWidth={5}
          />
          <LengthIndicator
            startPoint={startCorner.outsidePoint}
            endPoint={endCorner.outsidePoint}
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
