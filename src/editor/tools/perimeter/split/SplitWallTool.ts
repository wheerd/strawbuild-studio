import type { Perimeter, PerimeterWall } from '@/building/model'
import type { PerimeterId, PerimeterWallId } from '@/building/model/ids'
import { isPerimeterId, isPerimeterWallId } from '@/building/model/ids'
import { getModelActions } from '@/building/store'
import { entityHitTestService } from '@/editor/canvas/services/EntityHitTestService'
import { getCurrentSelection, getSelectionActions, getSelectionPath } from '@/editor/hooks/useSelectionStore'
import { getViewModeActions } from '@/editor/hooks/useViewMode'
import { getToolActions } from '@/editor/tools/system'
import { BaseTool } from '@/editor/tools/system/BaseTool'
import type { CanvasEvent, ToolImplementation } from '@/editor/tools/system/types'
import { type Length, type Vec2, distanceToLineSegment, dotVec2, subVec2 } from '@/shared/geometry'

import { SplitWallToolInspector } from './SplitWallToolInspector'
import { SplitWallToolOverlay } from './SplitWallToolOverlay'

export interface SplitWallToolState {
  // Target wall
  selectedWallId: PerimeterWallId | null
  selectedPerimeterId: PerimeterId | null
  wall: PerimeterWall | null
  perimeter: Perimeter | null

  // Split positioning
  hoverPosition: Length | null // Current hover position on wall
  targetPosition: Length | null // Clicked/manual target position

  // Validation & feedback
  isValidHover: boolean
  isValidSplit: boolean
  splitError: SplitError | null
}

type SplitError = 'noWall' | 'outOfBounds' | 'intersectsOpening'

export class SplitWallTool extends BaseTool implements ToolImplementation {
  readonly id = 'perimeter.split-wall' as const
  readonly overlayComponent = SplitWallToolOverlay
  readonly inspectorComponent = SplitWallToolInspector

  public state: SplitWallToolState = {
    selectedWallId: null,
    wall: null,
    selectedPerimeterId: null,
    perimeter: null,

    hoverPosition: null,
    targetPosition: null,

    isValidHover: false,
    isValidSplit: false,
    splitError: null
  }

  public setTargetWall(perimeterId: PerimeterId, wallId: PerimeterWallId): void {
    const { getPerimeterById } = getModelActions()
    this.state.selectedPerimeterId = perimeterId
    this.state.selectedWallId = wallId
    this.state.perimeter = getPerimeterById(perimeterId)

    if (this.state.perimeter) {
      this.state.wall = this.state.perimeter.walls.find(w => w.id === wallId) ?? null
    }

    if (this.state.wall) {
      const middlePosition = this.state.wall.wallLength / 2
      this.updateTargetPosition(middlePosition)
    }

    this.triggerRender()
  }

  public updateHoverPosition(position: Length | null): void {
    this.state.hoverPosition = position
    if (position) {
      const validation = this.validateSplitPosition(position)
      this.state.isValidHover = validation.valid
    } else {
      this.state.isValidHover = false
    }
    this.triggerRender()
  }

  public updateTargetPosition(position: Length | null): void {
    this.state.targetPosition = position
    if (position !== null) {
      const validation = this.validateSplitPosition(position)
      this.state.isValidSplit = validation.valid
      this.state.splitError = validation.error ?? null
    } else {
      this.state.isValidSplit = false
      this.state.splitError = null
    }
    this.triggerRender()
  }

  public commitSplit(): boolean {
    if (
      !this.state.isValidSplit ||
      !this.state.selectedPerimeterId ||
      !this.state.selectedWallId ||
      !this.state.targetPosition
    ) {
      return false
    }

    const { splitPerimeterWall } = getModelActions()
    const newWallId = splitPerimeterWall(
      this.state.selectedPerimeterId,
      this.state.selectedWallId,
      this.state.targetPosition
    )

    if (newWallId) {
      // Clear selection and deactivate tool
      const { clearSelection } = getSelectionActions()
      clearSelection()
      getToolActions().popTool()
      return true
    }

    return false
  }

  public moveDelta(delta: Length): void {
    if (!this.state.wall) return

    const currentPosition = this.state.targetPosition ?? 0
    const newPosition = currentPosition + delta
    const clampedPosition = Math.max(0, Math.min(newPosition, this.state.wall.wallLength))

    this.updateTargetPosition(clampedPosition)
  }

