import type { Tool, CanvasEvent, ToolContext, ToolInspectorProps } from '../../ToolSystem/types'
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
import React from 'react'
import { Group, Rect, Line, Text } from 'react-konva'
import { AddOpeningToolInspector } from '../../PropertiesPanel/ToolInspectors/AddOpeningToolInspector'

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

export class AddOpeningTool implements Tool {
  readonly id = 'add-opening'
  readonly name = 'Add Opening'
  readonly icon = '🚪'
  readonly hotkey = 'o'
  readonly cursor = 'crosshair'
  readonly category = 'outer-walls'
  readonly hasInspector = true
  readonly inspectorComponent = AddOpeningToolInspector as React.ComponentType<ToolInspectorProps<any>>

  public state: AddOpeningToolState = {
    openingType: 'door',
    width: DEFAULT_OPENING_CONFIG.door.width,
    height: DEFAULT_OPENING_CONFIG.door.height,
    canPlace: false
  }

  private listeners: (() => void)[] = []

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

    const actualStartOffset = centerOffset - this.state.width / 2

    return actualStartOffset as Length
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
    this.triggerRender()
  }

  /**
   * Update preview state
   */
  private updatePreview(offset: Length, wallSegment: WallSegmentHit, canPlace: boolean = true): void {
    this.state.hoveredWallSegment = wallSegment
    this.state.offset = offset
    this.state.previewPosition = this.offsetToPosition(offset, wallSegment.segment)
    this.state.canPlace = canPlace
    this.triggerRender()
  }

  /**
   * Trigger re-render for overlay updates
   */
  private triggerRender(): void {
    this.listeners.forEach(listener => listener())
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
      this.updatePreview(snappedOffset, wallSegment)
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

  // Rendering

  private getOpeningIcon(): string {
    switch (this.state.openingType) {
      case 'door':
        return '🚪'
      case 'window':
        return '🪟'
      case 'passage':
        return '⬜'
      default:
        return '⬜'
    }
  }

  private renderOpeningPreview(): React.ReactNode {
    if (!this.state.hoveredWallSegment || !this.state.previewPosition) return null

    const segment = this.state.hoveredWallSegment.segment
    const wallDirection = segment.direction
    const wallAngle = (Math.atan2(wallDirection[1], wallDirection[0]) * 180) / Math.PI

    return React.createElement(
      Group,
      {
        key: 'opening-preview',
        x: this.state.previewPosition[0],
        y: this.state.previewPosition[1],
        rotation: wallAngle,
        listening: false
      },
      [
        React.createElement(Rect, {
          key: 'opening-rect',
          x: 0,
          y: 0,
          width: this.state.width,
          height: segment.thickness,
          fill: this.state.canPlace ? '#22c55e' : '#ef4444',
          opacity: 0.6,
          stroke: '#ffffff',
          strokeWidth: 3
        }),
        React.createElement(Text, {
          key: 'opening-icon',
          text: this.getOpeningIcon(),
          fontSize: segment.thickness * 0.7,
          x: 0,
          y: 0,
          width: this.state.width,
          height: segment.thickness,
          align: 'center',
          verticalAlign: 'middle',
          fill: '#ffffff',
          fontFamily: 'Arial'
        })
      ]
    )
  }

  private renderWallHighlight(): React.ReactNode {
    if (!this.state.hoveredWallSegment) return null

    const segment = this.state.hoveredWallSegment.segment
    const line = segment.insideLine

    return React.createElement(Line, {
      key: 'wall-highlight',
      points: [line.start[0], line.start[1], line.end[0], line.end[1]],
      stroke: '#3b82f6',
      strokeWidth: 15,
      opacity: 0.3,
      listening: false
    })
  }

  renderOverlay(): React.ReactNode {
    const elements: React.ReactNode[] = []

    const wallHighlight = this.renderWallHighlight()
    if (wallHighlight) elements.push(wallHighlight)

    const openingPreview = this.renderOpeningPreview()
    if (openingPreview) elements.push(openingPreview)

    return React.createElement(React.Fragment, null, ...elements)
  }

  onRenderNeeded(listener: () => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }
}
