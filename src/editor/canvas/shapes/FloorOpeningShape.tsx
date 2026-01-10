import { Group, Line } from 'react-konva/lib/ReactKonvaCore'
import useImage from 'use-image'

import type { FloorOpening } from '@/building/model'
import hatchPatternUrl from '@/editor/canvas/assets/floor-opening-hatch.svg?url'
import { useCanvasTheme } from '@/shared/theme/CanvasThemeContext'

interface FloorOpeningShapeProps {
  opening: FloorOpening
}

export function FloorOpeningShape({ opening }: FloorOpeningShapeProps): React.JSX.Element {
  const theme = useCanvasTheme()
  const points = opening.area.points.flatMap(point => [point[0], point[1]])
  const [hatchPattern] = useImage(hatchPatternUrl)

  return (
    <Group
      name={`floor-opening-${opening.id}`}
      entityId={opening.id}
      entityType="floor-opening"
      parentIds={[]}
      listening
    >
      <Line
        points={points}
        closed
        fill={hatchPattern ? undefined : theme.bgCanvas}
        fillPatternImage={hatchPattern ?? undefined}
        fillPatternRepeat="repeat"
        fillPatternScale={{ x: 3, y: 3 }}
        stroke={theme.warning}
        dash={[80, 40]}
        strokeWidth={10}
        listening
      />
    </Group>
  )
}
