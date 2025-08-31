import type { Tool, ContextAction, CanvasEvent, ToolOverlayContext } from '../../ToolSystem/types'
import type { Point2D } from '@/types/geometry'
import { distanceSquared } from '@/types/geometry'
import React from 'react'
import { Line, Circle, Text } from 'react-konva'
import type { StoreActions, FloorId, PointId } from '@/model'
import { getWallPreviewVisualization } from '@/components/FloorPlanEditor/visualization/wallVisualization'
import type { WallType } from '@/types/model'

export interface WallToolState {
  startPoint?: Point2D
  thickness: number // mm
  previewEndPoint?: Point2D // Tool handles its own preview
}

export interface WallTypeConfig {
  id: string
  name: string
  icon: string
  hotkey?: string
  defaultThickness: number // mm
  primaryColor: string // Color for main preview elements
  secondaryColor: string // Color for thickness indicators
  label: string // Label to show in length text (e.g., "Structural", "Partition")
}

export abstract class BaseWallTool implements Tool {
  // Tool metadata from config
  readonly id: string
  readonly name: string
  readonly icon: string
  readonly hotkey?: string

  // Common tool properties
  readonly cursor = 'crosshair'
  readonly category = 'walls'
  readonly hasInspector = true

  public state: WallToolState
  protected config: WallTypeConfig

  constructor(config: WallTypeConfig) {
    this.config = config
    this.id = config.id
    this.name = config.name
    this.icon = config.icon
    this.hotkey = config.hotkey

    this.state = {
      thickness: config.defaultThickness
    }
  }

  // Abstract methods - must be implemented by concrete classes
  protected abstract createWall(
    modelStore: StoreActions,
    activeFloorId: FloorId,
    startPointId: PointId,
    endPointId: PointId,
    thickness: number
  ): void

  // Event handlers (common implementation)
  handleMouseDown(event: CanvasEvent): boolean {
    const stageCoords = event.stageCoordinates
    const snapResult = event.context.findSnapPoint(stageCoords)
    const snapCoords = snapResult?.position ?? stageCoords

    if (!this.state.startPoint) {
      // Start drawing wall
      this.state.startPoint = snapCoords
      // Clear any previous preview state to avoid artifacts
      this.state.previewEndPoint = undefined
      event.context.updateSnapReference(snapCoords, snapResult?.pointId ?? null)
      return true
    } else if (this.state.startPoint) {
      // Finish drawing wall
      const wallLength = distanceSquared(this.state.startPoint, snapCoords)

      if (wallLength >= 50 ** 2) {
        // Minimum 50mm wall length - create wall using model store
        const modelStore = event.context.getModelStore()
        const activeFloorId = event.context.getActiveFloorId()

        // Get or create points
        const startPointEntity = modelStore.addPoint(activeFloorId, this.state.startPoint)
        const endPointEntity = modelStore.addPoint(activeFloorId, snapCoords)

        // Create wall using abstract method
        this.createWall(modelStore, activeFloorId, startPointEntity.id, endPointEntity.id, this.state.thickness)
      } else {
        // TODO: Handle minimum wall length validation
      }

      // Reset state
      this.state.startPoint = undefined
      this.state.previewEndPoint = undefined
      event.context.clearSnapState()
      return true
    }

    return false
  }

  handleMouseMove(event: CanvasEvent): boolean {
    const stageCoords = event.stageCoordinates
    const snapResult = event.context.findSnapPoint(stageCoords)
    const snapCoords = snapResult?.position ?? stageCoords

    if (this.state.startPoint) {
      // Update preview end point during drawing
      this.state.previewEndPoint = snapCoords
      return true
    } else {
      // Update snap target for visual feedback
      event.context.updateSnapTarget(snapCoords)
      return true
    }
  }

  handleKeyDown(event: CanvasEvent): boolean {
    const keyEvent = event.originalEvent as KeyboardEvent
    if (keyEvent.key === 'Escape' && this.state.startPoint) {
      this.cancelDrawing()
      return true
    }

    return false
  }

  // Lifecycle methods
  onActivate(): void {
    this.state.startPoint = undefined
    this.state.previewEndPoint = undefined
  }

  onDeactivate(): void {
    if (this.state.startPoint) {
      this.state.startPoint = undefined
      this.state.previewEndPoint = undefined
    }
  }

