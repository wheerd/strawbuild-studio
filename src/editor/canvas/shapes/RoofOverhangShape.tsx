import { Group, Line } from 'react-konva/lib/ReactKonvaCore'

import type { RoofOverhang } from '@/building/model'
import type { RoofId } from '@/building/model/ids'
import { offsetPolygon } from '@/shared/geometry'
import { useCanvasTheme } from '@/shared/theme/CanvasThemeContext'
import { MATERIAL_COLORS } from '@/shared/theme/colors'

interface RoofOverhangShapeProps {
  overhang: RoofOverhang
  roofId: RoofId
}

export function RoofOverhangShape({ overhang, roofId }: RoofOverhangShapeProps): React.JSX.Element {
  const theme = useCanvasTheme()

  const points = overhang.area.points.flatMap(p => [p[0], p[1]])
  const triggerArea = offsetPolygon(overhang.area, 100).points.flatMap(p => [p[0], p[1]])

  return (
    <Group
      name={`roof-overhang-${overhang.id}`}
      entityId={overhang.id}
      entityType="roof-overhang"
      parentIds={[roofId]}
      listening
    >
      <Line
        points={points}
        fill={MATERIAL_COLORS.roof}
        opacity={0.3}
        stroke={theme.border}
        strokeWidth={10}
        closed
        listening
      />

      {/* Invisible trigger area when overhang is 0 so that side can still be selected */}
      <Line points={triggerArea} closed listening />
    </Group>
  )
}
