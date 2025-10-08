import { Group, Line } from 'react-konva/lib/ReactKonvaCore'

import type { Perimeter } from '@/building/model/model'
import { COLORS } from '@/shared/theme/colors'

interface PerimeterGhostShapeProps {
  perimeter: Perimeter
}

export function PerimeterGhostShape({ perimeter }: PerimeterGhostShapeProps): React.JSX.Element {
  const innerPoints = perimeter.corners.flatMap(corner => [corner.insidePoint[0], corner.insidePoint[1]])
  const outerPoints = perimeter.corners.flatMap(corner => [corner.outsidePoint[0], corner.outsidePoint[1]])

  return (
    <Group listening={false}>
      <Line
        points={innerPoints}
        stroke="black"
        fill={COLORS.canvas.buildingBackground}
        strokeWidth={20}
        dash={[40, 80]}
        opacity={0.3}
        closed
      />
      <Line points={outerPoints} stroke="black" strokeWidth={20} dash={[40, 80]} opacity={0.3} closed />
    </Group>
  )
}
