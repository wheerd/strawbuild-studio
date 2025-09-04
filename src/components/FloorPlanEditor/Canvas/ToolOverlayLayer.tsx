import { useState, useMemo, useEffect } from 'react'
import { Layer } from 'react-konva'
import { useToolContext, useToolManagerState } from '@/components/FloorPlanEditor/Tools'
import { useViewport } from '@/components/FloorPlanEditor/hooks/useEditorStore'
import type { ToolOverlayContext } from '@/components/FloorPlanEditor/Tools/ToolSystem/types'
import { createVec2, type Vec2 } from '@/types/geometry'

export function ToolOverlayLayer(): React.JSX.Element {
  const toolContext = useToolContext()
  const toolManagerState = useToolManagerState()
  const viewport = useViewport()
  // Track current mouse position for tools that need it
  const [currentMousePos] = useState<Vec2 | undefined>()

  // Get active tool from tool manager
  const activeTool = toolManagerState.activeTool

  // Create overlay context
  const overlayContext: ToolOverlayContext = useMemo(
    () => ({
      toolContext,
      viewport,
      currentMousePos,
      worldToStage: (worldPos: Vec2): Vec2 =>
        createVec2(worldPos[0] * viewport.zoom + viewport.panX, worldPos[1] * viewport.zoom + viewport.panY),
      stageToWorld: (stagePos: Vec2): Vec2 =>
        createVec2((stagePos[0] - viewport.panX) / viewport.zoom, (stagePos[1] - viewport.panY) / viewport.zoom),
      getInfiniteLineExtent: (): number => {
        const worldWidth = viewport.stageWidth / viewport.zoom
        const worldHeight = viewport.stageHeight / viewport.zoom
        return Math.max(worldWidth, worldHeight) * 2
      }
    }),
    [toolContext, viewport, currentMousePos]
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
      {overlayContent}
    </Layer>
  )
}
