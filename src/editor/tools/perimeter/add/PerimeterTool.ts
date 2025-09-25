import { BorderAllIcon } from '@radix-ui/react-icons'

import type { PerimeterConstructionMethodId, RingBeamConstructionMethodId } from '@/building/model/ids'
import { useConfigStore } from '@/construction/config/store'
import { useViewportActions } from '@/editor/hooks/useViewportStore'
import { activateLengthInput, deactivateLengthInput, updateLengthInputPosition } from '@/editor/services/length-input'
import type { LengthInputPosition } from '@/editor/services/length-input'
import { SnappingService } from '@/editor/services/snapping'
import type { SnapResult, SnappingContext } from '@/editor/services/snapping/types'
import { BaseTool } from '@/editor/tools/system/BaseTool'
import type { CanvasEvent, Tool } from '@/editor/tools/system/types'
import type { Length, LineSegment2D, Polygon2D, Vec2 } from '@/shared/geometry'
import {
  add,
  createLength,
  createVec2,
  distanceSquared,
  normalize,
  polygonIsClockwise,
  scale,
  subtract,
  wouldClosingPolygonSelfIntersect,
  wouldPolygonSelfIntersect
} from '@/shared/geometry'

import { PerimeterToolInspector } from './PerimeterToolInspector'
import { PerimeterToolOverlay } from './PerimeterToolOverlay'

interface PerimeterToolState {
  points: Vec2[]
  pointer: Vec2
  snapResult?: SnapResult
  snapContext: SnappingContext
  isCurrentLineValid: boolean
  isClosingLineValid: boolean
  constructionMethodId: PerimeterConstructionMethodId
  wallThickness: Length
  baseRingBeamMethodId?: RingBeamConstructionMethodId
  topRingBeamMethodId?: RingBeamConstructionMethodId
}

export class PerimeterTool extends BaseTool implements Tool {
  readonly id = 'perimeter'
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
    pointer: createVec2(0, 0),
    snapContext: {
      snapPoints: [],
      alignPoints: [],
      referenceLineWalls: []
    },
    isCurrentLineValid: true,
    isClosingLineValid: true,
    wallThickness: createLength(440), // Default 44cm thickness,
    constructionMethodId: '' as PerimeterConstructionMethodId // Set on activation
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

  public setConstructionMethod(methodId: PerimeterConstructionMethodId): void {
    this.state.constructionMethodId = methodId
    this.triggerRender()
  }

  public setWallThickness(thickness: Length): void {
    this.state.wallThickness = thickness
    this.triggerRender()
  }

  public setBaseRingBeam(methodId: RingBeamConstructionMethodId | undefined): void {
    this.state.baseRingBeamMethodId = methodId
    this.triggerRender()
  }

  public setTopRingBeam(methodId: RingBeamConstructionMethodId | undefined): void {
    this.state.topRingBeamMethodId = methodId
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
    const referenceLineWalls: LineSegment2D[] = []
    for (let i = 1; i < this.state.points.length; i++) {
      const start = this.state.points[i - 1]
      const end = this.state.points[i]
      referenceLineWalls.push({ start, end })
    }

    this.state.snapContext = {
      snapPoints: this.state.points.slice(0, 1),
      alignPoints: this.state.points,
      referencePoint: this.state.points[this.state.points.length - 1],
      referenceLineWalls
    }
    this.triggerRender()
  }

  handlePointerDown(event: CanvasEvent): boolean {
    const stageCoords = event.stageCoordinates
    this.state.pointer = stageCoords
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

      // Activate length input after placing second point (first segment)
      if (this.state.points.length === 2) {
        this.activateLengthInput()
      } else if (this.state.points.length > 2) {
        // Update position for subsequent points
        this.updateLengthInputPosition()
      }
    }

