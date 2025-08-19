import { Layer } from 'react-konva'
import { useFloors, useConnectionPoints, getActiveFloor } from '../../../model/store'
import { useActiveFloorId } from '../hooks/useEditorStore'
import { ConnectionPointShape } from '../Shapes/ConnectionPointShape'

export function ConnectionPointLayer (): React.JSX.Element {
  const floors = useFloors()
  const allConnectionPoints = useConnectionPoints()
  const activeFloorId = useActiveFloorId()
  const activeFloor = getActiveFloor(floors, activeFloorId)

  if (activeFloor == null || !Array.isArray(activeFloor.connectionPointIds)) {
    return <Layer name='points' />
  }

  const connectionPoints = activeFloor.connectionPointIds
    .map(pointId => allConnectionPoints.get(pointId))
    .filter((point): point is NonNullable<typeof point> => point !== undefined)

  return (
    <Layer name='points'>
      {connectionPoints.map(point => (
        <ConnectionPointShape key={point.id} point={point} />
      ))}
    </Layer>
  )
}