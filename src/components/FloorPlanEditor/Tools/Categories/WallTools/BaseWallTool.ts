import type { Tool, ContextAction, CanvasEvent, ToolOverlayContext } from '../../ToolSystem/types'
import type { Point2D } from '@/types/geometry'
import { distanceSquared } from '@/types/geometry'
import React from 'react'
import { Line, Circle, Text } from 'react-konva'
import type { StoreActions, FloorId, PointId } from '@/model'
import { getWallVisualization } from '@/components/FloorPlanEditor/visualization/wallVisualization'
import type { Wall, WallType } from '@/types/model'

export interface WallToolState {
  startPointId?: PointId
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
  ): Wall

  // Event handlers (common implementation)
  handleMouseDown(event: CanvasEvent): boolean {
    const stageCoords = event.stageCoordinates
    const snapResult = event.context.findSnapPoint(stageCoords)
    const snapCoords = snapResult?.position ?? stageCoords

    if (!this.state.startPoint) {
      // Start drawing wall
      this.state.startPoint = snapCoords
      this.state.startPointId = snapResult?.pointId
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
        const startPointId = this.state.startPointId ?? modelStore.addPoint(activeFloorId, this.state.startPoint).id
        const endPointId = snapResult?.pointId ?? modelStore.addPoint(activeFloorId, snapCoords).id

        // Create wall using abstract method
        const wall = this.createWall(modelStore, activeFloorId, startPointId, endPointId, this.state.thickness)

        // Update corners for both endpoints after wall creation
        this.updateCornersForPoint(modelStore, wall, startPointId)
        this.updateCornersForPoint(modelStore, wall, endPointId)
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
        x: this.state.startPoint[0],
        y: this.state.startPoint[1],
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
    const dx = endPoint[0] - startPoint[0]
    const dy = endPoint[1] - startPoint[1]
    const length = Math.sqrt(dx * dx + dy * dy)

    if (length === 0) return []

    // Get perpendicular vector (normal to wall)
    const normalX = -dy / length
    const normalY = dx / length

    // Extract wall type from config ID (e.g., 'wall.outer' -> 'outer')
    const wallTypeId = this.config.id.split('.')[1] as WallType

    // Get visualization config using shared utility
    // For outer wall previews, default to 'right' as outside direction
    const defaultOutsideDirection: 'left' | 'right' | undefined = wallTypeId === 'outer' ? 'right' : undefined
    const wallViz = getWallVisualization(wallTypeId, this.state.thickness, defaultOutsideDirection)

    const previewElements: React.ReactNode[] = []
    const opacity = 0.4

    // Main wall body
    previewElements.push(
      React.createElement(Line, {
        key: 'main-body',
        points: [startPoint[0], startPoint[1], endPoint[0], endPoint[1]],
        stroke: wallViz.mainColor,
        strokeWidth: wallViz.strokeWidth,
        lineCap: 'butt',
        opacity,
        listening: false
      })
    )

    // Wood support pattern for structural walls
    if (wallViz.pattern) {
      previewElements.push(
        React.createElement(Line, {
          key: 'wood-supports',
          points: [startPoint[0], startPoint[1], endPoint[0], endPoint[1]],
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
      // For walls going start->end: positive normal is "left", negative normal is "right"
      const normalDirection = edge.position === 'left' ? 1 : -1

      // Position edge inside the wall thickness boundary
      const edgeOffset = (wallViz.strokeWidth / 2 - edge.width / 2) * normalDirection

      previewElements.push(
        React.createElement(Line, {
          key: `edge-${edge.position}-${index}`,
          points: [
            startPoint[0] + normalX * edgeOffset,
            startPoint[1] + normalY * edgeOffset,
            endPoint[0] + normalX * edgeOffset,
            endPoint[1] + normalY * edgeOffset
          ],
          stroke: edge.color,
          strokeWidth: edge.width,
          lineCap: 'butt',
          opacity,
          listening: false
        })
      )
    })

    return previewElements
  }

  private renderLengthLabel(startPoint: Point2D, endPoint: Point2D): React.ReactNode {
    const length = Math.sqrt(Math.pow(endPoint[0] - startPoint[0], 2) + Math.pow(endPoint[1] - startPoint[1], 2))

    const midX = (startPoint[0] + endPoint[0]) / 2
    const midY = (startPoint[1] + endPoint[1]) / 2

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

  private updateCornersForPoint(modelStore: StoreActions, wall: Wall, pointId: PointId): void {
    const connectedWalls = modelStore.getWallsConnectedToPoint(pointId, wall.floorId)
    if (connectedWalls.length === 2) {
      modelStore.addCorner(pointId, wall.floorId, connectedWalls[0].id, connectedWalls[1].id)
    } else if (connectedWalls.length > 2) {
      const existingCorner = modelStore.getCorner(pointId)
      if (existingCorner) {
        modelStore.addWallToCorner(pointId, wall.id)
      }
    }
  }
}