    return true
  }

  handlePointerMove(event: CanvasEvent): boolean {
    const stageCoords = event.stageCoordinates
    this.state.pointer = stageCoords
    this.state.snapResult = this.snapService.findSnapResult(stageCoords, this.state.snapContext) ?? undefined

    // Update validation based on current pointer position
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

    // Set default methods from config store
    const configStore = useConfigStore.getState()
    this.state.baseRingBeamMethodId = configStore.getDefaultBaseRingBeamMethodId()
    this.state.topRingBeamMethodId = configStore.getDefaultTopRingBeamMethodId()
    this.state.constructionMethodId = configStore.getDefaultPerimeterMethodId()

    this.updateSnapContext()
  }

  onDeactivate(): void {
    this.state.points = []
    this.state.isCurrentLineValid = true
    this.state.isClosingLineValid = true
    this.updateSnapContext()

    // Deactivate length input when tool is deactivated
    deactivateLengthInput()
  }

  private completePolygon(event: CanvasEvent | null): void {
    if (this.state.points.length < 3) return

    // Only complete if closing wouldn't create intersections
    if (!this.state.isClosingLineValid) return

    // Create polygon and ensure clockwise order for perimeters
    let polygon: Polygon2D = { points: [...this.state.points] }

    // Check if polygon is clockwise, if not reverse it
    if (!polygonIsClockwise(polygon)) {
      polygon = { points: [...this.state.points].reverse() }
    }

    if (event) {
      const modelStore = event.context.getModelStore()
      const activeStoreyId = event.context.getActiveStoreyId()

      try {
        if (!this.state.constructionMethodId) {
          console.error('No construction method selected')
          return
        }

        modelStore.addPerimeter(
          activeStoreyId,
          polygon,
          this.state.constructionMethodId,
          this.state.wallThickness,
          this.state.baseRingBeamMethodId,
          this.state.topRingBeamMethodId
        )
      } catch (error) {
        console.error('Failed to create perimeter polygon:', error)
      }
    }

    this.state.points = []
    this.state.isCurrentLineValid = true
    this.state.isClosingLineValid = true
    this.updateSnapContext()

    // Deactivate length input when polygon is completed
    deactivateLengthInput()
  }

  private cancelPolygon(): void {
    this.state.points = []
    this.state.isCurrentLineValid = true
    this.state.isClosingLineValid = true
    this.updateSnapContext()

    // Deactivate length input when polygon is canceled
    deactivateLengthInput()
  }

  private updateValidation(): void {
    if (this.state.points.length === 0) {
      this.state.isCurrentLineValid = true
      this.state.isClosingLineValid = true
      return
    }

    const currentPos = this.state.snapResult?.position ?? this.state.pointer

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

  /**
   * Handle length input commit - update the last placed point to make the last segment the specified length
   */
  private handleLengthCommit = (length: Length): void => {
    if (this.state.points.length < 2) return

    const secondToLast = this.state.points[this.state.points.length - 2]
    const lastPoint = this.state.points[this.state.points.length - 1]
    const direction = normalize(subtract(lastPoint, secondToLast))
    const newLastPoint = add(secondToLast, scale(direction, length))

    // Update the last point
    this.state.points[this.state.points.length - 1] = newLastPoint

    // Update snap context with new point positions
    this.updateSnapContext()

    // Reactivate length input for the next segment (without context for now)
    this.activateLengthInput()

    this.triggerRender()
  }

  /**
   * Calculate position for the length input near the last placed point
   */
  private getLengthInputPosition(): LengthInputPosition {
    if (this.state.points.length < 2) {
      // Fallback to center if no points
      return { x: 400, y: 300 }
    }

    const lastPoint = this.state.points[this.state.points.length - 1]

    // Convert world coordinates to stage coordinates (screen pixels)
    const viewportActions = useViewportActions()
    const stageCoords = viewportActions.worldToStage(lastPoint)

    // Add offset to position input near the point
    let x = stageCoords.x + 20
    let y = stageCoords.y - 30

    // Keep input within canvas bounds (with some margin)
    const margin = 150 // Space for the input component
    const canvasWidth = 800 // TODO: Get actual canvas dimensions
    const canvasHeight = 600

    if (x < margin) x = margin
    if (x > canvasWidth - margin) x = canvasWidth - margin
    if (y < margin) y = margin
    if (y > canvasHeight - margin) y = canvasHeight - margin

    return { x, y }
  }

  /**
   * Activate length input for segment length override
   */
  private activateLengthInput(): void {
    if (this.state.points.length < 2) return

    activateLengthInput({
      position: this.getLengthInputPosition(),
      placeholder: 'Enter segment length...',
      onCommit: this.handleLengthCommit,
      onCancel: () => {
        // Reactivate for next attempt
        this.activateLengthInput()
      }
    })
  }

  /**
   * Update the position of the length input if it's currently active
   */
  private updateLengthInputPosition(): void {
    if (this.state.points.length < 2) return

    updateLengthInputPosition(this.getLengthInputPosition())
  }
}
