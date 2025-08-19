import { Line } from 'react-konva'
import type { Wall, Building } from '../../../types/model'
import { useModelStore } from '../../../model/store'

interface WallShapeProps {
  wall: Wall
  building: Building
}

export function WallShape ({ wall, building }: WallShapeProps): React.JSX.Element | null {
  // Use individual selectors instead of useSelectedEntities() and useModelActions()
  const selectedEntities = useModelStore(state => state.selectedEntityIds)
  const toggleEntitySelection = useModelStore(state => state.toggleEntitySelection)

  const startPoint = building.connectionPoints.get(wall.startPointId)
  const endPoint = building.connectionPoints.get(wall.endPointId)

  if (startPoint == null || endPoint == null) {
    return null
  }

  const isSelected = selectedEntities.includes(wall.id)

  const handleClick = (): void => {
    toggleEntitySelection(wall.id)
  }

  return (
    <Line
      points={[startPoint.position.x, startPoint.position.y, endPoint.position.x, endPoint.position.y]}
      stroke={isSelected ? '#007acc' : '#333333'}
      strokeWidth={wall.thickness / 10}
      lineCap='round'
      onClick={handleClick}
      onTap={handleClick}
    />
  )
}
