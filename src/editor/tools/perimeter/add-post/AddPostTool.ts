import type { PerimeterWallWithGeometry, WallPostType } from '@/building/model'
import {
  type EntityType,
  type PerimeterCornerId,
  type PerimeterWallId,
  type SelectableId,
  isPerimeterWallId
} from '@/building/model/ids'
import { getModelActions } from '@/building/store'
import { type MaterialId, roughWood, woodwool } from '@/construction/materials/material'
import { getSelectionActions } from '@/editor/hooks/useSelectionStore'
import { getViewModeActions } from '@/editor/hooks/useViewMode'
import { BaseTool } from '@/editor/tools/system/BaseTool'
import type { CursorStyle, EditorEvent, ToolImplementation } from '@/editor/tools/system/types'
import { findEditorEntityAt } from '@/editor/utils/editorHitTesting'
import { type Length, type Vec2, newVec2, projectVec2 } from '@/shared/geometry'

import { AddPostToolInspector } from './AddPostToolInspector'
import { AddPostToolOverlay } from './AddPostToolOverlay'

interface PerimeterWallHit {
  wallId: PerimeterWallId
  wall: PerimeterWallWithGeometry
}

interface AddPostToolState {
  // Tool configuration
  type: WallPostType
  width: Length // Default: 60mm
  thickness: Length // Default: 360mm
  replacesPosts: boolean
  material: MaterialId // Default: wood
  infillMaterial: MaterialId // Default: woodwool

  // Interactive state
  hoveredPerimeterWall?: PerimeterWallHit
  offset?: Length
  previewPosition?: Vec2
  canPlace: boolean
  snapDirection?: 'left' | 'right' // Direction the post was snapped from user's preferred position
}

// Default post configuration
const DEFAULT_POST_CONFIG = {
  type: 'center' as WallPostType,
  width: 60, // 6cm
  thickness: 360, // 36cm
  replacesPosts: true,
  material: roughWood.id,
  infillMaterial: woodwool.id
}

export class AddPostTool extends BaseTool implements ToolImplementation {
  readonly id = 'perimeter.add-post'
  readonly overlayComponent = AddPostToolOverlay
  readonly inspectorComponent = AddPostToolInspector

  public state: AddPostToolState = {
    type: DEFAULT_POST_CONFIG.type,
    width: DEFAULT_POST_CONFIG.width,
    thickness: DEFAULT_POST_CONFIG.thickness,
    replacesPosts: DEFAULT_POST_CONFIG.replacesPosts,
    material: DEFAULT_POST_CONFIG.material,
    infillMaterial: DEFAULT_POST_CONFIG.infillMaterial,
    canPlace: false
  }

  /**
   * Extract wall information from hit test result
   */
  private extractPerimeterWallFromHitResult(
    hitResult: { entityId: SelectableId; entityType: EntityType; parentIds: SelectableId[] } | null
  ): PerimeterWallHit | null {
    if (!hitResult) return null

    const { getPerimeterWallById, getPerimeterCornerById } = getModelActions()

    let wall: PerimeterWallWithGeometry | null = null
    let wallId: PerimeterWallId | null = null

    // Check if we hit a wall directly
    if (hitResult.entityType === 'perimeter-wall') {
      wallId = hitResult.entityId as PerimeterWallId
      wall = getPerimeterWallById(wallId)
    }

    // Check if we hit an opening or post
    if (hitResult.entityType === 'opening' || hitResult.entityType === 'wall-post') {
      const [, wId] = hitResult.parentIds

      if (isPerimeterWallId(wId)) {
        wallId = wId
        wall = getPerimeterWallById(wallId)
      }
    }

    // Check if we hit a corner - extract the constructing wall
    if (hitResult.entityType === 'perimeter-corner') {
      const cornerId = hitResult.entityId as PerimeterCornerId
      const corner = getPerimeterCornerById(cornerId)
      wallId = corner.constructedByWall === 'previous' ? corner.previousWallId : corner.nextWallId
      wall = getPerimeterWallById(wallId)
    }

    if (!wall || !wallId) {
      return null
    }

    return {
      wallId,
      wall
    }
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

  handlePointerMove(event: EditorEvent): boolean {
    const pointerPos = event.worldCoordinates

    // 1. Detect wall under cursor
    const hitResult = findEditorEntityAt(event.originalEvent)
    const perimeterWall = this.extractPerimeterWallFromHitResult(hitResult)

    if (!perimeterWall) {
      this.clearPreview()
      return true
    }

    // 2. Calculate preferred center position from pointer
    const preferredStartOffset = this.calculateCenterOffsetFromPointerPosition(pointerPos, perimeterWall.wall)

    // 3. Check if preferred position is valid and snap if needed
    const snappedOffset = getModelActions().findNearestValidWallPostPosition(
      perimeterWall.wallId,
      preferredStartOffset,
      this.state.width
    )

    const maxSnapDistance = Math.max(this.state.width, 200)
    if (snappedOffset !== null && Math.abs(snappedOffset - preferredStartOffset) <= maxSnapDistance) {
      // Determine snap direction
      const snapDirection: 'left' | 'right' | undefined =
        snappedOffset !== preferredStartOffset ? (snappedOffset > preferredStartOffset ? 'right' : 'left') : undefined
      this.updatePreview(snappedOffset, perimeterWall, true, snapDirection)
    } else {
      // Check if center is within valid bounds
      const halfWidth = this.state.width / 2
      if (preferredStartOffset < halfWidth || preferredStartOffset > perimeterWall.wall.wallLength - halfWidth) {
        this.clearPreview()
      } else {
        this.updatePreview(preferredStartOffset, perimeterWall, snappedOffset === preferredStartOffset)
      }
    }

    return true
  }

  handlePointerDown(_event: EditorEvent): boolean {
    if (!this.state.canPlace || !this.state.hoveredPerimeterWall || !this.state.offset) {
      return true
    }

    const { wallId } = this.state.hoveredPerimeterWall

    try {
      const post = getModelActions().addWallPost(wallId, {
        postType: this.state.type,
        centerOffsetFromWallStart: this.state.offset,
        width: this.state.width,
        thickness: this.state.thickness,
        replacesPosts: this.state.replacesPosts,
        material: this.state.material,
        infillMaterial: this.state.infillMaterial
      })

      const { clearSelection, pushSelection } = getSelectionActions()

      // Select the newly created post
      clearSelection()
      pushSelection(post.perimeterId)
      pushSelection(post.wallId)
      pushSelection(post.id)

      // Clear preview after successful placement
      this.clearPreview()
    } catch (error) {
      console.error('Failed to add post:', error)
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

  setPostType(type: WallPostType): void {
    this.state.type = type
    this.triggerRender()
  }

  setWidth(width: Length): void {
    this.state.width = width
    this.triggerRender()
  }

  setThickness(thickness: Length): void {
    this.state.thickness = thickness
    this.triggerRender()
  }

  setReplacesPosts(replacesPosts: boolean): void {
    this.state.replacesPosts = replacesPosts
    this.triggerRender()
  }

  setMaterial(material: MaterialId): void {
    this.state.material = material
    this.triggerRender()
  }

  setInfillMaterial(infillMaterial: MaterialId): void {
    this.state.infillMaterial = infillMaterial
    this.triggerRender()
  }

  public getCursor(): CursorStyle {
    return this.state.canPlace ? 'default' : 'not-allowed'
  }
}