  renderOverlay(context: ToolOverlayContext): React.ReactNode {
    // Only render when drawing a wall
    if (!this.state.startPoint) return null

    // Use preview end point from tool state, fallback to current snap position
    const endPoint =
      this.state.previewEndPoint || context.snapResult?.position || context.snapTarget || context.currentMousePos

    if (!endPoint) return null

    return React.createElement(
      React.Fragment,
      null,
      // Main wall preview with strawbale visualization
      ...this.renderStrawbalePreview(this.state.startPoint, endPoint),

      // Start point indicator (only when drawing)
      React.createElement(Circle, {
        x: this.state.startPoint.x,
        y: this.state.startPoint.y,
        radius: 12,
        fill: '#ff6600',
        stroke: '#ffffff',
        strokeWidth: 3,
        opacity: 0.8,
        listening: false
      }),

      // Wall length text
      this.renderLengthLabel(this.state.startPoint, endPoint)
    )
  }

  private renderStrawbalePreview(startPoint: Point2D, endPoint: Point2D): React.ReactNode[] {
    // Calculate wall perpendicular direction for plaster edges
    const dx = endPoint.x - startPoint.x
    const dy = endPoint.y - startPoint.y
    const length = Math.sqrt(dx * dx + dy * dy)

    if (length === 0) return []

    // Get perpendicular vector (normal to wall)
    const normalX = -dy / length
    const normalY = dx / length

    // Extract wall type from config ID (e.g., 'wall.outer' -> 'outer')
    const wallTypeId = this.config.id.split('.')[1] as WallType

    // Get visualization config using shared utility
    const wallViz = getWallPreviewVisualization(wallTypeId, this.state.thickness)

    const previewElements: React.ReactNode[] = []
    const opacity = 0.4

    // Main wall body
    previewElements.push(
      React.createElement(Line, {
        key: 'main-body',
        points: [startPoint.x, startPoint.y, endPoint.x, endPoint.y],
        stroke: wallViz.mainColor,
        strokeWidth: wallViz.strokeWidth,
        opacity,
        listening: false
      })
    )

    // Wood support pattern for structural walls
    if (wallViz.pattern) {
      previewElements.push(
        React.createElement(Line, {
          key: 'wood-supports',
          points: [startPoint.x, startPoint.y, endPoint.x, endPoint.y],
          stroke: wallViz.pattern.color,
          strokeWidth: wallViz.strokeWidth,
          dash: wallViz.pattern.dash,
          opacity,
          listening: false
        })
      )
    }

    // Plaster edges
    wallViz.edges.forEach((edge, index) => {
      const isOutside = edge.position === 'outside'
      const offset = isOutside ? wallViz.strokeWidth / 2 + edge.width / 2 : -(wallViz.strokeWidth / 2) - edge.width / 2

      previewElements.push(
        React.createElement(Line, {
          key: `edge-${edge.position}-${index}`,
          points: [
            startPoint.x + normalX * offset,
            startPoint.y + normalY * offset,
            endPoint.x + normalX * offset,
            endPoint.y + normalY * offset
          ],
          stroke: edge.color,
          strokeWidth: edge.width,
          opacity,
          listening: false
        })
      )
    })

    return previewElements
  }

  private renderLengthLabel(startPoint: Point2D, endPoint: Point2D): React.ReactNode {
    const length = Math.sqrt(Math.pow(endPoint.x - startPoint.x, 2) + Math.pow(endPoint.y - startPoint.y, 2))

    const midX = (startPoint.x + endPoint.x) / 2
    const midY = (startPoint.y + endPoint.y) / 2

    return React.createElement(Text, {
      x: midX,
      y: midY - 25,
      text: `${(length / 1000).toFixed(2)}m (${this.config.label})`,
      fontSize: 22,
      fill: this.config.primaryColor,
      fontFamily: 'monospace',
      fontStyle: 'bold',
      align: 'center',
      listening: false,
      shadowColor: '#ffffff',
      shadowBlur: 6,
      shadowOffsetX: 0,
      shadowOffsetY: 0
    })
  }

  getContextActions(): ContextAction[] {
    const actions: ContextAction[] = []

    // Wall-specific actions
    if (this.state.startPoint) {
      actions.push({
        label: 'Cancel Wall',
        action: () => this.cancelDrawing(),
        hotkey: 'Escape',
        icon: '✕'
      })
    }

    // Quick tool switching (abstract - could be customized by subclasses)
    actions.push({
      label: 'Switch Wall Type',
      action: () => {
        // Implementation would cycle through wall types
      },
      hotkey: 'Tab'
    })

    return actions
  }

  // Public methods for tool inspection
  setThickness(thickness: number): void {
    this.state.thickness = thickness
  }

  // Helper methods
  private cancelDrawing(): void {
    this.state.startPoint = undefined
    this.state.previewEndPoint = undefined
  }
}
