import type { Tool, CanvasEvent } from '@/components/FloorPlanEditor/Tools/ToolSystem/types'
import type { Vec2, Polygon2D, LineSegment2D, Length } from '@/types/geometry'
import {
  createLength,
  createVec2,
  polygonIsClockwise,
  wouldPolygonSelfIntersect,
  wouldClosingPolygonSelfIntersect,
  distanceSquared
} from '@/types/geometry'
import type { SnappingContext, SnapResult } from '@/model/store/services/snapping/types'
import type { OuterWallConstructionType } from '@/types/model'
import { PerimeterToolOverlay } from './PerimeterToolOverlay'
import { PerimeterToolInspector } from '@/components/FloorPlanEditor/Tools/PropertiesPanel/ToolInspectors/PerimeterToolInspector'
import { SnappingService } from '@/model/store/services/snapping'
import { BaseTool } from '@/components/FloorPlanEditor/Tools/ToolSystem/BaseTool'
import { BorderAllIcon } from '@radix-ui/react-icons'

interface PerimeterToolState {
  points: Vec2[]
  mouse: Vec2
  snapResult?: SnapResult
  snapContext: SnappingContext
  isCurrentLineValid: boolean
  isClosingLineValid: boolean
  constructionType: OuterWallConstructionType
  wallThickness: Length
}

export class PerimeterTool extends BaseTool implements Tool {
  readonly id = 'perimeter-polygon'
  readonly name = 'Building Perimeter'
  readonly icon = '⬜'
  readonly iconComponent = BorderAllIcon
  readonly hotkey = 'w'
  readonly cursor = 'crosshair'
  readonly category = 'walls'
  readonly overlayComponent = PerimeterToolOverlay
  readonly inspectorComponent = PerimeterToolInspector

  public state: PerimeterToolState = {
    points: [],
    mouse: createVec2(0, 0),
    snapContext: {
      snapPoints: [],
      alignPoints: [],
      referenceLineSegments: []
    },
    isCurrentLineValid: true,
    isClosingLineValid: true,
    constructionType: 'infill',
    wallThickness: createLength(440) // Default 44cm thickness
  }

  private snapService = new SnappingService()

  /**
   * Check if the current snap result is snapping to the first point of the polygon
   */
  public isSnappingToFirstPoint(): boolean {
    if (this.state.points.length === 0 || !this.state.snapResult?.position) {
      return false
    }
    const firstPoint = this.state.points[0]
    const snapPos = this.state.snapResult.position
    // Use a small threshold (5mm) to detect if snapping to first point
    return distanceSquared(firstPoint, snapPos) < 25 // 5mm squared
  }

  public setConstructionType(constructionType: OuterWallConstructionType): void {
    this.state.constructionType = constructionType
    this.triggerRender()
  }

  public setWallThickness(thickness: Length): void {
    this.state.wallThickness = thickness
    this.triggerRender()
  }

  public cancel(): void {
    this.cancelPolygon()
  }

  public complete(): void {
    if (this.state.points.length >= 3 && this.state.isClosingLineValid) {
      this.completePolygon(null)
    }
  }

  private updateSnapContext() {
    const referenceLineSegments: LineSegment2D[] = []
    for (let i = 1; i < this.state.points.length; i++) {
      const start = this.state.points[i - 1]
      const end = this.state.points[i]
      referenceLineSegments.push({ start, end })
    }

    this.state.snapContext = {
      snapPoints: this.state.points.slice(0, 1),
      alignPoints: this.state.points,
      referencePoint: this.state.points[this.state.points.length - 1],
      referenceLineSegments
    }
    this.triggerRender()
  }

