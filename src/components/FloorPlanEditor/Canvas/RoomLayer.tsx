import { Layer } from 'react-konva'
import { useFloorRooms } from '@/model/store'
import { useActiveFloorId } from '@/components/FloorPlanEditor/hooks/useEditorStore'
import { RoomShape } from '@/components/FloorPlanEditor/Shapes/RoomShape'

export function RoomLayer (): React.JSX.Element {
  const activeFloorId = useActiveFloorId()
  const floorRooms = useFloorRooms()
  const rooms = floorRooms(activeFloorId)

  return (
    <Layer name='rooms'>
      {rooms.map(room => (
        <RoomShape key={room.id} room={room} />
      ))}
    </Layer>
  )
}
