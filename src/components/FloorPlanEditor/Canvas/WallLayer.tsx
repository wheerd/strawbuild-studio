import { Layer } from 'react-konva'
import { useFloorWalls } from '@/model/store'
import { useActiveFloorId } from '@/components/FloorPlanEditor/hooks/useEditorStore'
import { WallShape } from '@/components/FloorPlanEditor/Shapes/WallShape'

export function WallLayer (): React.JSX.Element {
  const activeFloorId = useActiveFloorId()
  const walls = useFloorWalls(activeFloorId)

  return (
    <Layer name='walls'>
      {walls.map(wall => (
        <WallShape key={wall.id} wall={wall} />
      ))}
    </Layer>
  )
}
