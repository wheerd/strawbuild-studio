import { Layer } from 'react-konva'
import { useFloorCorners } from '@/model/store'
import { useActiveFloorId } from '@/components/FloorPlanEditor/hooks/useEditorStore'
import { CornerShape } from '@/components/FloorPlanEditor/Shapes/CornerShape'

export function CornerLayer (): React.JSX.Element {
  const activeFloorId = useActiveFloorId()
  const floorCorners = useFloorCorners(activeFloorId)
  return (
    <Layer name='corners'>
      {floorCorners.map(corner => (
        <CornerShape key={corner.pointId} corner={corner} />
      ))}
    </Layer>
  )
}
