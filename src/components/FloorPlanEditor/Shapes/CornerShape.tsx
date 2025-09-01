import { Circle, Group, Line } from 'react-konva'
import { useCallback } from 'react'
import type Konva from 'konva'
import type { Corner } from '@/types/model'
import { useSelectedEntity, useEditorStore } from '@/components/FloorPlanEditor/hooks/useEditorStore'
import { usePoint, useWalls, usePoints } from '@/model/store'
import { calculateCornerMiterPolygon } from '@/components/FloorPlanEditor/visualization/cornerVisualization'

interface CornerShapeProps {
  corner: Corner
}

export function CornerShape({ corner }: CornerShapeProps): React.JSX.Element | null {
  const selectedEntity = useSelectedEntity()
  const selectEntity = useEditorStore(state => state.selectEntity)
  const cornerPoint = usePoint(corner.pointId)
  const walls = useWalls()
  const points = usePoints()

  if (cornerPoint == null) {
    return null
  }

  const isSelected = selectedEntity === corner.pointId

  const handleClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>): void => {
      e.cancelBubble = true
      selectEntity(corner.pointId)
    },
    [selectEntity, corner.pointId]
  )

  // Calculate the miter joint polygon
  const miterPolygon = calculateCornerMiterPolygon(corner, walls, points)

  // If we have a proper miter polygon, render it instead of the circle
  if (miterPolygon && miterPolygon.points.length >= 3) {
    // Convert polygon points to a flat array for Konva Line
    const polygonArray: number[] = []
    for (const point of miterPolygon.points) {
      polygonArray.push(Number(point[0]), Number(point[1]))
    }
    // Close the polygon by adding the first point at the end
    if (miterPolygon.points.length > 0) {
      const firstPoint = miterPolygon.points[0]
      polygonArray.push(Number(firstPoint[0]), Number(firstPoint[1]))
    }

    return (
      <Group listening>
        {/* Miter joint polygon */}
        <Line
          points={polygonArray}
          fill={isSelected ? '#a5d8fb' : '#AAAAAA'}
          stroke={isSelected ? '#007acc' : '#333333'}
          strokeWidth={10}
          closed
          listening
          onClick={handleClick}
          onTap={handleClick}
        />

        {/* Selection indicator */}
        {isSelected && (
          <Line points={polygonArray} stroke="#007acc" strokeWidth={6} dash={[10, 10]} closed listening={false} />
        )}
      </Group>
    )
  }

  // Fallback to original circle rendering if miter calculation fails
  return (
    <Group x={cornerPoint.position[0]} y={cornerPoint.position[1]} listening>
      {/* Background circle for better visibility */}
      <Circle
        radius={80}
        fill="white"
        stroke="#007acc"
        strokeWidth={isSelected ? 15 : 8}
        opacity={0.95}
        listening
        onClick={handleClick}
        onTap={handleClick}
      />

      {/* Selection indicator */}
      {isSelected && <Circle radius={120} stroke="#007acc" strokeWidth={15} dash={[20, 20]} listening={false} />}
    </Group>
  )
}
