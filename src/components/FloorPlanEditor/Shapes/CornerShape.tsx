import { Circle, Text, Group } from 'react-konva'
import { useCallback } from 'react'
import type Konva from 'konva'
import type { Corner } from '@/types/model'
import { useSelectedEntity, useEditorStore } from '@/components/FloorPlanEditor/hooks/useEditorStore'
import { usePoints } from '@/model/store'
import { radiansToDegrees } from '@/types/geometry'

interface CornerShapeProps {
  corner: Corner
}

// Define corner type symbols and colors
const cornerTypeConfig = {
  corner: {
    symbol: '⌐', // Corner symbol
    color: '#007acc',
    symbolSize: 16,
    bgRadius: 12
  },
  straight: {
    symbol: '━', // Straight line symbol
    color: '#666666',
    symbolSize: 18,
    bgRadius: 12
  },
  tee: {
    symbol: '┬', // T-junction symbol
    color: '#ff6b35',
    symbolSize: 16,
    bgRadius: 12
  },
  cross: {
    symbol: '┼', // Cross/intersection symbol
    color: '#ff0000',
    symbolSize: 16,
    bgRadius: 12
  }
}

export function CornerShape ({ corner }: CornerShapeProps): React.JSX.Element | null {
  const selectedEntity = useSelectedEntity()
  const selectEntity = useEditorStore(state => state.selectEntity)
  const points = usePoints()

  const cornerPoint = points.get(corner.pointId)

  if (cornerPoint == null) {
    return null
  }

  const isSelected = selectedEntity === corner.id
  const config = cornerTypeConfig[corner.type]

  // Convert angle from radians to degrees for display
  const angleInDegrees = Math.round(radiansToDegrees(corner.angle))

  const handleClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>): void => {
    e.cancelBubble = true
    selectEntity(corner.id)
  }, [selectEntity, corner.id])

  return (
    <Group
      x={cornerPoint.position.x}
      y={cornerPoint.position.y}
      // Allow group to listen for interactions on specific children
      listening={true}
    >
      {/* Background circle for better visibility - much larger */}
      <Circle
        radius={config.bgRadius}
        fill='white'
        stroke={config.color}
        strokeWidth={isSelected ? 3 : 2}
        opacity={0.95}
        // Allow clicking only on the background circle
        listening
        onClick={handleClick}
        onTap={handleClick}
      />

      {/* Combined symbol and angle text - only visible when selected */}
      {isSelected && corner.type !== 'straight' && (
        <Text
          text={`${config.symbol} ${angleInDegrees}°`}
          fontSize={12}
          fill={config.color}
          fontFamily='Arial'
          fontStyle='bold'
          align='center'
          x={0}
          y={-30}
          offsetX={0}
          offsetY={0}
          // Strong background for readability
          shadowColor='white'
          shadowBlur={4}
          shadowOpacity={1}
          listening={false}
        />
      )}

      {/* Selection indicator - larger */}
      {isSelected && (
        <Circle
          radius={18}
          stroke='#007acc'
          strokeWidth={3}
          dash={[4, 4]}
          listening={false}
        />
      )}
    </Group>
  )
}
