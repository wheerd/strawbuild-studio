import { getModelActions } from '@/building/store'
import { viewportActions } from '@/editor/hooks/useViewportStore'
import { getToolActions } from '@/editor/tools/system'
import { type CanvasEvent, DummyToolInspector, type ToolImplementation } from '@/editor/tools/system/types'
import { boundsFromPoints } from '@/shared/geometry'

export class FitToViewTool implements ToolImplementation {
  readonly id = 'basic.fit-to-view'
  readonly inspectorComponent = DummyToolInspector

  // Event handlers - not needed for this tool
  handlePointerDown(_event: CanvasEvent): boolean {
    return false
  }

  // Lifecycle methods
  onActivate(): void {
    try {
      const { getActiveStoreyId, getPerimetersByStorey, getFloorAreasByStorey } = getModelActions()

      const activeStoreyId = getActiveStoreyId()
      const perimeters = getPerimetersByStorey(activeStoreyId)
      const floorAreas = getFloorAreasByStorey(activeStoreyId)

      if (perimeters.length === 0 && floorAreas.length === 0) {
        console.log('No entities to fit - no bounds available')
        return
      }

      const perimeterPoints = perimeters.flatMap(p => p.corners.map(c => c.outsidePoint))
      const floorAreaPoints = floorAreas.flatMap(area => area.area.points)
      const allPoints = [...perimeterPoints, ...floorAreaPoints]
      const bounds = boundsFromPoints(allPoints)

      viewportActions().fitToView(bounds)
    } finally {
      getToolActions().popTool()
    }
  }

  onDeactivate(): void {
    // Nothing to do on deactivate
  }
}
