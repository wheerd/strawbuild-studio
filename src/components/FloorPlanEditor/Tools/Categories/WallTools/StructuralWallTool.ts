import type { Tool, ToolContext, ContextAction, CanvasEvent, ToolOverlayContext } from '../../ToolSystem/types'
import type { Point2D } from '@/types/geometry'
import { distanceSquared, createLength } from '@/types/geometry'
import React from 'react'
import { Line, Circle, Text } from 'react-konva'

export interface StructuralWallToolState {
  isDrawing: boolean
  startPoint?: Point2D
  thickness: number // mm
  height: number // mm
  material: string
  previewEndPoint?: Point2D // Tool handles its own preview
}

export class StructuralWallTool implements Tool {
  id = 'wall.structural'
  name = 'Structural Wall'
  icon = '▬'
  hotkey = 'w'
  cursor = 'crosshair'
  category = 'walls'
  hasInspector = true
  // inspectorComponent would be set to WallToolInspector

  public state: StructuralWallToolState = {
    isDrawing: false,
    thickness: 200, // 200mm default for structural walls
    height: 2700, // 2.7m default ceiling height
    material: 'concrete'
  }

  // Event handlers
  handleMouseDown(event: CanvasEvent): boolean {
    const stageCoords = event.stageCoordinates
    const snapResult = event.context.findSnapPoint(stageCoords)
    const snapCoords = snapResult?.position ?? stageCoords

    if (!this.state.isDrawing) {
      // Start drawing wall
      this.state.isDrawing = true
      this.state.startPoint = snapCoords
      event.context.updateSnapReference(snapCoords, snapResult?.pointId ?? null)
      return true
    } else if (this.state.startPoint) {
      // Finish drawing wall
      const wallLength = distanceSquared(this.state.startPoint, snapCoords)

      if (wallLength >= 50 ** 2) {
        // Minimum 50mm wall length - create wall using model store directly
        const modelStore = event.context.getModelStore()
        const activeFloorId = event.context.getActiveFloorId()

        // Get or create points
        const startPointEntity = modelStore.addPoint(activeFloorId, this.state.startPoint)
        const endPointEntity = modelStore.addPoint(activeFloorId, snapCoords)

        // Add wall
        modelStore.addStructuralWall(
          activeFloorId,
          startPointEntity.id,
          endPointEntity.id,
          createLength(this.state.thickness)
        )
      } else {
        // TODO: Handle minimum wall length validation
      }

      // Reset state
      this.state.isDrawing = false
      this.state.startPoint = undefined
      event.context.clearSnapState()
      return true
    }

    return false
  }

  handleMouseMove(event: CanvasEvent): boolean {
    if (!this.state.isDrawing || !this.state.startPoint) return false

    const stageCoords = event.stageCoordinates
    const snapResult = event.context.findSnapPoint(stageCoords)
    const snapCoords = snapResult?.position ?? stageCoords

    // Tool handles its own wall preview
    this.state.previewEndPoint = snapCoords
    return true
  }

  handleKeyDown(event: CanvasEvent): boolean {
    const keyEvent = event.originalEvent as KeyboardEvent
    if (keyEvent.key === 'Escape' && this.state.isDrawing) {
      this.cancelDrawing(event.context)
      return true
    }

    // Quick thickness adjustment
    if (keyEvent.key === '[' && this.state.thickness > 50) {
      this.state.thickness -= 25
      return true
    }

    if (keyEvent.key === ']' && this.state.thickness < 1000) {
      this.state.thickness += 25
      return true
    }

    return false
  }

  // Lifecycle methods
  onActivate(): void {
    this.state.isDrawing = false
    this.state.startPoint = undefined
  }

  onDeactivate(): void {
    if (this.state.isDrawing) {
      this.state.isDrawing = false
      this.state.startPoint = undefined
    }
  }

