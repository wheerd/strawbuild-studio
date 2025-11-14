import { useMemo } from 'react'
import { Group, Line } from 'react-konva/lib/ReactKonvaCore'

import type { Roof } from '@/building/model/model'
import { polygonEdgeOffset } from '@/shared/geometry'
import { useCanvasTheme } from '@/shared/theme/CanvasThemeContext'

interface RoofGhostShapeProps {
  roof: Roof
}

export function RoofGhostShape({ roof }: RoofGhostShapeProps): React.JSX.Element {
  const theme = useCanvasTheme()
  const points = roof.area.points.flatMap(point => [point[0], point[1]])

  // Calculate eave polygon (offset by overhang)
  const eavePolygon = useMemo(() => {
    const offsetPolygon = polygonEdgeOffset(roof.area, roof.overhang)
    return offsetPolygon.points.flatMap(point => [point[0], point[1]])
  }, [roof.area, roof.overhang])

  return (
    <Group listening={false}>
      <Line points={points} stroke={theme.black} strokeWidth={20} dash={[40, 80]} opacity={0.3} closed />
      <Line points={eavePolygon} stroke={theme.black} strokeWidth={20} dash={[40, 80]} opacity={0.3} closed />
    </Group>
  )
}
