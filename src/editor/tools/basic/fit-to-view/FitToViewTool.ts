import { AllSidesIcon } from '@radix-ui/react-icons'

import { getModelActions } from '@/building/store'
import { viewportActions } from '@/editor/hooks/useViewportStore'
import type { CanvasEvent, Tool } from '@/editor/tools/system/types'
import { boundsFromPoints } from '@/shared/geometry'

export class FitToViewTool implements Tool {
  id = 'basic.fit-to-view'
  name = 'Fit to View'
  icon = '⊞' // Box fit icon
  iconComponent = AllSidesIcon
  hotkey = 'f'
  cursor = 'default'
  category = 'basic'

  // Event handlers - not needed for this tool
  handlePointerDown(_event: CanvasEvent): boolean {
    return false
  }

  // Lifecycle methods
  onActivate(): void {
    // Immediately deactivate and return to select tool
    setTimeout(async () => {
      const { pushTool } = await import('@/editor/tools/store/toolStore')
      pushTool('basic.select')
    }, 0)

    const { getActiveStorey, getPerimetersByStorey } = getModelActions()

    const activeStoreyId = getActiveStorey()
    const perimeters = getPerimetersByStorey(activeStoreyId)
    const outerPoints = perimeters.flatMap(p => p.corners.map(c => c.outsidePoint))
    const bounds = boundsFromPoints(outerPoints)

    if (!bounds) {
      console.log('No entities to fit - no bounds available')
      return
    }

    viewportActions().fitToView(bounds)
  }

  onDeactivate(): void {
    // Nothing to do on deactivate
  }
}
