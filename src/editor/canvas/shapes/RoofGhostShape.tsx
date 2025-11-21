import { Group, Line } from 'react-konva/lib/ReactKonvaCore'

import type { Roof } from '@/building/model/model'
import { useCanvasTheme } from '@/shared/theme/CanvasThemeContext'

interface RoofGhostShapeProps {
  roof: Roof
}

export function RoofGhostShape({ roof }: RoofGhostShapeProps): React.JSX.Element {
  const theme = useCanvasTheme()
  const points = roof.referencePolygon.points.flatMap(point => [point[0], point[1]])
  const eavePolygon = roof.overhangPolygon.points.flatMap(point => [point[0], point[1]])

  return (
    <Group listening={false}>
      <Line points={points} stroke={theme.black} strokeWidth={20} dash={[40, 80]} opacity={0.3} closed />
      <Line points={eavePolygon} stroke={theme.black} strokeWidth={20} dash={[40, 80]} opacity={0.3} closed />
    </Group>
  )
}
