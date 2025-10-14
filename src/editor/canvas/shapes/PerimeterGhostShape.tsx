import { Group, Line } from 'react-konva/lib/ReactKonvaCore'

import type { Perimeter } from '@/building/model/model'
import { useCanvasTheme } from '@/shared/theme/CanvasThemeContext'

interface PerimeterGhostShapeProps {
  perimeter: Perimeter
}

export function PerimeterGhostShape({ perimeter }: PerimeterGhostShapeProps): React.JSX.Element {
  const theme = useCanvasTheme()
  const innerPoints = perimeter.corners.flatMap(corner => [corner.insidePoint[0], corner.insidePoint[1]])
  const outerPoints = perimeter.corners.flatMap(corner => [corner.outsidePoint[0], corner.outsidePoint[1]])

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
