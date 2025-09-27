import { Layer } from 'react-konva/lib/ReactKonvaCore'

import { useActiveTool } from '@/editor/tools/store/toolStore'

import { SelectionOverlay } from './SelectionOverlay'

export function ToolOverlayLayer(): React.JSX.Element {
  const activeTool = useActiveTool()

  return (
    <Layer name="tool-overlay" listening={false}>
      {/* Selection outlines - rendered first so tool overlays appear on top */}
      <SelectionOverlay />

      {/* Tool overlay component  */}
      {activeTool?.overlayComponent && <activeTool.overlayComponent tool={activeTool} />}
    </Layer>
  )
}
