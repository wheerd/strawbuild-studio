import type { Tool, CanvasEvent, ToolContext } from '@/components/FloorPlanEditor/Tools/ToolSystem/types'
import { useEditorStore } from '@/components/FloorPlanEditor/hooks/useEditorStore'
import { useModelStore } from '@/model/store'
import type { Store } from '@/model/store/types'
import type { StoreyId } from '@/types/ids'
import { toolManager } from '@/components/FloorPlanEditor/Tools/ToolSystem/ToolManager'
import { boundsFromPoints, type Bounds2D } from '@/types/geometry'
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

    // Perform the fit to view operation
    const editorStore = useEditorStore.getState()
    const modelStore = useModelStore.getState()

    // Get current active storey
    const activeStoreyId = editorStore.activeStoreyId

    // Get bounds from perimeters (the main building structure) instead of all points
    const bounds = this.calculateOuterWallsBounds(modelStore, activeStoreyId)

    if (!bounds) {
      console.log('No entities to fit - no bounds available')
      return
    }

    context.fitToView(bounds)
  }

  onDeactivate(): void {
    // Nothing to do on deactivate
  }

  private calculateOuterWallsBounds(modelStore: Store, storeyId: StoreyId): Bounds2D | null {
    const perimeters = modelStore.getPerimetersByStorey(storeyId)
    const outerPoints = perimeters.flatMap(p => p.corners.map(c => c.outsidePoint))
    return boundsFromPoints(outerPoints)
  }
}
