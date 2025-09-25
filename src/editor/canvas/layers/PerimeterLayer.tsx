import { Layer } from 'react-konva/lib/ReactKonvaCore'

import { usePerimetersOfActiveStorey } from '@/building/store'
import { PerimeterShape } from '@/editor/canvas/shapes/PerimeterShape'

export function PerimeterLayer(): React.JSX.Element {
  const perimeters = usePerimetersOfActiveStorey()

  return (
    <Layer name="perimeters">
      {perimeters.map(perimeter => (
        <PerimeterShape key={perimeter.id} perimeter={perimeter} />
      ))}
    </Layer>
  )
}
