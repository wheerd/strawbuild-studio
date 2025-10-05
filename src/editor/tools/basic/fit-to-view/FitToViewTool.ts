import { getModelActions } from '@/building/store'
import { viewportActions } from '@/editor/hooks/useViewportStore'
import { getToolActions } from '@/editor/tools/system'
import type { CanvasEvent, ToolImplementation } from '@/editor/tools/system/types'
import { boundsFromPoints } from '@/shared/geometry'

export class FitToViewTool implements ToolImplementation {
  readonly id = 'basic.fit-to-view'

  // Event handlers - not needed for this tool
  handlePointerDown(_event: CanvasEvent): boolean {
    return false
  }

  // Lifecycle methods
  onActivate(): void {
    try {
      const { getActiveStoreyId, getPerimetersByStorey } = getModelActions()

      const activeStoreyId = getActiveStoreyId()
      const perimeters = getPerimetersByStorey(activeStoreyId)

      if (perimeters.length === 0) {
        console.log('No entities to fit - no bounds available')
        return
      }

      const outerPoints = perimeters.flatMap(p => p.corners.map(c => c.outsidePoint))
      const bounds = boundsFromPoints(outerPoints)

      viewportActions().fitToView(bounds)
    } finally {
      getToolActions().popTool()
    }
  }

  onDeactivate(): void {
    // Nothing to do on deactivate
  }
}
