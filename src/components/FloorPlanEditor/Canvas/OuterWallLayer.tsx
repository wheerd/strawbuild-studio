import { Layer } from 'react-konva'
import { useFloorOuterWalls } from '@/model/store'
import { useActiveFloorId } from '@/components/FloorPlanEditor/hooks/useEditorStore'
import { OuterWallShape } from '@/components/FloorPlanEditor/Shapes/OuterWallShape'

export function OuterWallLayer(): React.JSX.Element {
  const activeFloorId = useActiveFloorId()
  const outerWalls = useFloorOuterWalls(activeFloorId)

  return (
    <Layer name="outer-walls">
      {outerWalls.map(outerWall => (
        <OuterWallShape key={outerWall.id} outerWall={outerWall} />
      ))}
    </Layer>
  )
}
