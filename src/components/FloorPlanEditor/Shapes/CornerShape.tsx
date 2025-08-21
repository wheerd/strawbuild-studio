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

// Define corner type symbols and colors - much larger for real-world scale
const cornerTypeConfig = {
  corner: {
    symbol: '⌐', // Corner symbol
    color: '#007acc',
    symbolSize: 120, // Much larger
    bgRadius: 80    // Much larger background
  },
  straight: {
    symbol: '━', // Straight line symbol
    color: '#666666',
    symbolSize: 140, // Much larger
    bgRadius: 80     // Much larger background
  },
  tee: {
    symbol: '┬', // T-junction symbol
    color: '#ff6b35',
    symbolSize: 120, // Much larger
    bgRadius: 80     // Much larger background
  },
  cross: {
    symbol: '┼', // Cross/intersection symbol
    color: '#ff0000',
    symbolSize: 120, // Much larger
    bgRadius: 80     // Much larger background
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
      listening
    >
      {/* Background circle for better visibility - much larger */}
      <Circle
        radius={config.bgRadius}
        fill='white'
        stroke={config.color}
        strokeWidth={isSelected ? 15 : 8} // Much thicker stroke
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
          fontSize={60} // Much larger font
          fill={config.color}
          fontFamily='Arial'
          fontStyle='bold'
          align='center'
          x={0}
          y={-150} // Positioned further away
          offsetX={0}
          offsetY={0}
          // Strong background for readability
          shadowColor='white'
          shadowBlur={20} // Larger shadow
          shadowOpacity={1}
          listening={false}
        />
      )}

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
