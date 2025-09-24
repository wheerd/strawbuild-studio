import { Layer } from 'react-konva/lib/ReactKonvaCore'
import { useToolManagerState } from '@/editor/tools/system'
import { SelectionOverlay } from './SelectionOverlay'

export function ToolOverlayLayer(): React.JSX.Element {
  const { activeTool } = useToolManagerState()

  return (
    <Layer name="tool-overlay" listening={false}>
      {/* Selection outlines - rendered first so tool overlays appear on top */}
      <SelectionOverlay />

      {/* Tool overlay component  */}
      {activeTool?.overlayComponent && <activeTool.overlayComponent tool={activeTool} />}
    </Layer>
  )
}
