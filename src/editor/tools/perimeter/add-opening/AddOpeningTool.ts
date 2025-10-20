import { vec2 } from 'gl-matrix'

import {
  type EntityType,
  type PerimeterId,
  type PerimeterWallId,
  type SelectableId,
  isPerimeterId,
  isPerimeterWallId
} from '@/building/model/ids'
import type { OpeningType, PerimeterWall } from '@/building/model/model'
import { getModelActions } from '@/building/store'
import { entityHitTestService } from '@/editor/canvas/services/EntityHitTestService'
import { getSelectionActions } from '@/editor/hooks/useSelectionStore'
import { getViewModeActions } from '@/editor/hooks/useViewMode'
import { BaseTool } from '@/editor/tools/system/BaseTool'
import type { CanvasEvent, CursorStyle, ToolImplementation } from '@/editor/tools/system/types'
import type { Length } from '@/shared/geometry'
import { lineFromSegment, projectPointOntoLine } from '@/shared/geometry'

import { AddOpeningToolInspector } from './AddOpeningToolInspector'
// import { OpeningInspector } from '@/building/components/inspectors/OpeningInspector' // TODO: Fix interface compatibility
import { AddOpeningToolOverlay } from './AddOpeningToolOverlay'

interface PerimeterWallHit {
  perimeterId: PerimeterId
  wallId: PerimeterWallId
  wall: PerimeterWall
}

interface AddOpeningToolState {
  // Tool configuration
  openingType: OpeningType
  width: Length
  height: Length
  sillHeight?: Length

  // Interactive state
  hoveredPerimeterWall?: PerimeterWallHit
  offset?: Length
  previewPosition?: vec2
  canPlace: boolean
  snapDirection?: 'left' | 'right' // Direction the opening was snapped from user's preferred position
}

// Default opening configurations
const DEFAULT_OPENING_CONFIG = {
  door: { width: 800, height: 2100, type: 'door' as const },
  window: {
    width: 1200,
    height: 1200,
    type: 'window' as const,
    sillHeight: 800
  },
  passage: { width: 1000, height: 2200, type: 'passage' as const }
}

export class AddOpeningTool extends BaseTool implements ToolImplementation {
  readonly id = 'perimeter.add-opening'
  readonly overlayComponent = AddOpeningToolOverlay
  readonly inspectorComponent = AddOpeningToolInspector

  public state: AddOpeningToolState = {
    openingType: 'door',
    width: DEFAULT_OPENING_CONFIG.door.width,
    height: DEFAULT_OPENING_CONFIG.door.height,
    canPlace: false
  }

  /**
   * Extract wall wall information from hit test result
   */
  private extractPerimeterWallFromHitResult(
    hitResult: { entityId: SelectableId; entityType: EntityType; parentIds: SelectableId[] } | null
  ): PerimeterWallHit | null {
    if (!hitResult) return null

    const { getPerimeterWallById } = getModelActions()

    // Check if we hit a wall wall directly
    if (hitResult.entityType === 'perimeter-wall') {
      const wallId = hitResult.entityId as PerimeterWallId
      // Parent should be the perimeter
      const perimeterId = hitResult.parentIds[0] as PerimeterId

      if (perimeterId && wallId) {
        const wall = getPerimeterWallById(perimeterId, wallId)
        if (wall) {
          return { perimeterId, wallId, wall }
        }
      }
    }

    // Check if we hit an opening
    if (hitResult.entityType === 'opening') {
      const [perimeterId, wallId] = hitResult.parentIds

      if (isPerimeterId(perimeterId) && isPerimeterWallId(wallId)) {
        const wall = getPerimeterWallById(perimeterId, wallId)
        if (wall) {
          return { perimeterId, wallId, wall }
        }
      }
    }

    return null
  }

  /**
   * Calculate center offset from pointer position projected onto wall
   */
  private calculateCenterOffsetFromPointerPosition(pointerPos: vec2, wall: PerimeterWall): Length {
    // Convert LineWall2D to Line2D for projection
    const line = lineFromSegment(wall.insideLine)
    if (!line) {
      throw new Error('Cannot create line from wall')
    }

    // Project pointer position onto wall's inside line
    const projectedPoint = projectPointOntoLine(pointerPos, line)

    // Calculate offset from wall start to CENTER of opening
    const startPoint = wall.insideLine.start
    const centerOffset = vec2.distance(startPoint, projectedPoint)

    // Rounded offset of opening start from the start of the wall wall
    const actualStartOffset = centerOffset - this.state.width / 2
    const roundedOffset = Math.round(actualStartOffset / 10) * 10

    return roundedOffset
  }

