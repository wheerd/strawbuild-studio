import { Line } from 'react-konva'
import type { Wall } from '../../../types/model'
import { useSelectedEntities, useEditorStore } from '../hooks/useEditorStore'
import { useConnectionPoints } from '../../../model/store'

interface WallShapeProps {
  wall: Wall
}

export function WallShape ({ wall }: WallShapeProps): React.JSX.Element | null {
  // Use individual selectors to avoid object creation
  const selectedEntities = useSelectedEntities()
  const toggleEntitySelection = useEditorStore(state => state.toggleEntitySelection)
  const connectionPoints = useConnectionPoints()

  const startPoint = connectionPoints.get(wall.startPointId)
  const endPoint = connectionPoints.get(wall.endPointId)

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