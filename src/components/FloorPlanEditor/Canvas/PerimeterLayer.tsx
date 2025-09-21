import { Layer } from 'react-konva/lib/ReactKonvaCore'
import { useModelActions } from '@/model/store'
import { useActiveStoreyId } from '@/components/FloorPlanEditor/hooks/useEditorStore'
import { PerimeterShape } from '@/components/FloorPlanEditor/Shapes/PerimeterShape'

export function PerimeterLayer(): React.JSX.Element {
  const activeStoreyId = useActiveStoreyId()
  const { getPerimetersByStorey } = useModelActions()
  const perimeters = getPerimetersByStorey(activeStoreyId)

  return (
    <Layer name="perimeters">
      {perimeters.map(perimeter => (
        <PerimeterShape key={perimeter.id} perimeter={perimeter} />
      ))}
    </Layer>
  )
}
