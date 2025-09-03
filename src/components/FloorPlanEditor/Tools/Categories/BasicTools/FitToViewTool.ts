import type { Tool, CanvasEvent } from '../../ToolSystem/types'
import { useEditorStore } from '@/components/FloorPlanEditor/hooks/useEditorStore'
import { useModelStore } from '@/model/store'
import type { Store } from '@/model/store/types'
import type { FloorId } from '@/types/ids'
import { toolManager } from '../../ToolSystem/ToolManager'
import { boundsFromPoints, type Vec2 } from '@/types/geometry'

export class FitToViewTool implements Tool {
  id = 'basic.fitToView'
  name = 'Fit to View'
  icon = '⊞' // Box fit icon
  hotkey = 'f'
  cursor = 'default'
  category = 'basic'
  hasInspector = false

  // Event handlers - not needed for this tool
  handleMouseDown(_event: CanvasEvent): boolean {
    return false
  }

  // Lifecycle methods
  onActivate(): void {
    // Perform the fit to view operation
    this.fitToView()

    // Immediately deactivate and return to select tool
    setTimeout(() => {
      toolManager.activateTool('basic.select')
    }, 0)
  }

  onDeactivate(): void {
    // Nothing to do on deactivate
  }

  private fitToView(): void {
    const editorStore = useEditorStore.getState()
    const modelStore = useModelStore.getState()

    // Get current active floor
    const activeFloorId = editorStore.activeFloorId
    const viewport = editorStore.viewport

    // Get bounds from outer walls (the main building structure) instead of all points
    const bounds = this.calculateOuterWallsBounds(modelStore, activeFloorId)

    if (!bounds) {
      console.log('No entities to fit - no bounds available')
      return
    }

    // Calculate bounds dimensions
    const boundsWidth = bounds.max[0] - bounds.min[0]
    const boundsHeight = bounds.max[1] - bounds.min[1]

    // If bounds are too small (e.g., single point), use minimum dimensions
    const minDimension = 1000 // 1 meter minimum
    const actualWidth = Math.max(boundsWidth, minDimension)
    const actualHeight = Math.max(boundsHeight, minDimension)

    // Calculate center of bounds
    const centerX = (bounds.min[0] + bounds.max[0]) / 2
    const centerY = (bounds.min[1] + bounds.max[1]) / 2

    // Calculate zoom level to fit content with some padding
    const padding = 0.1 // 10% padding around content
    const availableWidth = viewport.stageWidth * (1 - padding * 2)
    const availableHeight = viewport.stageHeight * (1 - padding * 2)

    const zoomX = availableWidth / actualWidth
    const zoomY = availableHeight / actualHeight

    // Use the smaller zoom to ensure everything fits
    const newZoom = Math.min(zoomX, zoomY)

    // Clamp zoom to reasonable bounds
    const clampedZoom = Math.max(0.01, Math.min(10, newZoom))

    // Calculate pan to center the content
    const newPanX = viewport.stageWidth / 2 - centerX * clampedZoom
    const newPanY = viewport.stageHeight / 2 - centerY * clampedZoom

    // Apply the new viewport settings
    editorStore.setViewport({
      zoom: clampedZoom,
      panX: newPanX,
      panY: newPanY
    })

    console.log(
      `Fit to view: bounds ${boundsWidth.toFixed(0)}x${boundsHeight.toFixed(0)}mm, zoom ${clampedZoom.toFixed(3)}, center (${centerX.toFixed(0)}, ${centerY.toFixed(0)})`
    )
  }

  private calculateOuterWallsBounds(modelStore: Store, floorId: FloorId): { min: Vec2; max: Vec2 } | null {
    // Get all outer walls for this floor
    const outerWalls = modelStore.getOuterWallsByFloor(floorId)

    if (!outerWalls || outerWalls.length === 0) {
      // Fallback to all points if no outer walls exist
      console.log('No outer walls found, falling back to all points')
      return modelStore.getFloorBounds(floorId)
    }

    const outerPoints = outerWalls.flatMap(w => w.corners.map(c => c.outsidePoint))

    return boundsFromPoints(outerPoints)
  }
}
