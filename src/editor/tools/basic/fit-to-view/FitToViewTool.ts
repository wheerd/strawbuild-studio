import { getModelActions } from '@/building/store'
import { viewportActions } from '@/editor/hooks/useViewportStore'
import { getToolActions } from '@/editor/tools/system'
import { DummyToolInspector, type EditorEvent, type ToolImplementation } from '@/editor/tools/system/types'
import { Bounds2D } from '@/shared/geometry'

export class FitToViewTool implements ToolImplementation {
  readonly id = 'basic.fit-to-view'
  readonly inspectorComponent = DummyToolInspector

  // Event handlers - not needed for this tool
  handlePointerDown(_event: EditorEvent): boolean {
    return false
  }

  // Lifecycle methods
  onActivate(): void {
    try {
      const { getActiveStoreyId, getPerimetersByStorey, getFloorAreasByStorey, getRoofsByStorey } = getModelActions()

      const activeStoreyId = getActiveStoreyId()
      const perimeters = getPerimetersByStorey(activeStoreyId)
      const floorAreas = getFloorAreasByStorey(activeStoreyId)
      const roofs = getRoofsByStorey(activeStoreyId)

      if (perimeters.length === 0 && floorAreas.length === 0) {
        console.log('No entities to fit - no bounds available')
        return
      }

      const perimeterPoints = perimeters.flatMap(p => p.outerPolygon.points)
      const floorAreaPoints = floorAreas.flatMap(area => area.area.points)
      const roofPoints = roofs.flatMap(roof => roof.overhangPolygon.points)
      const allPoints = [...perimeterPoints, ...floorAreaPoints, ...roofPoints]
      const bounds = Bounds2D.fromPoints(allPoints)

      viewportActions().fitToView(bounds)
    } finally {
      getToolActions().popTool()
    }
  }

  onDeactivate(): void {
    // Nothing to do on deactivate
  }
}
