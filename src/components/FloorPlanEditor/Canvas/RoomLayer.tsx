import { Layer } from 'react-konva'
import { useFloors, useRooms, getActiveFloor } from '../../../model/store'
import { useActiveFloorId } from '../hooks/useEditorStore'
import { RoomShape } from '../Shapes/RoomShape'

export function RoomLayer (): React.JSX.Element {
  const floors = useFloors()
  const allRooms = useRooms()
  const activeFloorId = useActiveFloorId()
  const activeFloor = getActiveFloor(floors, activeFloorId)

  if (activeFloor == null || !Array.isArray(activeFloor.roomIds)) {
    return <Layer name='rooms' />
  }

  const rooms = activeFloor.roomIds
    .map(roomId => allRooms.get(roomId))
    .filter((room): room is NonNullable<typeof room> => room !== undefined)

  return (
    <Layer name='rooms'>
      {rooms.map(room => (
        <RoomShape key={room.id} room={room} />
      ))}
    </Layer>
  )
}