  // Context actions
  getContextActions(): ContextAction[] {
    const actions: ContextAction[] = []

    actions.push({
      label: 'Switch to Partition Wall',
      action: () => {
        // Implementation would switch to partition wall tool
      },
      hotkey: 'P'
    })

    actions.push({
      label: 'Switch to Outer Wall',
      action: () => {
        // Implementation would switch to outer wall tool
      },
      hotkey: 'O'
    })

    if (this.state.isDrawing) {
      actions.push({
        label: 'Cancel Wall',
        action: () => this.cancelDrawing(),
        hotkey: 'Escape'
      })
    }

    // Thickness presets
    actions.push({
      label: 'Thin Wall (100mm)',
      action: () => this.setThickness(100)
    })

    actions.push({
      label: 'Standard Wall (200mm)',
      action: () => this.setThickness(200)
    })

    actions.push({
      label: 'Thick Wall (300mm)',
      action: () => this.setThickness(300)
    })

    return actions
  }

  // Tool-specific methods
  setThickness(thickness: number): void {
    this.state.thickness = Math.max(50, Math.min(1000, thickness))
  }

  setHeight(height: number): void {
    this.state.height = Math.max(1000, Math.min(5000, height)) // Between 1m and 5m
  }

  setMaterial(material: string): void {
    this.state.material = material
  }

  renderOverlay(context: ToolOverlayContext): React.ReactNode {
    if (!this.state.isDrawing || !this.state.startPoint) {
      return null
    }

    // Use preview end point from tool state, fallback to current snap position
    const endPoint =
      this.state.previewEndPoint || context.snapResult?.position || context.snapTarget || context.currentMousePos

    if (!endPoint) return null

    return React.createElement(
      React.Fragment,
      null,
      // Main wall preview line
      React.createElement(Line, {
        points: [this.state.startPoint.x, this.state.startPoint.y, endPoint.x, endPoint.y],
        stroke: '#007acc',
        strokeWidth: this.state.thickness,
        opacity: 0.6,
        dash: [20, 15],
        listening: false
      }),

      // Wall thickness indicators
      this.renderThicknessIndicators(this.state.startPoint, endPoint),

      // End point snap indicator
      React.createElement(Circle, {
        x: endPoint.x,
        y: endPoint.y,
        radius: 15,
        fill: '#007acc',
        stroke: '#ffffff',
        strokeWidth: 3,
        opacity: 0.8,
        listening: false
      }),

      // Start point indicator
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

  private renderThicknessIndicators(startPoint: Point2D, endPoint: Point2D): React.ReactNode {
    // Calculate perpendicular vector for thickness
    const dx = endPoint.x - startPoint.x
    const dy = endPoint.y - startPoint.y
    const length = Math.sqrt(dx * dx + dy * dy)

    if (length === 0) return null

    // Normalize and get perpendicular
    const perpX = (-dy / length) * (this.state.thickness / 2)
    const perpY = (dx / length) * (this.state.thickness / 2)

    return React.createElement(
      React.Fragment,
      null,
      // Top edge of wall
      React.createElement(Line, {
        points: [startPoint.x + perpX, startPoint.y + perpY, endPoint.x + perpX, endPoint.y + perpY],
        stroke: '#007acc',
        strokeWidth: 3,
        opacity: 0.4,
        dash: [10, 5],
        listening: false
      }),

      // Bottom edge of wall
      React.createElement(Line, {
        points: [startPoint.x - perpX, startPoint.y - perpY, endPoint.x - perpX, endPoint.y - perpY],
        stroke: '#007acc',
        strokeWidth: 3,
        opacity: 0.4,
        dash: [10, 5],
        listening: false
      })
    )
  }

  private renderLengthLabel(startPoint: Point2D, endPoint: Point2D): React.ReactNode {
    const length = Math.sqrt(Math.pow(endPoint.x - startPoint.x, 2) + Math.pow(endPoint.y - startPoint.y, 2))

    const midX = (startPoint.x + endPoint.x) / 2
    const midY = (startPoint.y + endPoint.y) / 2

    return React.createElement(Text, {
      x: midX,
      y: midY - 25,
      text: `${(length / 1000).toFixed(2)}m`,
      fontSize: 24,
      fill: '#007acc',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      align: 'center',
      listening: false,
      shadowColor: '#ffffff',
      shadowBlur: 8,
      shadowOffsetX: 0,
      shadowOffsetY: 0
    })
  }

  // Helper methods
  private cancelDrawing(context?: ToolContext): void {
    this.state.isDrawing = false
    this.state.startPoint = undefined
    if (context) {
      context.clearSnapState()
      // Tools now handle their own previews
    }
  }
}
