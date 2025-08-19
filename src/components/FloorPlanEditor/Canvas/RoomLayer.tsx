import { Layer } from 'react-konva'
import { useActiveFloor, useBuilding } from '../../../model/store'
import { RoomShape } from '../Shapes/RoomShape'

export function RoomLayer (): React.JSX.Element {
  const building = useBuilding()
  const activeFloor = useActiveFloor()

  if (activeFloor == null || !Array.isArray(activeFloor.roomIds)) {
    return <Layer name='rooms' />
  }

  const rooms = activeFloor.roomIds
    .map(roomId => building.rooms.get(roomId))
    .filter((room): room is NonNullable<typeof room> => room !== undefined)

  return (
    <Layer name='rooms'>
      {rooms.map(room => (
        <RoomShape key={room.id} room={room} building={building} />
      ))}
    </Layer>
  )
}