  /**
   * Convert offset to actual position on the wall
   */
  private offsetToPosition(offset: Length, wall: PerimeterWall): vec2 {
    const startPoint = wall.insideLine.start
    const direction = wall.direction

    return vec2.fromValues(startPoint[0] + direction[0] * offset, startPoint[1] + direction[1] * offset)
  }

  /**
   * Clear preview state
   */
  private clearPreview(): void {
    this.state.hoveredPerimeterWall = undefined
    this.state.previewPosition = undefined
    this.state.offset = undefined
    this.state.canPlace = false
    this.state.snapDirection = undefined
    this.triggerRender()
  }

  /**
   * Update preview state
   */
  private updatePreview(
    offset: Length,
    perimeterWall: PerimeterWallHit,
    canPlace = true,
    snapDirection?: 'left' | 'right'
  ): void {
    this.state.hoveredPerimeterWall = perimeterWall
    this.state.offset = offset
    this.state.previewPosition = this.offsetToPosition(offset, perimeterWall.wall)
    this.state.canPlace = canPlace
    this.state.snapDirection = snapDirection
    this.triggerRender()
  }

  // Event Handlers

  handlePointerMove(event: CanvasEvent): boolean {
    const pointerPos = event.stageCoordinates

    // 1. Detect wall wall under cursor
    if (!event.pointerCoordinates) {
      this.clearPreview()
      return true
    }

    const hitResult = entityHitTestService.findEntityAt(event.pointerCoordinates)
    const perimeterWall = this.extractPerimeterWallFromHitResult(hitResult)

    if (!perimeterWall) {
      this.clearPreview()
      return true
    }

    // 2. Calculate preferred center position from pointer
    const preferredStartOffset = this.calculateCenterOffsetFromPointerPosition(pointerPos, perimeterWall.wall)

    // 4. Check if preferred position is valid
    const snappedOffset = getModelActions().findNearestValidPerimeterWallOpeningPosition(
      perimeterWall.perimeterId,
      perimeterWall.wallId,
      preferredStartOffset,
      this.state.width
    )

    const maxSnapDistace = this.state.width * 0.4
    if (snappedOffset !== null && Math.abs(snappedOffset - preferredStartOffset) <= maxSnapDistace) {
      // Determine snap direction: if snapped offset is greater, opening was shifted right (snapped from left)
      const snapDirection: 'left' | 'right' | undefined =
        snappedOffset !== preferredStartOffset ? (snappedOffset > preferredStartOffset ? 'right' : 'left') : undefined
      this.updatePreview(snappedOffset, perimeterWall, true, snapDirection)
    } else {
      if (preferredStartOffset < 0 || preferredStartOffset > perimeterWall.wall.wallLength - this.state.width) {
        this.clearPreview()
      } else {
        this.updatePreview(preferredStartOffset, perimeterWall, snappedOffset === preferredStartOffset)
      }
    }

    return true
  }

  handlePointerDown(_event: CanvasEvent): boolean {
    if (!this.state.canPlace || !this.state.hoveredPerimeterWall || !this.state.offset) {
      return true
    }

    const { perimeterId, wallId } = this.state.hoveredPerimeterWall

    try {
      const openingId = getModelActions().addPerimeterWallOpening(perimeterId, wallId, {
        type: this.state.openingType,
        offsetFromStart: this.state.offset,
        width: this.state.width,
        height: this.state.height,
        sillHeight: this.state.sillHeight
      })

      const { clearSelection, pushSelection } = getSelectionActions()

      // Select the newly created opening
      clearSelection()
      pushSelection(perimeterId)
      pushSelection(wallId)
      pushSelection(openingId)

      // Clear preview after successful placement
      this.clearPreview()
    } catch (error) {
      console.error('Failed to add opening:', error)
    }

    return true
  }

  // Lifecycle Methods

  onActivate(): void {
    getViewModeActions().ensureMode('walls')
    // Reset state when tool is activated
    this.clearPreview()
  }

  onDeactivate(): void {
    // Clear preview when tool is deactivated
    this.clearPreview()
  }

  // Public Methods for Inspector

  setOpeningType(type: OpeningType): void {
    this.state.openingType = type

    // Apply default dimensions for the type
    const config = DEFAULT_OPENING_CONFIG[type]
    this.state.width = config.width
    this.state.height = config.height
    this.state.sillHeight = 'sillHeight' in config ? config.sillHeight : undefined

    this.triggerRender()
  }

  setWidth(width: Length): void {
    this.state.width = width
    this.triggerRender()
  }

  setHeight(height: Length): void {
    this.state.height = height
    this.triggerRender()
  }

  setSillHeight(sillHeight: Length | undefined): void {
    this.state.sillHeight = sillHeight
    this.triggerRender()
  }

  public getCursor(): CursorStyle {
    return this.state.canPlace ? 'default' : 'not-allowed'
  }
}
