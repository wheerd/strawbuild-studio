import { Layer } from 'react-konva/lib/ReactKonvaCore'
import { usePerimetersOfActiveStorey } from '@/model/store'
import { PerimeterShape } from '@/components/FloorPlanEditor/Shapes/PerimeterShape'

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