  private validateSplitPosition(position: Length): {
    valid: boolean
    error?: SplitError
  } {
    if (!this.state.wall) return { valid: false, error: 'noWall' }
    const wall = this.state.wall

    // Check bounds
    if (position <= 0 || position >= wall.wallLength) {
      return { valid: false, error: 'outOfBounds' }
    }

    // Check opening intersections
    for (const opening of wall.openings) {
      // Calculate left and right edges from center position
      const openingStart = opening.centerOffsetFromWallStart - opening.width / 2
      const openingEnd = opening.centerOffsetFromWallStart + opening.width / 2

      if (position > openingStart && position < openingEnd) {
        return { valid: false, error: `intersectsOpening` }
      }
    }

    return { valid: true }
  }

  private positionFromWorldPoint(wall: PerimeterWall, worldPoint: Vec2): Length | null {
    const insideDist = distanceToLineSegment(worldPoint, wall.insideLine)
    const outsideDist = distanceToLineSegment(worldPoint, wall.outsideLine)
    if (Math.max(insideDist, outsideDist) <= wall.thickness) {
      // Get signed distance along wall direction
      const referenceSide = this.state.perimeter?.referenceSide ?? 'inside'
      const baselineStart = referenceSide === 'outside' ? wall.outsideLine.start : wall.insideLine.start
      const toPoint = subVec2(worldPoint, baselineStart)
      const signedDistance = dotVec2(toPoint, wall.direction)

      // Clamp to wall bounds
      const clampedDistance = Math.max(0, Math.min(signedDistance, wall.wallLength))
      return clampedDistance
    }
    return null
  }

  public cancel(): void {
    getToolActions().popTool()
  }

  handlePointerDown(event: CanvasEvent): boolean {
    // If no wall selected, try to select one
    if (!this.state.selectedWallId && event.pointerCoordinates) {
      const hitResult = entityHitTestService.findEntityAt(event.pointerCoordinates)
      const wallId = hitResult?.entityId
      if (wallId && isPerimeterWallId(wallId)) {
        // Find perimeter ID from parent chain
        const perimeterId = hitResult.parentIds[0]
        if (isPerimeterId(perimeterId)) {
          this.setTargetWall(perimeterId, wallId)
          if (this.state.wall) {
            const position = this.positionFromWorldPoint(this.state.wall, event.stageCoordinates)
            this.updateTargetPosition(position)
          }
        }
      }
      return true
    }

    if (this.state.wall) {
      const position = this.positionFromWorldPoint(this.state.wall, event.stageCoordinates)
      if (position !== null) {
        this.updateTargetPosition(position)
        return true
      }
    }

    return false
  }

  handlePointerMove(event: CanvasEvent): boolean {
    if (!this.state.selectedWallId) return false

    if (this.state.wall) {
      const position = this.positionFromWorldPoint(this.state.wall, event.stageCoordinates)
      this.updateHoverPosition(position)
    }

    return false
  }

  handleKeyDown(event: KeyboardEvent): boolean {
    if (event.key === 'Enter' && this.state.isValidSplit) {
      this.commitSplit()
      return true
    }

    if (event.key === 'Escape') {
      if (this.state.targetPosition !== null) {
        this.updateTargetPosition(null)
        return true
      }
    }

    return false
  }

  private resetState() {
    this.state.selectedWallId = null
    this.state.selectedPerimeterId = null
    this.state.hoverPosition = null
    this.state.targetPosition = null
    this.state.isValidSplit = false
    this.state.isValidHover = false
    this.state.splitError = null
    this.triggerRender()
  }

  onActivate(): void {
    getViewModeActions().ensureMode('walls')
    // Initialize state
    this.resetState()

    // Check if there's already a wall selected using selection path
    const currentSelection = getCurrentSelection()
    if (currentSelection && isPerimeterWallId(currentSelection)) {
      const selectionPath = getSelectionPath()

      // Find the perimeter ID in the selection path
      const perimeterId = selectionPath[0]

      if (isPerimeterId(perimeterId)) {
        this.setTargetWall(perimeterId, currentSelection)
      }
    }

    this.triggerRender()
  }

  onDeactivate(): void {
    this.resetState()
  }
}
