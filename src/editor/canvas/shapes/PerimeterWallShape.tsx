import { type PerimeterWallId } from '@/building/model/ids'
import { usePerimeterCornerById, usePerimeterWallById } from '@/building/store'
import { useWallAssemblyById } from '@/construction/config/store'
import { LengthIndicator } from '@/editor/canvas/utils/LengthIndicator'
import { useSelectionStore } from '@/editor/hooks/useSelectionStore'
import { useFormatters } from '@/shared/i18n/useFormatters'
import { MATERIAL_COLORS } from '@/shared/theme/colors'
import { polygonToSvgPath } from '@/shared/utils/svg'

export function PerimeterWallShape({ wallId }: { wallId: PerimeterWallId }): React.JSX.Element {
  const { formatLength } = useFormatters()
  const select = useSelectionStore()

  const wall = usePerimeterWallById(wallId)
  const startCorner = usePerimeterCornerById(wall.startCornerId)
  const endCorner = usePerimeterCornerById(wall.endCornerId)

  const wallAssembly = useWallAssemblyById(wall.wallAssemblyId)
  const fillColor = wallAssembly?.type === 'non-strawbale' ? MATERIAL_COLORS.other : MATERIAL_COLORS.strawbale

  const isSelected = select.isCurrentSelection(wall.id)

  const wallPath = polygonToSvgPath(wall.polygon)

  return (
    <g data-entity-id={wall.id} data-entity-type="perimeter-wall" data-parent-ids={JSON.stringify([wall.perimeterId])}>
      {/* Main wall body - fill the area between inside and outside lines */}
      <path d={wallPath} fill={fillColor} stroke="var(--gray-11)" strokeWidth={10} />

      {/* Length indicators when selected */}
      {isSelected && (
        <>
          <LengthIndicator
            startPoint={startCorner.insidePoint}
            endPoint={endCorner.insidePoint}
            label={formatLength(wall.insideLength)}
            offset={-60}
            color="var(--color-text)"
            fontSize={60}
            strokeWidth={5}
          />
          <LengthIndicator
            startPoint={startCorner.outsidePoint}
            endPoint={endCorner.outsidePoint}
            label={formatLength(wall.outsideLength)}
            offset={60}
            color="var(--color-text)"
            fontSize={60}
            strokeWidth={5}
          />
        </>
      )}
    </g>
  )
}
