import { Group, Line } from 'react-konva/lib/ReactKonvaCore'

import type { PerimeterWithGeometry } from '@/building/model'
import { useCanvasTheme } from '@/shared/theme/CanvasThemeContext'

interface PerimeterGhostShapeProps {
  perimeter: PerimeterWithGeometry
}

export function PerimeterGhostShape({ perimeter }: PerimeterGhostShapeProps): React.JSX.Element {
  const theme = useCanvasTheme()
  const innerPoints = perimeter.innerPolygon.points.flatMap(p => [p[0], p[1]])
  const outerPoints = perimeter.outerPolygon.points.flatMap(p => [p[0], p[1]])

  return (
    <Group listening={false}>
      <Line
        points={innerPoints}
        stroke={theme.black}
        fill={theme.bgSubtle}
        strokeWidth={20}
        dash={[40, 80]}
        opacity={0.3}
        closed
      />
      <Line points={outerPoints} stroke={theme.black} strokeWidth={20} dash={[40, 80]} opacity={0.3} closed />
    </Group>
  )
}
