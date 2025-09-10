import { Layer } from 'react-konva'
import { useFloorPerimeters } from '@/model/store'
import { useActiveFloorId } from '@/components/FloorPlanEditor/hooks/useEditorStore'
import { PerimeterShape } from '@/components/FloorPlanEditor/Shapes/PerimeterShape'

export function PerimeterLayer(): React.JSX.Element {
  const activeFloorId = useActiveFloorId()
  const perimeters = useFloorPerimeters(activeFloorId)

  return (
    <Layer name="perimeters">
      {perimeters.map(perimeter => (
        <PerimeterShape key={perimeter.id} perimeter={perimeter} />
      ))}
    </Layer>
  )
}
