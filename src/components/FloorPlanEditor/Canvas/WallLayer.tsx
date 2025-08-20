import { Layer } from 'react-konva'
import { useFloors, useWalls, getActiveFloor } from '@/model/store'
import { useActiveFloorId } from '@/components/FloorPlanEditor/hooks/useEditorStore'
import { WallShape } from '@/components/FloorPlanEditor/Shapes/WallShape'

export function WallLayer (): React.JSX.Element {
  const floors = useFloors()
  const allWalls = useWalls()
  const activeFloorId = useActiveFloorId()
  const activeFloor = getActiveFloor(floors, activeFloorId)

  if (activeFloor == null || !Array.isArray(activeFloor.wallIds)) {
    return <Layer name='walls' />
  }

  const walls = activeFloor.wallIds
    .map(wallId => allWalls.get(wallId))
    .filter((wall): wall is NonNullable<typeof wall> => wall !== undefined)

  return (
    <Layer name='walls'>
      {walls.map(wall => (
        <WallShape key={wall.id} wall={wall} />
      ))}
    </Layer>
  )
}
