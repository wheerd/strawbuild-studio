import type { Tool, CanvasEvent, ToolContext } from '@/components/FloorPlanEditor/Tools/ToolSystem/types'
import { BaseTool } from '@/components/FloorPlanEditor/Tools/ToolSystem/BaseTool'
import type { Vec2, Length } from '@/types/geometry'
import { createLength, createVec2, distance, projectPointOntoLine, lineFromSegment } from '@/types/geometry'
import type { OpeningType, OuterWallSegment } from '@/types/model'
import {
  type OuterWallId,
  type WallSegmentId,
  type SelectableId,
  type EntityType,
  isOuterWallId,
  isWallSegmentId
} from '@/types/ids'
import { AddOpeningToolInspector } from '@/components/FloorPlanEditor/Tools/PropertiesPanel/ToolInspectors/AddOpeningToolInspector'
import { AddOpeningToolOverlay } from './AddOpeningToolOverlay'
import { round } from '@turf/helpers'
import { BoxIcon } from '@radix-ui/react-icons'

interface WallSegmentHit {
  wallId: OuterWallId
  segmentId: WallSegmentId
  segment: OuterWallSegment
}

interface AddOpeningToolState {
  // Tool configuration
  openingType: OpeningType
  width: Length
  height: Length
  sillHeight?: Length

  // Interactive state
  hoveredWallSegment?: WallSegmentHit
  offset?: Length
  previewPosition?: Vec2
  canPlace: boolean
  snapDirection?: 'left' | 'right' // Direction the opening was snapped from user's preferred position
}

// Default opening configurations
const DEFAULT_OPENING_CONFIG = {
  door: { width: createLength(800), height: createLength(2100), type: 'door' as const },
  window: {
    width: createLength(1200),
    height: createLength(1200),
    type: 'window' as const,
    sillHeight: createLength(800)
  },
  passage: { width: createLength(1000), height: createLength(2200), type: 'passage' as const }
}

export class AddOpeningTool extends BaseTool implements Tool {
  readonly id = 'add-opening'
  readonly name = 'Add Opening'
  readonly icon = '🚪'
  readonly iconComponent = BoxIcon
  readonly hotkey = 'o'
  readonly cursor = 'crosshair'
  readonly category = 'outer-walls'
  readonly overlayComponent = AddOpeningToolOverlay
  readonly inspectorComponent = AddOpeningToolInspector

  public state: AddOpeningToolState = {
    openingType: 'door',
    width: DEFAULT_OPENING_CONFIG.door.width,
    height: DEFAULT_OPENING_CONFIG.door.height,
    canPlace: false
  }

  /**
   * Extract wall segment information from hit test result
   */
  private extractWallSegmentFromHitResult(
    hitResult: { entityId: SelectableId; entityType: EntityType; parentIds: SelectableId[] } | null,
    context: ToolContext
  ): WallSegmentHit | null {
    if (!hitResult) return null

    // Check if we hit a wall segment directly
    if (hitResult.entityType === 'wall-segment') {
      const segmentId = hitResult.entityId as WallSegmentId
      // Parent should be the outer wall
      const wallId = hitResult.parentIds[0] as OuterWallId

      if (wallId && segmentId) {
        const modelStore = context.getModelStore()
        const segment = modelStore.getSegmentById(wallId, segmentId)
        if (segment) {
          return { wallId, segmentId, segment }
        }
      }
    }

    // Check if we hit an opening
    if (hitResult.entityType === 'opening') {
      const [wallId, segmentId] = hitResult.parentIds

      if (isOuterWallId(wallId) && isWallSegmentId(segmentId)) {
        const modelStore = context.getModelStore()
        const segment = modelStore.getSegmentById(wallId, segmentId)
        if (segment) {
          return { wallId, segmentId, segment }
        }
      }
    }

    return null
  }

