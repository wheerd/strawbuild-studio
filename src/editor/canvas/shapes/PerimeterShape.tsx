import { Group, Line } from 'react-konva/lib/ReactKonvaCore'

import type { PerimeterWithGeometry } from '@/building/model'
import { useViewMode } from '@/editor/hooks/useViewMode'
import { useCanvasTheme } from '@/shared/theme/CanvasThemeContext'

import { PerimeterCornerShape } from './PerimeterCornerShape'
import { PerimeterWallShape } from './PerimeterWallShape'

interface PerimeterShapeProps {
  perimeter: PerimeterWithGeometry
}

export function PerimeterShape({ perimeter }: PerimeterShapeProps): React.JSX.Element {
  const mode = useViewMode()
  const theme = useCanvasTheme()
  const innerPoints = perimeter.innerPolygon.points.flatMap(p => [p[0], p[1]])
  const outerPoints = perimeter.outerPolygon.points.flatMap(p => [p[0], p[1]])

  if (mode !== 'walls') {
    return (
      <Group
        name={`perimeter-${perimeter.id}`}
        entityId={perimeter.id}
        entityType="perimeter"
        parentIds={[]}
        listening={false}
      >
        <Line points={outerPoints} closed opacity={0.3} fill={theme.secondaryLight} listening={false} />
        <Line
          points={outerPoints}
          closed
          stroke={theme.border}
          strokeWidth={40}
          dash={[120, 60]}
          opacity={0.6}
          listening={false}
        />
        <Line
          points={innerPoints}
          closed
          stroke={theme.border}
          strokeWidth={40}
          dash={[120, 60]}
          opacity={0.6}
          listening={false}
        />
      </Group>
    )
  }

  return (
    <Group name={`perimeter-${perimeter.id}`} entityId={perimeter.id} entityType="perimeter" parentIds={[]} listening>
      <Line points={innerPoints} fill="none" opacity={0} closed listening />

      {/* Render each wall */}
      {perimeter.wallIds.map(id => (
        <PerimeterWallShape key={`wall-${id}`} wallId={id} />
      ))}

      {/* Render corner shapes */}
      {perimeter.cornerIds.map(id => (
        <PerimeterCornerShape key={`corner-${id}`} cornerId={id} />
      ))}
    </Group>
  )
}
