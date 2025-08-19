import { Circle } from 'react-konva'
import type { ConnectionPoint } from '../../../types/model'
import { useSelectedEntities, useEditorStore } from '../hooks/useEditorStore'

interface ConnectionPointShapeProps {
  point: ConnectionPoint
}

export function ConnectionPointShape ({ point }: ConnectionPointShapeProps): React.JSX.Element {
  // Use individual selectors to avoid object creation
  const selectedEntities = useSelectedEntities()
  const toggleEntitySelection = useEditorStore(state => state.toggleEntitySelection)

  const isSelected = selectedEntities.includes(point.id)

  const handleClick = (): void => {
    toggleEntitySelection(point.id)
  }

  return (
    <Circle
      x={point.position.x}
      y={point.position.y}
      radius={6}
      fill={isSelected ? '#007acc' : '#666666'}
      stroke='#333333'
      strokeWidth={1}
      onClick={handleClick}
      onTap={handleClick}
    />
  )
}