import { useTranslation } from 'react-i18next'

import type { OpeningId } from '@/building/model/ids'
import { useWallOpeningById } from '@/building/store'
import { DIMENSION_SMALL_FONT_SIZE, WALL_DIM_LAYER_OFFSET } from '@/editor/constants/dimensions'
import { useCurrentSelection } from '@/editor/hooks/useSelectionStore'
import { useUiScale } from '@/editor/hooks/useViewportStore'
import { EntityMeasurementsShape } from '@/editor/shapes/EntityMeasurementsShape'
import { direction, midpoint, perpendicularCW, scaleAddVec2 } from '@/shared/geometry'
import { MATERIAL_COLORS } from '@/shared/theme/colors'
import { polygonToSvgPath, readableTextAngle } from '@/shared/utils/svg'

export function OpeningShape({ openingId }: { openingId: OpeningId }): React.JSX.Element {
  const { t } = useTranslation('overlay')
  const opening = useWallOpeningById(openingId)
  const uiScale = useUiScale()

  const scaledFontSize = DIMENSION_SMALL_FONT_SIZE * uiScale
  const scaledOffset = 1 * WALL_DIM_LAYER_OFFSET * uiScale

  const openingPath = polygonToSvgPath(opening.polygon)
  const centerLineStart = midpoint(opening.insideLine.start, opening.outsideLine.start)
  const centerLineEnd = midpoint(opening.insideLine.end, opening.outsideLine.end)

  const isSelected = useCurrentSelection() === openingId
  const dir = direction(opening.insideLine.start, opening.insideLine.end)
  const perp = perpendicularCW(dir)
  const textPos = scaleAddVec2(midpoint(opening.insideLine.start, opening.insideLine.end), perp, scaledOffset)
  const textAngle = readableTextAngle(dir)

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

      <g className="text" transform={`translate(${textPos[0]} ${textPos[1]}) rotate(${textAngle}) scale(1, -1)`}>
        <text
          x={0}
          y={0}
          fontSize={scaledFontSize}
          fill={isSelected ? 'var(--color-foreground)' : 'var(--color-muted-foreground)'}
          textAnchor="middle"
          dominantBaseline="central"
        >
          {opening.sillHeight != null
            ? t($ => $.openings.dimensionWithSillHeight, {
                sillHeight: opening.sillHeight,
                height: opening.height,
                defaultValue: 'H {{height}} SH {{sillHeight}}'
              })
            : t($ => $.openings.dimension, {
                height: opening.height,
                defaultValue: 'H {{height}}'
              })}
        </text>
      </g>

      <EntityMeasurementsShape entity={opening} />
    </g>
  )
}