  handleMouseDown(event: CanvasEvent): boolean {
    const stageCoords = event.stageCoordinates
    this.state.mouse = stageCoords
    this.state.snapResult = this.snapService.findSnapResult(stageCoords, this.state.snapContext) ?? undefined
    const snapCoords = this.state.snapResult?.position ?? stageCoords

    // Check if clicking near the first point to close the polygon
    if (this.state.points.length >= 3) {
      if (this.isSnappingToFirstPoint()) {
        // Only allow closing if it wouldn't create intersections
        if (this.state.isClosingLineValid) {
          this.completePolygon(event)
        }
        return true
      }
    }

    // Only add point if the line is valid (doesn't create intersections)
    if (this.state.isCurrentLineValid) {
      this.state.points.push(snapCoords)
      this.updateSnapContext()
      // Update validation for new state
      this.updateValidation()
    }

    return true
  }

  handleMouseMove(event: CanvasEvent): boolean {
    const stageCoords = event.stageCoordinates
    this.state.mouse = stageCoords
    this.state.snapResult = this.snapService.findSnapResult(stageCoords, this.state.snapContext) ?? undefined

    // Update validation based on current mouse position
    this.updateValidation()

    this.triggerRender()
    return true
  }

  handleKeyDown(event: CanvasEvent): boolean {
    const keyEvent = event.originalEvent as KeyboardEvent

    if (keyEvent.key === 'Escape') {
      // Only handle escape if we have points, otherwise bubble up
      if (this.state.points.length > 0) {
        this.cancelPolygon()
        return true
      }
      return false // Bubble up to allow tool cancellation
    }

    if (keyEvent.key === 'Enter' && this.state.points.length >= 3) {
      this.completePolygon(event)
      return true
    }

    return false
  }

  onActivate(): void {
    this.state.points = []
    this.state.isCurrentLineValid = true
    this.state.isClosingLineValid = true
    this.updateSnapContext()
  }

  onDeactivate(): void {
    this.state.points = []
    this.state.isCurrentLineValid = true
    this.state.isClosingLineValid = true
    this.updateSnapContext()
  }

  private completePolygon(event: CanvasEvent | null): void {
    if (this.state.points.length < 3) return

    // Only complete if closing wouldn't create intersections
    if (!this.state.isClosingLineValid) return

    // Create polygon and ensure clockwise order for outer walls
    let polygon: Polygon2D = { points: [...this.state.points] }

    // Check if polygon is clockwise, if not reverse it
    if (!polygonIsClockwise(polygon)) {
      polygon = { points: [...this.state.points].reverse() }
    }

    if (event) {
      const modelStore = event.context.getModelStore()
      const activeFloorId = event.context.getActiveFloorId()

      try {
        modelStore.addPerimeter(activeFloorId, polygon, this.state.constructionType, this.state.wallThickness)
      } catch (error) {
        console.error('Failed to create outer wall polygon:', error)
      }
    }

    this.state.points = []
    this.state.isCurrentLineValid = true
    this.state.isClosingLineValid = true
    this.updateSnapContext()
  }

  private cancelPolygon(): void {
    this.state.points = []
    this.state.isCurrentLineValid = true
    this.state.isClosingLineValid = true
    this.updateSnapContext()
  }

  private updateValidation(): void {
    if (this.state.points.length === 0) {
      this.state.isCurrentLineValid = true
      this.state.isClosingLineValid = true
      return
    }

    const currentPos = this.state.snapResult?.position ?? this.state.mouse

    // Special case: if snapping to the first point (closing the polygon),
    // don't check for point reuse but still check intersection
    const isSnapToFirstPoint = this.isSnappingToFirstPoint()

    if (isSnapToFirstPoint) {
      // When closing polygon, only check if closing would create intersections
      this.state.isCurrentLineValid =
        this.state.points.length >= 3 ? !wouldClosingPolygonSelfIntersect(this.state.points) : true
    } else {
      // Normal case: check for both intersections and point reuse
      this.state.isCurrentLineValid = !wouldPolygonSelfIntersect(this.state.points, currentPos)
    }

    // Check if closing the polygon would create intersections
    if (this.state.points.length >= 3) {
      this.state.isClosingLineValid = !wouldClosingPolygonSelfIntersect(this.state.points)
    } else {
      this.state.isClosingLineValid = true
    }
  }
}
