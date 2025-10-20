import { Group, Line } from 'react-konva/lib/ReactKonvaCore'

import type { FloorArea } from '@/building/model/model'
import { useCanvasTheme } from '@/shared/theme/CanvasThemeContext'

interface FloorAreaShapeProps {
  area: FloorArea
}

export function FloorAreaShape({ area }: FloorAreaShapeProps): React.JSX.Element {
  const theme = useCanvasTheme()
  const points = area.area.points.flatMap(point => [point[0], point[1]])

  return (
    <Group name={`floor-area-${area.id}`} entityId={area.id} entityType="floor-area" parentIds={[]} listening>
      <Line points={points} closed fill={theme.bgSubtle} stroke={theme.primary} strokeWidth={30} listening />
    </Group>
  )
}
