import { Layer, Line, Circle } from 'react-konva'
import { useActiveTool, useIsDrawing, useShowSnapPreview, useSnapPreviewPoint } from '../hooks/useEditorStore'
import { useConnectionPoints } from '../../../model/store'
import type { Point2D } from '../../../types/model'

interface WallPreviewLayerProps {
  wallDrawingStart: Point2D | null
}

export function WallPreviewLayer ({ wallDrawingStart }: WallPreviewLayerProps): React.JSX.Element {
  const activeTool = useActiveTool()
  const isDrawing = useIsDrawing()
  const showSnapPreview = useShowSnapPreview()
  const snapPreviewPoint = useSnapPreviewPoint()
  const connectionPoints = useConnectionPoints()

  if (activeTool !== 'wall') {
    return <Layer name='wall-preview' />
  }

  return (
    <Layer name='wall-preview' listening={false}>
      {/* Show snap preview point */}
      {showSnapPreview && snapPreviewPoint && (
        <Circle
          x={snapPreviewPoint.x}
          y={snapPreviewPoint.y}
          radius={5}
          fill='#007acc'
          opacity={0.7}
          listening={false}
        />
      )}
      
      {/* Show preview wall line */}
      {isDrawing && wallDrawingStart && snapPreviewPoint && (
        <Line
          points={[
            wallDrawingStart.x, 
            wallDrawingStart.y, 
            snapPreviewPoint.x, 
            snapPreviewPoint.y
          ]}
          stroke='#007acc'
          strokeWidth={2}
          opacity={0.7}
          dash={[5, 5]}
          listening={false}
        />
      )}
      
      {/* Show connection points as snap targets */}
      {Array.from(connectionPoints.values()).map(point => (
        <Circle
          key={point.id}
          x={point.position.x}
          y={point.position.y}
          radius={3}
          fill='#ff6b35'
          opacity={0.6}
          listening={false}
        />
      ))}
    </Layer>
  )
}