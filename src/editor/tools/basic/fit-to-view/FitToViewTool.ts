import { getModelActions } from '@/building/store'
import { viewportActions } from '@/editor/hooks/useViewportStore'
import { getToolActions } from '@/editor/tools/system'
import { DummyToolInspector, type EditorEvent, type ToolImplementation } from '@/editor/tools/system/types'

export class FitToViewTool implements ToolImplementation {
  readonly id = 'basic.fit-to-view'
  readonly inspectorComponent = DummyToolInspector

  handlePointerDown(_event: EditorEvent): boolean {
    return false
  }

  onActivate(): void {
    try {
      const { getActiveStoreyId, getBounds } = getModelActions()

      const activeStoreyId = getActiveStoreyId()
      const bounds = getBounds(activeStoreyId)

      if (bounds.isEmpty) {
        console.log('No entities to fit - no bounds available')
        return
      }

      viewportActions().fitToView(bounds)
    } finally {
      getToolActions().popTool()
    }
  }

  onDeactivate(): void {
    // Nothing to do on deactivate
  }
}
