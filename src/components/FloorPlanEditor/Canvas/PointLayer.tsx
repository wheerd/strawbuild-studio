import { Layer } from 'react-konva'
import { useFloorPoints } from '@/model/store'
import { useActiveFloorId } from '@/components/FloorPlanEditor/hooks/useEditorStore'
import { PointShape } from '@/components/FloorPlanEditor/Shapes/PointShape'

export function PointLayer (): React.JSX.Element {
  const activeFloorId = useActiveFloorId()
  const points = useFloorPoints(activeFloorId)

  return (
    <Layer name='points'>
      {points.map(point => (
        <PointShape key={point.id} point={point} />
      ))}
    </Layer>
  )
}
