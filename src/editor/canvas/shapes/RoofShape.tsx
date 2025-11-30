import { vec2 } from 'gl-matrix'
import { useMemo } from 'react'
import { Arrow, Group, Line } from 'react-konva/lib/ReactKonvaCore'

import type { Roof } from '@/building/model/model'
import { useSelectionStore } from '@/editor/hooks/useSelectionStore'
import { Bounds2D, direction, perpendicular, perpendicularCW } from '@/shared/geometry'
import { useCanvasTheme } from '@/shared/theme/CanvasThemeContext'
import { MATERIAL_COLORS } from '@/shared/theme/colors'

import { RoofOverhangShape } from './RoofOverhangShape'

interface RoofShapeProps {
  roof: Roof
}

export function RoofShape({ roof }: RoofShapeProps): React.JSX.Element {
  const select = useSelectionStore()
  const theme = useCanvasTheme()
  const isSelected = select.isCurrentSelection(roof.id)

  const points = roof.referencePolygon.points.flatMap((point: vec2) => [point[0], point[1]])
  const eavePolygon = roof.overhangPolygon.points.flatMap((point: vec2) => [point[0], point[1]])

  // Ridge line points
  const ridgePoints = [roof.ridgeLine.start[0], roof.ridgeLine.start[1], roof.ridgeLine.end[0], roof.ridgeLine.end[1]]

  // Calculate arrow positions and directions
  const arrows = useMemo(() => {
    const ridgeMidpoint = vec2.scale(
      vec2.create(),
      vec2.add(vec2.create(), roof.ridgeLine.start, roof.ridgeLine.end),
      0.5
    )

    const bounds = Bounds2D.fromPoints(roof.referencePolygon.points)
    const size = bounds.size
    const arrowLength = Math.min(size[0], size[1]) * 0.2
    const arrowOffset = 100

    const ridgeDir = direction(roof.ridgeLine.start, roof.ridgeLine.end)

    if (roof.type === 'shed') {
      // Single arrow pointing away from ridge (downslope)
      const arrowDirection = perpendicularCW(ridgeDir)
      const arrowStart = vec2.scaleAndAdd(vec2.create(), ridgeMidpoint, arrowDirection, arrowOffset)
      const arrowEnd = vec2.scaleAndAdd(vec2.create(), ridgeMidpoint, arrowDirection, arrowLength + arrowOffset)

      return [
        {
          start: arrowStart,
          end: arrowEnd
        }
      ]
    } else {
      // Gable: Two arrows, one on each side of ridge
      const perpDir1 = perpendicular(ridgeDir)
      const perpDir2 = vec2.negate(vec2.create(), perpDir1)

      const offset = 200

      const arrowPos1 = vec2.scaleAndAdd(vec2.create(), ridgeMidpoint, perpDir1, offset)
      const arrowPos2 = vec2.scaleAndAdd(vec2.create(), ridgeMidpoint, perpDir2, offset)

      const arrowEnd1 = vec2.scaleAndAdd(vec2.create(), arrowPos1, perpDir1, arrowLength)
      const arrowEnd2 = vec2.scaleAndAdd(vec2.create(), arrowPos2, perpDir2, arrowLength)

      return [
        { start: arrowPos1, end: arrowEnd1 },
        { start: arrowPos2, end: arrowEnd2 }
      ]
    }
  }, [roof.ridgeLine, roof.type, roof.referencePolygon])

  return (
    <Group name={`roof-${roof.id}`} entityId={roof.id} entityType="roof" parentIds={[]} listening>
      {/* Main roof polygon - semi-transparent */}
      <Line points={points} closed fill={MATERIAL_COLORS.roof} opacity={0.6} listening />
      <Line points={points} closed stroke={theme.border} strokeWidth={20} listening />

      {/* Eave polygon - dashed outline */}
      <Line points={eavePolygon} closed stroke={theme.border} strokeWidth={10} dash={[200, 100]} listening />

      {/* Individual overhang sides - rendered as trapezoids */}
      {roof.overhangs.map(overhang => (
        <RoofOverhangShape key={overhang.id} overhang={overhang} roofId={roof.id} />
      ))}

      {/* Ridge line - thicker stroke */}
      <Line points={ridgePoints} stroke={theme.primary} strokeWidth={60} listening={false} />

      {/* Direction arrows */}
      {isSelected &&
        arrows.map((arrow, index) => (
          <Arrow
            key={index}
            points={[arrow.start[0], arrow.start[1], arrow.end[0], arrow.end[1]]}
            stroke={theme.white}
            strokeWidth={400}
            fill={theme.white}
            pointerLength={200}
            pointerWidth={200}
            listening={false}
          />
        ))}
    </Group>
  )
}
