import { useState, useMemo, useEffect } from 'react'
import { Layer, Line, Circle } from 'react-konva'
import { useToolContext, useToolManagerState } from '@/components/FloorPlanEditor/Tools'
import {
  useViewport,
  useCurrentSnapResult,
  useCurrentSnapTarget
} from '@/components/FloorPlanEditor/hooks/useEditorStore'
import type { ToolOverlayContext } from '@/components/FloorPlanEditor/Tools/ToolSystem/types'
import { createPoint2D, type Point2D } from '@/types/geometry'

export function ToolOverlayLayer(): React.JSX.Element {
  const toolContext = useToolContext()
  const toolManagerState = useToolManagerState()
  const viewport = useViewport()
  const snapResult = useCurrentSnapResult()
  const snapTarget = useCurrentSnapTarget()

  // Track current mouse position for tools that need it
  const [currentMousePos] = useState<Point2D | undefined>()

  // Get active tool from tool manager
  const activeTool = toolManagerState.activeTool

  // Create overlay context
  const overlayContext: ToolOverlayContext = useMemo(
    () => ({
      toolContext,
      viewport,
      currentMousePos,
      snapResult,
      snapTarget,
      worldToStage: (worldPos: Point2D): Point2D =>
        createPoint2D(worldPos[0] * viewport.zoom + viewport.panX, worldPos[1] * viewport.zoom + viewport.panY),
      stageToWorld: (stagePos: Point2D): Point2D =>
        createPoint2D((stagePos[0] - viewport.panX) / viewport.zoom, (stagePos[1] - viewport.panY) / viewport.zoom),
      getInfiniteLineExtent: (): number => {
        const worldWidth = viewport.stageWidth / viewport.zoom
        const worldHeight = viewport.stageHeight / viewport.zoom
        return Math.max(worldWidth, worldHeight) * 2
      }
    }),
    [toolContext, viewport, currentMousePos, snapResult, snapTarget]
  )

  // Get overlay content from active tool
  const overlayContent = activeTool?.renderOverlay?.(overlayContext)
  const [, forceUpdate] = useState(0)
  const rerenderListener = () => {
    forceUpdate(prev => prev + 1)
  }

  useEffect(() => {
    return activeTool?.onRenderNeeded?.(rerenderListener)
  }, [activeTool])

  return (
    <Layer name="tool-overlay" listening={false}>
      {/* Snap lines (rendered for all tools) */}
      {snapResult?.lines?.map((line, index) => (
        <Line
          key={`snap-line-${index}`}
          points={[
            line.point[0] - overlayContext.getInfiniteLineExtent() * line.direction[0],
            line.point[1] - overlayContext.getInfiniteLineExtent() * line.direction[1],
            line.point[0] + overlayContext.getInfiniteLineExtent() * line.direction[0],
            line.point[1] + overlayContext.getInfiniteLineExtent() * line.direction[1]
          ]}
          stroke="#0066ff"
          strokeWidth={8}
          opacity={0.5}
          listening={false}
        />
      ))}

      {/* Active snap point indicator */}
      {(snapResult?.position || snapTarget) && (
        <Circle
          x={(snapResult?.position || snapTarget)![0]}
          y={(snapResult?.position || snapTarget)![1]}
          radius={15}
          fill="#0066ff"
          stroke="#ffffff"
          strokeWidth={3}
          opacity={0.9}
          listening={false}
        />
      )}

      {/* Tool-specific overlay content */}
      {overlayContent}
    </Layer>
  )
}