  /**
   * Calculate center offset from mouse position projected onto wall
   */
  private calculateCenterOffsetFromMousePosition(mousePos: Vec2, segment: OuterWallSegment): Length {
    // Convert LineSegment2D to Line2D for projection
    const line = lineFromSegment(segment.insideLine)
    if (!line) {
      throw new Error('Cannot create line from segment')
    }

    // Project mouse position onto wall's inside line
    const projectedPoint = projectPointOntoLine(mousePos, line)

    // Calculate offset from segment start to CENTER of opening
    const startPoint = segment.insideLine.start
    const centerOffset = createLength(distance(startPoint, projectedPoint))

    // Rounded offset of opening start from the start of the wall segment
    const actualStartOffset = centerOffset - this.state.width / 2
    const roundedOffset = round(actualStartOffset / 10) * 10

    return roundedOffset as Length
  }

  /**
   * Convert offset to actual position on the wall
   */
  private offsetToPosition(offset: Length, segment: OuterWallSegment): Vec2 {
    const startPoint = segment.insideLine.start
    const direction = segment.direction

    return createVec2(startPoint[0] + direction[0] * offset, startPoint[1] + direction[1] * offset)
  }

  /**
   * Clear preview state
   */
  private clearPreview(): void {
    this.state.hoveredWallSegment = undefined
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
    wallSegment: WallSegmentHit,
    canPlace: boolean = true,
    snapDirection?: 'left' | 'right'
  ): void {
    this.state.hoveredWallSegment = wallSegment
    this.state.offset = offset
    this.state.previewPosition = this.offsetToPosition(offset, wallSegment.segment)
    this.state.canPlace = canPlace
    this.state.snapDirection = snapDirection
    this.triggerRender()
  }

  // Event Handlers

  handleMouseMove(event: CanvasEvent): boolean {
    const mousePos = event.stageCoordinates

    // 1. Detect wall segment under cursor
    const hitResult = event.context.findEntityAt(event.pointerCoordinates!)
    const wallSegment = this.extractWallSegmentFromHitResult(hitResult, event.context)

    if (!wallSegment) {
      this.clearPreview()
      return true
    }

    // 2. Calculate preferred center position from mouse
    const preferredStartOffset = this.calculateCenterOffsetFromMousePosition(mousePos, wallSegment.segment)

    // 4. Check if preferred position is valid
    const modelStore = event.context.getModelStore()

    // Try to find a nearby valid position
    const snappedOffset = modelStore.findNearestValidOpeningPosition(
      wallSegment.wallId,
      wallSegment.segmentId,
      preferredStartOffset,
      this.state.width
    )

    const maxSnapDistace = this.state.width * 0.4
    if (snappedOffset !== null && Math.abs(snappedOffset - preferredStartOffset) <= maxSnapDistace) {
      // Determine snap direction: if snapped offset is greater, opening was shifted right (snapped from left)
      const snapDirection: 'left' | 'right' | undefined =
        snappedOffset !== preferredStartOffset ? (snappedOffset > preferredStartOffset ? 'right' : 'left') : undefined
      this.updatePreview(snappedOffset, wallSegment, true, snapDirection)
    } else {
      if (preferredStartOffset < 0 || preferredStartOffset > wallSegment.segment.segmentLength - this.state.width) {
        this.clearPreview()
      } else {
        this.updatePreview(preferredStartOffset, wallSegment, snappedOffset === preferredStartOffset)
      }
    }

    return true
  }

  handleMouseDown(event: CanvasEvent): boolean {
    if (!this.state.canPlace || !this.state.hoveredWallSegment || !this.state.offset) {
      return true
    }

    const { wallId, segmentId } = this.state.hoveredWallSegment

    try {
      const modelStore = event.context.getModelStore()
      const openingId = modelStore.addOpeningToOuterWall(wallId, segmentId, {
        type: this.state.openingType,
        offsetFromStart: this.state.offset,
        width: this.state.width,
        height: this.state.height,
        sillHeight: this.state.sillHeight
      })

      // Select the newly created opening
      event.context.clearSelection()
      event.context.selectEntity(wallId)
      event.context.selectSubEntity(segmentId)
      event.context.selectSubEntity(openingId)

      // Clear preview after successful placement
      this.clearPreview()
    } catch (error) {
      console.error('Failed to add opening:', error)
    }

    return true
  }

  // Lifecycle Methods

  onActivate(): void {
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
}
