import { getModelActions } from '@/building/store'
import { viewportActions } from '@/editor/hooks/useViewportStore'
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
    // Immediately deactivate and return to select tool
    setTimeout(async () => {
      const { pushTool } = await import('@/editor/tools/system/store')
      pushTool('basic.select')
    }, 0)

    const { getActiveStorey, getPerimetersByStorey } = getModelActions()

    const activeStoreyId = getActiveStorey()
    const perimeters = getPerimetersByStorey(activeStoreyId)

    if (perimeters.length === 0) {
      console.log('No entities to fit - no bounds available')
      return
    }

    const outerPoints = perimeters.flatMap(p => p.corners.map(c => c.outsidePoint))
    const bounds = boundsFromPoints(outerPoints)

    viewportActions().fitToView(bounds)
  }

  onDeactivate(): void {
    // Nothing to do on deactivate
  }
}
