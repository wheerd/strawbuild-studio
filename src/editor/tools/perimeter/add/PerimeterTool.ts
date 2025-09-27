import { BorderAllIcon } from '@radix-ui/react-icons'

import type { PerimeterConstructionMethodId, RingBeamConstructionMethodId } from '@/building/model/ids'
import { getModelActions } from '@/building/store'
import { useConfigStore } from '@/construction/config/store'
import { viewportActions } from '@/editor/hooks/useViewportStore'
import { activateLengthInput, deactivateLengthInput } from '@/editor/services/length-input'
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
  lengthOverride: Length | null
}

export class PerimeterTool extends BaseTool implements Tool {
  readonly id = 'perimeter.add'
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
    constructionMethodId: '' as PerimeterConstructionMethodId, // Set on activation
    lengthOverride: null
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

  public setLengthOverride(length: Length | null): void {
    this.state.lengthOverride = length
    this.triggerRender()
  }

  public clearLengthOverride(): void {
    this.state.lengthOverride = null
    this.triggerRender()
  }

  public cancel(): void {
    this.cancelPolygon()
  }

  public complete(): void {
    if (this.state.points.length >= 3 && this.state.isClosingLineValid) {
      this.completePolygon()
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
          this.completePolygon()
        }
        return true
      }
    }

    // Only add point if the line is valid (doesn't create intersections)
    if (this.state.isCurrentLineValid) {
      // Calculate point position: use override if set, otherwise use snap/click position
      let pointToAdd = snapCoords
      if (this.state.lengthOverride && this.state.points.length > 0) {
        const lastPoint = this.state.points[this.state.points.length - 1]
        const direction = normalize(subtract(snapCoords, lastPoint))
        pointToAdd = add(lastPoint, scale(direction, this.state.lengthOverride))
      }

      this.state.points.push(pointToAdd)
      this.updateSnapContext()

      // Clear length override after placing point
      this.clearLengthOverride()

      // Update validation for new state
      this.updateValidation()

      // Activate length input after placing any point (ready for next segment)
      if (this.state.points.length >= 1) {
        this.activateLengthInputForNextSegment()
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

  handleKeyDown(event: KeyboardEvent): boolean {
    if (event.key === 'Escape') {
      // First try to clear length override if it exists
      if (this.state.lengthOverride) {
        this.clearLengthOverride()
        return true
      }
      // Otherwise handle polygon cancellation if we have points
      if (this.state.points.length > 0) {
        this.cancelPolygon()
        return true
      }
      return false // Bubble up to allow tool cancellation
    }

    if (event.key === 'Enter' && this.state.points.length >= 3) {
      this.completePolygon()
      return true
    }

    return false
  }

  /**
   * Get the preview position for the next point, considering length override
   */
  public getPreviewPosition(): Vec2 {
    const currentPos = this.state.snapResult?.position ?? this.state.pointer

    // If no length override or no points, return current position
    if (!this.state.lengthOverride || this.state.points.length === 0) {
      return currentPos
    }

    // Calculate position at override distance in direction of cursor
    const lastPoint = this.state.points[this.state.points.length - 1]
    const direction = normalize(subtract(currentPos, lastPoint))
    return add(lastPoint, scale(direction, this.state.lengthOverride))
  }

  onActivate(): void {
    this.state.points = []
    this.state.isCurrentLineValid = true
    this.state.isClosingLineValid = true
    this.state.lengthOverride = null

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
    this.state.lengthOverride = null
    this.updateSnapContext()

    // Deactivate length input when tool is deactivated
    deactivateLengthInput()
  }

  private completePolygon(): void {
    if (this.state.points.length < 3) return

    // Only complete if closing wouldn't create intersections
    if (!this.state.isClosingLineValid) return

    // Create polygon and ensure clockwise order for perimeters
    let polygon: Polygon2D = { points: [...this.state.points] }

    // Check if polygon is clockwise, if not reverse it
    if (!polygonIsClockwise(polygon)) {
      polygon = { points: [...this.state.points].reverse() }
    }

    const { addPerimeter, getActiveStorey } = getModelActions()

    const activeStoreyId = getActiveStorey()

    try {
      if (!this.state.constructionMethodId) {
        console.error('No construction method selected')
        return
      }

      addPerimeter(
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

    this.state.points = []
    this.state.isCurrentLineValid = true
    this.state.isClosingLineValid = true
    this.state.lengthOverride = null
    this.updateSnapContext()

    // Deactivate length input when polygon is completed
    deactivateLengthInput()
  }

  private cancelPolygon(): void {
    this.state.points = []
    this.state.isCurrentLineValid = true
    this.state.isClosingLineValid = true
    this.state.lengthOverride = null
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
   * Handle length input commit - set the length override for next point placement
   */
  private handleLengthOverrideCommit = (length: Length): void => {
    this.setLengthOverride(length)
  }

  /**
   * Calculate position for the length input near the last placed point
   */
  private getLengthInputPosition(): LengthInputPosition {
    if (this.state.points.length === 0) {
      // Fallback to center if no points
      return { x: 400, y: 300 }
    }

    const lastPoint = this.state.points[this.state.points.length - 1]

    // Convert world coordinates to stage coordinates (screen pixels)
    const { worldToStage } = viewportActions()
    const stageCoords = worldToStage(lastPoint)

    // Add offset to position input near the point
    return {
      x: stageCoords.x + 20,
      y: stageCoords.y - 30
    }
  }

  /**
   * Activate length input for next segment length override
   */
  private activateLengthInputForNextSegment(): void {
    if (this.state.points.length === 0) return

    activateLengthInput({
      position: this.getLengthInputPosition(),
      placeholder: 'Enter length...',
      onCommit: this.handleLengthOverrideCommit,
      onCancel: () => {
        this.clearLengthOverride()
      }
    })
  }
}
