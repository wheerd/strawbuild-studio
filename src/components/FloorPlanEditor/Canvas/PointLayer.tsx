import { Layer } from 'react-konva'
import { useFloors, usePoints, getActiveFloor } from '../../../model/store'
import { useActiveFloorId } from '../hooks/useEditorStore'
import { PointShape } from '../Shapes/PointShape'

export function PointLayer (): React.JSX.Element {
  const floors = useFloors()
  const allPoints = usePoints()
  const activeFloorId = useActiveFloorId()
  const activeFloor = getActiveFloor(floors, activeFloorId)

  if (activeFloor == null || !Array.isArray(activeFloor.pointIds)) {
    return <Layer name='points' />
  }

  const points = activeFloor.pointIds
    .map(pointId => allPoints.get(pointId))
    .filter((point): point is NonNullable<typeof point> => point !== undefined)

  return (
    <Layer name='points'>
      {points.map(point => (
        <PointShape key={point.id} point={point} />
      ))}
    </Layer>
  )
}
