import { useMemo } from 'react'

import type { Roof } from '@/building/model'
import { useRoofOverhangsByRoof } from '@/building/store'
import { Arrow } from '@/editor/components/Arrow'
import { useSelectionStore } from '@/editor/hooks/useSelectionStore'
import { RoofOverhangShape } from '@/editor/shapes/RoofOverhangShape'
import { Bounds2D, direction, midpoint, negVec2, perpendicular, perpendicularCW, scaleAddVec2 } from '@/shared/geometry'
import { MATERIAL_COLORS } from '@/shared/theme/colors'
import { polygonToSvgPath } from '@/shared/utils/svg'

export function RoofShape({ roof }: { roof: Roof }): React.JSX.Element {
  const select = useSelectionStore()
  const isSelected = select.isCurrentSelection(roof.id)
  const overhangs = useRoofOverhangsByRoof(roof.id)

  const roofPath = polygonToSvgPath(roof.referencePolygon)
  const eavePath = polygonToSvgPath(roof.overhangPolygon)

  // Calculate arrow positions and directions
  const arrows = useMemo(() => {
    const ridgeMidpoint = midpoint(roof.ridgeLine.start, roof.ridgeLine.end)

    const bounds = Bounds2D.fromPoints(roof.referencePolygon.points)
    const size = bounds.size
    const arrowLength = Math.min(size[0], size[1]) * 0.2
    const arrowOffset = 100

    const ridgeDir = direction(roof.ridgeLine.start, roof.ridgeLine.end)

    if (roof.type === 'shed') {
      // Single arrow pointing away from ridge (downslope)
      const arrowDirection = perpendicularCW(ridgeDir)
      const arrowStart = scaleAddVec2(ridgeMidpoint, arrowDirection, arrowOffset)
      const arrowEnd = scaleAddVec2(ridgeMidpoint, arrowDirection, arrowLength + arrowOffset)

      return [
        {
          start: arrowStart,
          end: arrowEnd
        }
      ]
    } else {
      // Gable: Two arrows, one on each side of ridge
      const perpDir1 = perpendicular(ridgeDir)
      const perpDir2 = negVec2(perpDir1)

      const offset = 200

      const arrowPos1 = scaleAddVec2(ridgeMidpoint, perpDir1, offset)
      const arrowPos2 = scaleAddVec2(ridgeMidpoint, perpDir2, offset)

      const arrowEnd1 = scaleAddVec2(arrowPos1, perpDir1, arrowLength)
      const arrowEnd2 = scaleAddVec2(arrowPos2, perpDir2, arrowLength)

      return [
        { start: arrowPos1, end: arrowEnd1 },
        { start: arrowPos2, end: arrowEnd2 }
      ]
    }
  }, [roof.ridgeLine, roof.type, roof.referencePolygon])

  return (
    <g data-entity-id={roof.id} data-entity-type="roof" data-parent-ids="[]">
      <path d={roofPath} fill={MATERIAL_COLORS.roof} opacity={0.6} />
      <path d={roofPath} fill="none" stroke="var(--color-gray-900)" strokeWidth={20} />

      {/* Eave polygon - dashed outline */}
      <path d={eavePath} fill="none" stroke="var(--color-gray-900)" strokeWidth={10} strokeDasharray="200 100" />

      {/* Individual overhang sides - rendered as trapezoids */}
      {overhangs.map(overhang => (
        <RoofOverhangShape key={overhang.id} overhang={overhang} />
      ))}

      {/* Ridge line */}
      <line
        x1={roof.ridgeLine.start[0]}
        y1={roof.ridgeLine.start[1]}
        x2={roof.ridgeLine.end[0]}
        y2={roof.ridgeLine.end[1]}
        stroke="var(--color-primary-900)"
        strokeWidth={60}
      />

      {/* Direction arrows */}
      {isSelected &&
        arrows.map((arrow, index) => (
          <Arrow
            key={index}
            arrowStart={arrow.start}
            arrowEnd={arrow.end}
            color="var(--color-gray-100)"
            strokeWidth={400}
            pointerLength={200}
            pointerWidth={200}
          />
        ))}
    </g>
  )
}
