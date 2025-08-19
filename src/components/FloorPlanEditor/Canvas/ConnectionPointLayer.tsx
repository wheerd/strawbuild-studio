import { Layer } from 'react-konva'
import { useActiveFloor, useBuilding } from '../../../model/store'
import { ConnectionPointShape } from '../Shapes/ConnectionPointShape'

export function ConnectionPointLayer (): React.JSX.Element {
  const building = useBuilding()
  const activeFloor = useActiveFloor()

  if (activeFloor == null || !Array.isArray(activeFloor.connectionPointIds)) {
    return <Layer name='points' />
  }

  const connectionPoints = activeFloor.connectionPointIds
    .map(pointId => building.connectionPoints.get(pointId))
    .filter((point): point is NonNullable<typeof point> => point !== undefined)

  return (
    <Layer name='points'>
      {connectionPoints.map(point => (
        <ConnectionPointShape key={point.id} point={point} />
      ))}
    </Layer>
  )
}
