import type { Tool, CanvasEvent, ToolContext } from '@/components/FloorPlanEditor/Tools/ToolSystem/types'
import { BaseTool } from '@/components/FloorPlanEditor/Tools/ToolSystem/BaseTool'
import type { Vec2, Length } from '@/types/geometry'
import { createLength, createVec2, distance, projectPointOntoLine, lineFromSegment } from '@/types/geometry'
import type { OpeningType, PerimeterWall } from '@/types/model'
import {
  type PerimeterId,
  type PerimeterWallId,
  type SelectableId,
  type EntityType,
  isPerimeterId,
  isPerimeterWallId
} from '@/types/ids'
import { AddOpeningToolInspector } from '@/components/FloorPlanEditor/Tools/PropertiesPanel/ToolInspectors/AddOpeningToolInspector'
import { AddOpeningToolOverlay } from './AddOpeningToolOverlay'
import { round } from '@turf/helpers'
import { BoxIcon } from '@radix-ui/react-icons'

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
  readonly category = 'walls'
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
    hitResult: { entityId: SelectableId; entityType: EntityType; parentIds: SelectableId[] } | null,
    context: ToolContext
  ): PerimeterWallHit | null {
    if (!hitResult) return null

    // Check if we hit a wall wall directly
    if (hitResult.entityType === 'perimeter-wall') {
      const wallId = hitResult.entityId as PerimeterWallId
      // Parent should be the perimeter
      const perimeterId = hitResult.parentIds[0] as PerimeterId

      if (perimeterId && wallId) {
        const modelStore = context.getModelStore()
        const wall = modelStore.getPerimeterWallById(perimeterId, wallId)
        if (wall) {
          return { perimeterId, wallId, wall }
        }
      }
    }

    // Check if we hit an opening
    if (hitResult.entityType === 'opening') {
      const [perimeterId, wallId] = hitResult.parentIds

      if (isPerimeterId(perimeterId) && isPerimeterWallId(wallId)) {
        const modelStore = context.getModelStore()
        const wall = modelStore.getPerimeterWallById(perimeterId, wallId)
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
  private calculateCenterOffsetFromPointerPosition(pointerPos: Vec2, wall: PerimeterWall): Length {
    // Convert LineWall2D to Line2D for projection
    const line = lineFromSegment(wall.insideLine)
    if (!line) {
      throw new Error('Cannot create line from wall')
    }

    // Project pointer position onto wall's inside line
    const projectedPoint = projectPointOntoLine(pointerPos, line)

    // Calculate offset from wall start to CENTER of opening
    const startPoint = wall.insideLine.start
    const centerOffset = createLength(distance(startPoint, projectedPoint))

    // Rounded offset of opening start from the start of the wall wall
    const actualStartOffset = centerOffset - this.state.width / 2
    const roundedOffset = round(actualStartOffset / 10) * 10

    return roundedOffset as Length
  }

  /**
   * Convert offset to actual position on the wall
   */
  private offsetToPosition(offset: Length, wall: PerimeterWall): Vec2 {
    const startPoint = wall.insideLine.start
    const direction = wall.direction

    return createVec2(startPoint[0] + direction[0] * offset, startPoint[1] + direction[1] * offset)
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
    const hitResult = event.context.findEntityAt(event.pointerCoordinates!)
    const perimeterWall = this.extractPerimeterWallFromHitResult(hitResult, event.context)

    if (!perimeterWall) {
      this.clearPreview()
      return true
    }

    // 2. Calculate preferred center position from pointer
    const preferredStartOffset = this.calculateCenterOffsetFromPointerPosition(pointerPos, perimeterWall.wall)

    // 4. Check if preferred position is valid
    const modelStore = event.context.getModelStore()

    // Try to find a nearby valid position
    const snappedOffset = modelStore.findNearestValidPerimeterWallOpeningPosition(
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

  handlePointerDown(event: CanvasEvent): boolean {
    if (!this.state.canPlace || !this.state.hoveredPerimeterWall || !this.state.offset) {
      return true
    }

    const { perimeterId, wallId } = this.state.hoveredPerimeterWall

    try {
      const modelStore = event.context.getModelStore()
      const openingId = modelStore.addPerimeterWallOpening(perimeterId, wallId, {
        type: this.state.openingType,
        offsetFromStart: this.state.offset,
        width: this.state.width,
        height: this.state.height,
        sillHeight: this.state.sillHeight
      })

      // Select the newly created opening
      event.context.clearSelection()
      event.context.selectEntity(perimeterId)
      event.context.selectSubEntity(wallId)
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
