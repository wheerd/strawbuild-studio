import { Circle, Group } from 'react-konva'
import { useCallback } from 'react'
import type Konva from 'konva'
import type { Corner } from '@/types/model'
import { useSelectedEntity, useEditorStore } from '@/components/FloorPlanEditor/hooks/useEditorStore'
import { usePoint } from '@/model/store'

interface CornerShapeProps {
  corner: Corner
}

export function CornerShape ({ corner }: CornerShapeProps): React.JSX.Element | null {
  const selectedEntity = useSelectedEntity()
  const selectEntity = useEditorStore(state => state.selectEntity)
  const cornerPoint = usePoint(corner.pointId)

  if (cornerPoint == null) {
    return null
  }

  const isSelected = selectedEntity === corner.pointId

  const handleClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>): void => {
    e.cancelBubble = true
    selectEntity(corner.pointId)
  }, [selectEntity, corner.pointId])

  return (
    <Group
      x={cornerPoint.position.x}
      y={cornerPoint.position.y}
      // Allow group to listen for interactions on specific children
      listening
    >
      {/* Background circle for better visibility - much larger */}
      <Circle
        radius={80}
        fill='white'
        stroke='#007acc'
        strokeWidth={isSelected ? 15 : 8} // Much thicker stroke
        opacity={0.95}
        // Allow clicking only on the background circle
        listening
        onClick={handleClick}
        onTap={handleClick}
      />

      {/* Selection indicator - much larger */}
      {isSelected && (
        <Circle
          radius={120} // Much larger selection ring
          stroke='#007acc'
          strokeWidth={15} // Thicker selection stroke
          dash={[20, 20]} // Larger dash pattern
          listening={false}
        />
      )}
    </Group>
  )
}
