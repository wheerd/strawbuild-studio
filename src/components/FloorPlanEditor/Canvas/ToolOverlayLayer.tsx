import { useState, useMemo } from 'react'
import { Layer, Line, Circle } from 'react-konva'
import { useToolContext, useToolManagerState } from '@/components/FloorPlanEditor/Tools'
import {
  useViewport,
  useCurrentSnapResult,
  useCurrentSnapTarget
} from '@/components/FloorPlanEditor/hooks/useEditorStore'
import type { ToolOverlayContext } from '@/components/FloorPlanEditor/Tools/ToolSystem/types'
import type { Point2D } from '@/types/geometry'
import { createAbsoluteOffset } from '@/types/geometry'

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
      worldToStage: (worldPos: Point2D): Point2D => ({
        x: createAbsoluteOffset(worldPos.x * viewport.zoom + viewport.panX),
        y: createAbsoluteOffset(worldPos.y * viewport.zoom + viewport.panY)
      }),
      stageToWorld: (stagePos: Point2D): Point2D => ({
        x: createAbsoluteOffset((stagePos.x - viewport.panX) / viewport.zoom),
        y: createAbsoluteOffset((stagePos.y - viewport.panY) / viewport.zoom)
      }),
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

  return (
    <Layer name="tool-overlay" listening={false}>
      {/* Snap lines (rendered for all tools) */}
      {snapResult?.lines?.map((line, index) => (
        <Line
          key={`snap-line-${index}`}
          points={[
            line.point.x - overlayContext.getInfiniteLineExtent() * line.direction.x,
            line.point.y - overlayContext.getInfiniteLineExtent() * line.direction.y,
            line.point.x + overlayContext.getInfiniteLineExtent() * line.direction.x,
            line.point.y + overlayContext.getInfiniteLineExtent() * line.direction.y
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
          x={(snapResult?.position || snapTarget)!.x}
          y={(snapResult?.position || snapTarget)!.y}
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
