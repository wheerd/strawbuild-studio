import type { OpeningType, PerimeterWallWithGeometry } from '@/building/model'
import {
  type EntityType,
  type OpeningAssemblyId,
  type PerimeterWallId,
  type SelectableId,
  isPerimeterWallId
} from '@/building/model/ids'
import { getModelActions } from '@/building/store'
import { getConfigActions } from '@/construction/config/store'
import { entityHitTestService } from '@/editor/canvas/services/EntityHitTestService'
import { getSelectionActions } from '@/editor/hooks/useSelectionStore'
import { getViewModeActions } from '@/editor/hooks/useViewMode'
import { BaseTool } from '@/editor/tools/system/BaseTool'
import type { CanvasEvent, CursorStyle, ToolImplementation } from '@/editor/tools/system/types'
import { type Length, type Vec2, newVec2, projectVec2 } from '@/shared/geometry'

import { AddOpeningToolInspector } from './AddOpeningToolInspector'
import { AddOpeningToolOverlay } from './AddOpeningToolOverlay'

interface PerimeterWallHit {
  wallId: PerimeterWallId
  wall: PerimeterWallWithGeometry
  wallOpeningPadding?: Length
}

interface AddOpeningToolState {
  // Tool configuration
  openingType: OpeningType
  width: Length // Stored as FINISHED dimensions
  height: Length // Stored as FINISHED dimensions
  sillHeight?: Length // Stored as FINISHED dimensions

  // Opening assembly and dimension mode
  openingAssemblyId?: OpeningAssemblyId // Optional override
  dimensionMode: 'fitting' | 'finished' // How user inputs dimensions

  // Interactive state
  hoveredPerimeterWall?: PerimeterWallHit
  offset?: Length
  previewPosition?: Vec2
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
    canPlace: false,
    dimensionMode: 'fitting', // Start in fitting mode (most common)
    openingAssemblyId: undefined // Use wall/global default
  }

  /**
   * Extract wall information and resolve opening assembly padding from hit test result
   */
  private extractPerimeterWallFromHitResult(
    hitResult: { entityId: SelectableId; entityType: EntityType; parentIds: SelectableId[] } | null
  ): PerimeterWallHit | null {
    if (!hitResult) return null

    const { getPerimeterWallById } = getModelActions()

    let wall: PerimeterWallWithGeometry | null = null
    let wallId: PerimeterWallId | null = null

    // Check if we hit a wall wall directly
    if (hitResult.entityType === 'perimeter-wall') {
      wallId = hitResult.entityId as PerimeterWallId
      wall = getPerimeterWallById(wallId)
    }

    // Check if we hit an opening
    if (hitResult.entityType === 'opening') {
      const [, wId] = hitResult.parentIds

      if (isPerimeterWallId(wId)) {
        wallId = wId
        wall = getPerimeterWallById(wallId)
      }
    }

    if (!wall || !wallId) {
      return null
    }

    // Resolve the opening assembly padding for this wall
    const configActions = getConfigActions()
    const wallAssembly = configActions.getWallAssemblyById(wall.wallAssemblyId)
    const openingAssembly = wallAssembly?.openingAssemblyId
      ? configActions.getOpeningAssemblyById(wallAssembly.openingAssemblyId)
      : null

    return {
      wallId,
      wall,
      wallOpeningPadding: openingAssembly?.padding
    }
  }

  /**
   * Check if conversion warning should be shown
   * Only relevant when:
   * 1. In fitting mode
   * 2. Using global default (no override)
   * 3. Wall has different padding than global default
   */
  public getNeedsConversion(): boolean {
    if (this.state.dimensionMode !== 'finished') {
      return false
    }

    if (this.state.openingAssemblyId !== undefined) {
      // Has explicit override, no conversion needed
      return false
    }

    if (this.state.hoveredPerimeterWall?.wallOpeningPadding == null) {
      return false
    }

    const configActions = getConfigActions()

    const defaultAssemblyId = configActions.getDefaultOpeningAssemblyId()
    const defaultAssembly = configActions.getOpeningAssemblyById(defaultAssemblyId)

    if (!defaultAssembly) {
      return false
    }

    return Math.abs(defaultAssembly.padding - this.state.hoveredPerimeterWall.wallOpeningPadding) > 0.1
  }

  /**
   * Calculate center offset from pointer position projected onto wall
   */
  private calculateCenterOffsetFromPointerPosition(pointerPos: Vec2, wall: PerimeterWallWithGeometry): Length {
    const centerOffset = projectVec2(wall.insideLine.start, pointerPos, wall.direction)
    return Math.round(centerOffset / 10) * 10 // Round center offset to 10mm increments
  }

  /**
   * Convert offset to actual position on the wall
   */
  private offsetToPosition(offset: Length, wall: PerimeterWallWithGeometry): Vec2 {
    const startPoint = wall.insideLine.start
    const direction = wall.direction

    return newVec2(startPoint[0] + direction[0] * offset, startPoint[1] + direction[1] * offset)
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
    const snappedOffset = getModelActions().findNearestValidWallOpeningPosition(
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
      // Check if center is within valid bounds (at least halfWidth from each end)
      const halfWidth = this.state.width / 2
      if (preferredStartOffset < halfWidth || preferredStartOffset > perimeterWall.wall.wallLength - halfWidth) {
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

    const { wallId, wallOpeningPadding } = this.state.hoveredPerimeterWall

    // Stored dimensions are in finished coordinates
    let finalWidth = this.state.width
    let finalHeight = this.state.height
    let finalSillHeight = this.state.sillHeight

    // Apply conversion if needed:
    // - In finished mode
    // - Using global default (no explicit override)
    // - Wall has different padding
    if (this.getNeedsConversion()) {
      const configActions = getConfigActions()

      const defaultAssemblyId = configActions.getDefaultOpeningAssemblyId()
      const defaultAssembly = configActions.getOpeningAssemblyById(defaultAssemblyId)

      if (defaultAssembly && wallOpeningPadding) {
        // Current dimensions are fitting for default assembly padding
        // Convert to finished, then back to fitting for wallPadding
        const fittingWidth = finalWidth - 2 * defaultAssembly.padding
        const fittingHeight = finalHeight - 2 * defaultAssembly.padding
        const fittingSillHeight = finalSillHeight ? finalSillHeight + defaultAssembly.padding : undefined

        // Now convert back to fitting using wall padding
        finalWidth = Math.max(10, fittingWidth + 2 * wallOpeningPadding)
        finalHeight = Math.max(10, fittingHeight + 2 * wallOpeningPadding)
        finalSillHeight = fittingSillHeight !== undefined ? fittingSillHeight - wallOpeningPadding : undefined
      }
    }

    try {
      const opening = getModelActions().addWallOpening(wallId, {
        openingType: this.state.openingType,
        centerOffsetFromWallStart: this.state.offset,
        width: finalWidth,
        height: finalHeight,
        sillHeight: finalSillHeight,
        openingAssemblyId: this.state.openingAssemblyId
      })

      const { clearSelection, pushSelection } = getSelectionActions()

      // Select the newly created opening
      clearSelection()
      pushSelection(opening.perimeterId)
      pushSelection(opening.wallId)
      pushSelection(opening.id)

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

  setDimensionMode(mode: 'fitting' | 'finished'): void {
    this.state.dimensionMode = mode
    this.triggerRender()
  }

  setOpeningAssemblyId(id: OpeningAssemblyId | undefined): void {
    this.state.openingAssemblyId = id
    this.triggerRender()
  }

  public getCursor(): CursorStyle {
    return this.state.canPlace ? 'default' : 'not-allowed'
  }
}
