import type { OpeningId } from '@/building/model/ids'
import { useWallOpeningById } from '@/building/store'
import { EntityMeasurementsShape } from '@/editor/shapes/EntityMeasurementsShape'
import { midpoint } from '@/shared/geometry'
import { MATERIAL_COLORS } from '@/shared/theme/colors'
import { polygonToSvgPath } from '@/shared/utils/svg'

export function OpeningShape({ openingId }: { openingId: OpeningId }): React.JSX.Element {
  const opening = useWallOpeningById(openingId)

  const openingPath = polygonToSvgPath(opening.polygon)
  const centerLineStart = midpoint(opening.insideLine.start, opening.outsideLine.start)
  const centerLineEnd = midpoint(opening.insideLine.end, opening.outsideLine.end)

  return (
    <g
      name={`opening-${opening.id}`}
      data-entity-id={opening.id}
      data-entity-type="opening"
      data-parent-ids={JSON.stringify([opening.perimeterId, opening.wallId])}
    >
      <path
        d={openingPath}
        fill="var(--color-muted)"
        fillOpacity={0.7}
        stroke="var(--color-border-contrast)"
        strokeWidth={10}
      />

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

      <EntityMeasurementsShape entity={opening} />
    </g>
  )
}
