import { Layer, Line, Circle } from 'react-konva'
import { useActiveTool, useIsDrawing, useViewport, useCurrentSnapResult, useCurrentSnapFromPoint, useCurrentSnapTarget } from '@/components/FloorPlanEditor/hooks/useEditorStore'
import type { Point2D } from '@/types/geometry'
import { useMemo } from 'react'

interface WallPreviewLayerProps {
  wallDrawingStart: Point2D | null
  stageWidth: number
  stageHeight: number
}

export function WallPreviewLayer ({ wallDrawingStart, stageWidth, stageHeight }: WallPreviewLayerProps): React.JSX.Element {
  const activeTool = useActiveTool()
  const isDrawing = useIsDrawing()
  const currentSnapFromPoint = useCurrentSnapFromPoint()

  const viewport = useViewport()
  const snapResult = useCurrentSnapResult()
  const snapTarget = useCurrentSnapTarget()
  const snapPreviewPoint = useMemo(() => {
    return snapResult?.position ?? snapTarget
  }, [snapResult, snapTarget])

  if (activeTool !== 'wall') {
    return <Layer name='wall-preview' />
  }

  // Calculate infinite line extent accounting for zoom level and stage dimensions
  // Transform stage dimensions to world coordinates to ensure lines span beyond visible area
  const worldWidth = stageWidth / viewport.zoom
  const worldHeight = stageHeight / viewport.zoom
  const lineExtent = Math.max(worldWidth, worldHeight) * 2

  return (
    <Layer name='wall-preview' listening={false}>
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

      {/* Show active snap result */}
      {(snapResult != null) && (
        <Circle
          x={snapResult.position.x}
          y={snapResult.position.y}
          radius={15}
          fill='#0066ff'
          stroke='#ffffff'
          strokeWidth={3}
          opacity={0.9}
          listening={false}
        />
      )}

      {/* Show active snap result */}
      {(currentSnapFromPoint != null) && (
        <Circle
          x={currentSnapFromPoint.x}
          y={currentSnapFromPoint.y}
          radius={10}
          fill='#ff0000'
          stroke='#ffffff'
          strokeWidth={3}
          opacity={0.9}
          listening={false}
        />
      )}

      {/* Show snap lines */}
      {((snapResult?.lines) != null) &&
        snapResult.lines.map((line, index) => (
          <Line
            key={`snap-line-${index}`}
            points={[
              line.point.x - lineExtent * line.direction.x,
              line.point.y - lineExtent * line.direction.y,
              line.point.x + lineExtent * line.direction.x,
              line.point.y + lineExtent * line.direction.y
            ]}
            stroke='#0066ff'
            strokeWidth={10}
            opacity={0.5}
            listening={false}
          />
        ))}

    </Layer>
  )
}
