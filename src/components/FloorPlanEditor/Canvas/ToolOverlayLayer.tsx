import { useState, useMemo, useEffect } from 'react'
import { Layer } from 'react-konva'
import { useToolContext, useToolManagerState } from '@/components/FloorPlanEditor/Tools'
import type { ToolOverlayContext } from '@/components/FloorPlanEditor/Tools/ToolSystem/types'
import { type Vec2 } from '@/types/geometry'
import { SelectionOverlay } from './SelectionOverlay'

export function ToolOverlayLayer(): React.JSX.Element {
  const toolContext = useToolContext()
  const toolManagerState = useToolManagerState()
  // Track current mouse position for tools that need it
  const [currentMousePos] = useState<Vec2 | undefined>()

  // Get active tool from tool manager
  const activeTool = toolManagerState.activeTool

  // Create overlay context
  const overlayContext: ToolOverlayContext = useMemo(
    () => ({
      toolContext,
      currentMousePos
    }),
    [toolContext, currentMousePos]
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
      {/* Selection outlines - rendered first so tool overlays appear on top */}
      <SelectionOverlay />

      {/* Tool-specific overlay content */}
      {overlayContent}
    </Layer>
  )
}
