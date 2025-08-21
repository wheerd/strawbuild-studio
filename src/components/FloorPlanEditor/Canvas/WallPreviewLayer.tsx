import { Layer, Line, Circle } from 'react-konva'
import { useActiveTool, useIsDrawing, useShowSnapPreview, useSnapPreviewPoint, useActiveFloorId } from '@/components/FloorPlanEditor/hooks/useEditorStore'
import { usePoints, useModelStore } from '@/model/store'
import {
  findSnapPoint,
  type SnapResult
} from '@/model/operations'
import type { Point2D } from '@/types/geometry'

interface WallPreviewLayerProps {
  wallDrawingStart: Point2D | null
}

export function WallPreviewLayer ({ wallDrawingStart }: WallPreviewLayerProps): React.JSX.Element {
  const activeTool = useActiveTool()
  const isDrawing = useIsDrawing()
  const showSnapPreview = useShowSnapPreview()
  const snapPreviewPoint = useSnapPreviewPoint()
  const activeFloorId = useActiveFloorId()
  const points = usePoints()
  const modelState = useModelStore()

  if (activeTool !== 'wall') {
    return <Layer name='wall-preview' />
  }

  // Get current snap result if we're drawing a wall
  let snapResult: SnapResult | null = null

  if (isDrawing && (wallDrawingStart != null) && (snapPreviewPoint != null)) {
    snapResult = findSnapPoint(modelState, snapPreviewPoint, wallDrawingStart, activeFloorId, false)
  }

  return (
    <Layer name='wall-preview' listening={false}>
      {/* Show snap preview point */}
      {showSnapPreview && (snapPreviewPoint != null) && (
        <Circle
          x={snapPreviewPoint.x}
          y={snapPreviewPoint.y}
          radius={50}
          fill='#007acc'
          opacity={0.7}
          listening={false}
        />
      )}

      {/* Show preview wall line */}
      {isDrawing && (wallDrawingStart != null) && (snapPreviewPoint != null) && (
        <Line
          points={[
            wallDrawingStart.x,
            wallDrawingStart.y,
            snapPreviewPoint.x,
            snapPreviewPoint.y
          ]}
          stroke='#007acc'
          strokeWidth={200} // Make it same thickness as actual walls for visibility
          opacity={0.5}
          dash={[10, 10]} // Larger dashes to match thicker line
          listening={false}
        />
      )}

      {/* Show connection points as snap targets */}
      {Array.from(points.values()).map(point => (
        <Circle
          key={point.id}
          x={point.position.x}
          y={point.position.y}
          radius={80}
          fill='#ff6b35'
          opacity={0.6}
          listening={false}
        />
      ))}

      {/* Show active snap result */}
      {(snapResult != null) && (
        <Circle
          x={snapResult.position.x}
          y={snapResult.position.y}
          radius={15}
          fill={snapResult.type === 'point' ? '#ff6600' : '#0066ff'}
          stroke='#ffffff'
          strokeWidth={3}
          opacity={0.9}
          listening={false}
        />
      )}

      {/* Show active snap line if snapping to a line */}
      {(snapResult != null) && snapResult.type === 'line' && (snapResult.line != null) && (snapPreviewPoint != null) && (
        <Line
          points={(() => {
            const line = snapResult.line
            const lineExtent = 2000 // Extend line in both directions

            if (line.type === 'horizontal') {
              return [
                snapPreviewPoint.x - lineExtent, line.position.y,
                snapPreviewPoint.x + lineExtent, line.position.y
              ]
            } else if (line.type === 'vertical') {
              return [
                line.position.x, snapPreviewPoint.y - lineExtent,
                line.position.x, snapPreviewPoint.y + lineExtent
              ]
            } else if (line.type === 'extension') {
              return [
                line.position.x - lineExtent * line.direction.x, line.position.y - lineExtent * line.direction.y,
                line.position.x + lineExtent * line.direction.x, line.position.y + lineExtent * line.direction.y
              ]
            } else if (line.type === 'perpendicular') {
              return [
                line.position.x - lineExtent * line.direction.x, line.position.y - lineExtent * line.direction.y,
                line.position.x + lineExtent * line.direction.x, line.position.y + lineExtent * line.direction.y
              ]
            }
            return []
          })()}
          stroke={(() => {
            const colors = {
              horizontal: '#0066ff',
              vertical: '#6600ff',
              extension: '#ff6600',
              perpendicular: '#00ff00'
            }
            return colors[snapResult.line.type] ?? '#666666'
          })()}
          strokeWidth={20}
          dash={[10, 5]}
          opacity={0.7}
          listening={false}
        />
      )}
    </Layer>
  )
}
