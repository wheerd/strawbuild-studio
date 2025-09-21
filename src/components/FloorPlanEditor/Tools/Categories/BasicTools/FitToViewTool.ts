import type { Tool, CanvasEvent, ToolContext } from '@/components/FloorPlanEditor/Tools/ToolSystem/types'
import { getModelActions } from '@/model/store'
import { toolManager } from '@/components/FloorPlanEditor/Tools/ToolSystem/ToolManager'
import { boundsFromPoints } from '@/types/geometry'
import { AllSidesIcon } from '@radix-ui/react-icons'

export class FitToViewTool implements Tool {
  id = 'basic.fitToView'
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
  onActivate(context: ToolContext): void {
    // Immediately deactivate and return to select tool
    setTimeout(() => {
      toolManager.activateTool('basic.select', context)
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

    context.fitToView(bounds)
  }

  onDeactivate(): void {
    // Nothing to do on deactivate
  }
}
