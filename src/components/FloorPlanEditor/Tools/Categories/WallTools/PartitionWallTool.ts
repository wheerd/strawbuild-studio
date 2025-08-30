import type { Tool, ToolContext, ContextAction, CanvasEvent, ToolOverlayContext } from '../../ToolSystem/types'
import type { Point2D } from '@/types/geometry'
import { distanceSquared, createLength } from '@/types/geometry'
import React from 'react'
import { Line, Circle, Text } from 'react-konva'

export interface PartitionWallToolState {
  isDrawing: boolean
  startPoint?: Point2D
  thickness: number // mm
  height: number // mm
  material: string
}

export class PartitionWallTool implements Tool {
  id = 'wall.partition'
  name = 'Partition Wall'
  icon = '▬'
  hotkey = 'Shift+w'
  cursor = 'crosshair'
  category = 'walls'
  hasInspector = true

  public state: PartitionWallToolState = {
    isDrawing: false,
    thickness: 100, // 100mm default for partition walls (thinner than structural)
    height: 2700, // 2.7m default ceiling height
    material: 'drywall'
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
        // Create partition wall using model store directly
        const modelStore = event.context.getModelStore()
        const activeFloorId = event.context.getActiveFloorId()

        // Get or create points
        const startPointEntity = modelStore.addPoint(activeFloorId, this.state.startPoint)
        const endPointEntity = modelStore.addPoint(activeFloorId, snapCoords)

        // Add wall
        modelStore.addPartitionWall(
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
    event.context.findSnapPoint(stageCoords)

    // Tool handles its own wall preview
    // TODO: Implement preview rendering within the tool
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

    if (keyEvent.key === ']' && this.state.thickness < 500) {
      // Partition walls typically thinner
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
  getContextActions(_context: ToolContext): ContextAction[] {
    const actions: ContextAction[] = []

    actions.push({
      label: 'Switch to Structural Wall',
      action: () => {},
      hotkey: 'S'
    })

    actions.push({
      label: 'Switch to Outer Wall',
      action: () => {},
      hotkey: 'O'
    })

    if (this.state.isDrawing) {
      actions.push({
        label: 'Cancel Wall',
        action: () => this.cancelDrawing(),
        hotkey: 'Escape'
      })
    }

    // Partition-specific thickness presets
    actions.push({
      label: 'Thin Partition (75mm)',
      action: () => this.setThickness(75)
    })

    actions.push({
      label: 'Standard Partition (100mm)',
      action: () => this.setThickness(100)
    })

    actions.push({
      label: 'Thick Partition (150mm)',
      action: () => this.setThickness(150)
    })

    return actions
  }

  // Tool-specific methods
  setThickness(thickness: number): void {
    this.state.thickness = Math.max(50, Math.min(500, thickness)) // Partition walls are thinner
  }

  setHeight(height: number): void {
    this.state.height = Math.max(1000, Math.min(4000, height)) // Partitions can be shorter
  }

  setMaterial(material: string): void {
    this.state.material = material
  }

  renderOverlay(context: ToolOverlayContext): React.ReactNode {
    if (!this.state.isDrawing || !this.state.startPoint) {
      return null
    }

    // Use preview end point from tool state, fallback to current snap position
    const endPoint = context.snapResult?.position || context.snapTarget || context.currentMousePos

    if (!endPoint) return null

    return React.createElement(
      React.Fragment,
      null,
      // Main wall preview line
      React.createElement(Line, {
        points: [this.state.startPoint.x, this.state.startPoint.y, endPoint.x, endPoint.y],
        stroke: '#ff8800',
        strokeWidth: this.state.thickness,
        opacity: 0.6,
        dash: [15, 10],
        listening: false
      }),

      // Wall thickness indicators
      this.renderThicknessIndicators(this.state.startPoint, endPoint),

      // End point snap indicator
      React.createElement(Circle, {
        x: endPoint.x,
        y: endPoint.y,
        radius: 15,
        fill: '#ff8800',
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
        stroke: '#ff8800',
        strokeWidth: 3,
        opacity: 0.4,
        dash: [10, 5],
        listening: false
      }),

      // Bottom edge of wall
      React.createElement(Line, {
        points: [startPoint.x - perpX, startPoint.y - perpY, endPoint.x - perpX, endPoint.y - perpY],
        stroke: '#ff8800',
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
      text: `${(length / 1000).toFixed(2)}m (Partition)`,
      fontSize: 22,
      fill: '#ff8800',
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
