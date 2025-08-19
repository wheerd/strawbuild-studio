import { Layer } from 'react-konva'
import { useActiveFloor, useBuilding } from '../../../model/store'
import { WallShape } from '../Shapes/WallShape'

export function WallLayer (): React.JSX.Element {
  const building = useBuilding()
  const activeFloor = useActiveFloor()

  if (activeFloor == null || !Array.isArray(activeFloor.wallIds)) {
    return <Layer name='walls' />
  }

  const walls = activeFloor.wallIds
    .map(wallId => building.walls.get(wallId))
    .filter((wall): wall is NonNullable<typeof wall> => wall !== undefined)

  return (
    <Layer name='walls'>
      {walls.map(wall => (
        <WallShape key={wall.id} wall={wall} building={building} />
      ))}
    </Layer>
  )
}
