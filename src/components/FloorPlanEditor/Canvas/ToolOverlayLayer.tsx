import { useState, useEffect, useCallback } from 'react'
import { Layer } from 'react-konva'
import { useToolManagerState } from '@/components/FloorPlanEditor/Tools'
import { SelectionOverlay } from './SelectionOverlay'

export function ToolOverlayLayer(): React.JSX.Element {
  const toolManagerState = useToolManagerState()
  const activeTool = toolManagerState.activeTool

  const [, forceUpdate] = useState(0)
  const rerenderListener = useCallback(() => {
    forceUpdate(prev => prev + 1)
  }, [forceUpdate])

  useEffect(() => activeTool?.onRenderNeeded?.(rerenderListener), [activeTool])

  return (
    <Layer name="tool-overlay" listening={false}>
      {/* Selection outlines - rendered first so tool overlays appear on top */}
      <SelectionOverlay />

      {/* Tool overlay component  */}
      {activeTool?.overlayComponent && <activeTool.overlayComponent tool={activeTool} />}
    </Layer>
  )
}
