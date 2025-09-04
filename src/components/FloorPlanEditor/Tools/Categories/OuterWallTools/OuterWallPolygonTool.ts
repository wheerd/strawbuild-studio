import type { Tool, ContextAction, CanvasEvent, ToolOverlayContext } from '../../ToolSystem/types'
import type { Vec2, Polygon2D, LineSegment2D } from '@/types/geometry'
import {
  createLength,
  createVec2,
  polygonIsClockwise,
  wouldPolygonSelfIntersect,
  wouldClosingPolygonSelfIntersect,
  distanceSquared
} from '@/types/geometry'
import type { SnappingContext, SnapResult } from '@/model/store/services/snapping/types'
import React from 'react'
import { Line, Circle } from 'react-konva'
import { SnappingService } from '@/model/store/services/snapping'

interface OuterWallPolygonToolState {
  points: Vec2[]
  mouse: Vec2
  snapResult?: SnapResult
  snapContext: SnappingContext
  isCurrentLineValid: boolean
  isClosingLineValid: boolean
}

export class OuterWallPolygonTool implements Tool {
  readonly id = 'outer-wall-polygon'
  readonly name = 'Outer Wall Polygon'
  readonly icon = '⬜'
  readonly hotkey = 'w'
  readonly cursor = 'crosshair'
  readonly category = 'walls'
  readonly hasInspector = false

  public state: OuterWallPolygonToolState = {
    points: [],
    mouse: createVec2(0, 0),
    snapContext: {
      snapPoints: [],
      alignPoints: [],
      referenceLineSegments: []
    },
    isCurrentLineValid: true,
    isClosingLineValid: true
  }

  private snapService = new SnappingService()

  /**
   * Check if the current snap result is snapping to the first point of the polygon
   */
  private isSnappingToFirstPoint(): boolean {
    if (this.state.points.length === 0 || !this.state.snapResult?.position) {
      return false
    }
    const firstPoint = this.state.points[0]
    const snapPos = this.state.snapResult.position
    // Use a small threshold (5mm) to detect if snapping to first point
    return distanceSquared(firstPoint, snapPos) < 25 // 5mm squared
  }

  private updateSnapContext() {
    const referenceLineSegments: LineSegment2D[] = []
    for (let i = 1; i < this.state.points.length; i++) {
      const start = this.state.points[i - 1]
      const end = this.state.points[i]
      referenceLineSegments.push({ start, end })
    }

    this.state.snapContext = {
      snapPoints: this.state.points.slice(0, 1),
      alignPoints: this.state.points,
      referencePoint: this.state.points[this.state.points.length - 1],
      referenceLineSegments
    }
    this.listeners.forEach(l => l())
  }

  handleMouseDown(event: CanvasEvent): boolean {
    const stageCoords = event.stageCoordinates
    this.state.mouse = stageCoords
    this.state.snapResult = this.snapService.findSnapResult(stageCoords, this.state.snapContext) ?? undefined
    const snapCoords = this.state.snapResult?.position ?? stageCoords

    // Check if clicking near the first point to close the polygon
    if (this.state.points.length >= 3) {
      if (this.isSnappingToFirstPoint()) {
        // Only allow closing if it wouldn't create intersections
        if (this.state.isClosingLineValid) {
          this.completePolygon(event)
        }
        return true
      }
    }

    // Only add point if the line is valid (doesn't create intersections)
    if (this.state.isCurrentLineValid) {
      this.state.points.push(snapCoords)
      this.updateSnapContext()
      // Update validation for new state
      this.updateValidation()
    }

    return true
  }

  handleMouseMove(event: CanvasEvent): boolean {
    const stageCoords = event.stageCoordinates
    this.state.mouse = stageCoords
    this.state.snapResult = this.snapService.findSnapResult(stageCoords, this.state.snapContext) ?? undefined

    // Update validation based on current mouse position
    this.updateValidation()

    this.listeners.forEach(l => l())
    return true
  }

  handleKeyDown(event: CanvasEvent): boolean {
    const keyEvent = event.originalEvent as KeyboardEvent

    if (keyEvent.key === 'Escape') {
      // Only handle escape if we have points, otherwise bubble up
      if (this.state.points.length > 0) {
        this.cancelPolygon()
        return true
      }
      return false // Bubble up to allow tool cancellation
    }

    if (keyEvent.key === 'Enter' && this.state.points.length >= 3) {
      this.completePolygon(event)
      return true
    }

    return false
  }

  onActivate(): void {
    this.state.points = []
    this.state.isCurrentLineValid = true
    this.state.isClosingLineValid = true
    this.updateSnapContext()
  }

  onDeactivate(): void {
    this.state.points = []
    this.state.isCurrentLineValid = true
    this.state.isClosingLineValid = true
    this.updateSnapContext()
  }

  private renderSnapping(context: ToolOverlayContext): React.ReactNode {
    const elements: React.ReactNode[] = []

    const lines = this.state.snapResult?.lines ?? []
    for (const i in lines) {
      const line = lines[i]
      elements.push(
        React.createElement(Line, {
          key: `snap-line-${i}`,
          points: [
            line.point[0] - context.getInfiniteLineExtent() * line.direction[0],
            line.point[1] - context.getInfiniteLineExtent() * line.direction[1],
            line.point[0] + context.getInfiniteLineExtent() * line.direction[0],
            line.point[1] + context.getInfiniteLineExtent() * line.direction[1]
          ],
          stroke: '#0066ff',
          strokeWidth: 8,
          opacity: 0.5,
          listening: false
        })
      )
    }

    if (this.state.snapResult?.position || this.state.mouse) {
      const pos = this.state.snapResult?.position ?? this.state.mouse
      elements.push(
        React.createElement(Circle, {
          x: pos[0],
          y: pos[1],
          radius: 15,
          fill: '#0066ff',
          stroke: '#ffffff',
          strokeWidth: 3,
          opacity: 0.9,
          listening: false
        })
      )
    }

    return React.createElement(React.Fragment, null, ...elements)
  }

  renderOverlay(context: ToolOverlayContext): React.ReactNode {
    if (this.state.points.length === 0) return null

    const elements: React.ReactNode[] = []

    // Draw existing points
    this.state.points.forEach((point, index) => {
      const isFirstPoint = index === 0

      elements.push(
        React.createElement(Circle, {
          key: `point-${index}`,
          x: point[0],
          y: point[1],
          radius: 20,
          fill: isFirstPoint ? '#ef4444' : '#3b82f6',
          stroke: '#ffffff',
          strokeWidth: 3,
          listening: false
        })
      )
    })

    // Draw lines between points
    if (this.state.points.length > 1) {
      const points: number[] = []
      for (const point of this.state.points) {
        points.push(point[0], point[1])
      }

      elements.push(
        React.createElement(Line, {
          key: 'polygon-lines',
          points,
          stroke: '#3b82f6',
          strokeWidth: 10,
          lineCap: 'round',
          lineJoin: 'round',
          listening: false
        })
      )
    }

    // Draw line to current mouse position
    if (this.state.points.length > 0) {
      const lastPoint = this.state.points[this.state.points.length - 1]
      const currentPos = this.state.snapResult?.position ?? this.state.mouse

      if (currentPos) {
        elements.push(
          React.createElement(Line, {
            key: 'preview-line',
            points: [lastPoint[0], lastPoint[1], currentPos[0], currentPos[1]],
            stroke: this.state.isCurrentLineValid ? '#94a3b8' : '#ef4444',
            strokeWidth: 10,
            dash: [30, 30],
            listening: false
          })
        )
      }
    }

    // Draw closing line preview when near first point
    if (this.state.points.length >= 3 && this.isSnappingToFirstPoint()) {
      const lastPoint = this.state.points[this.state.points.length - 1]
      const firstPoint = this.state.points[0]

      elements.push(
        React.createElement(Line, {
          key: 'closing-line-preview',
          points: [lastPoint[0], lastPoint[1], firstPoint[0], firstPoint[1]],
          stroke: this.state.isClosingLineValid ? '#22c55e' : '#ef4444',
          strokeWidth: 12,
          dash: [20, 20],
          listening: false
        })
      )
    }

    elements.push(this.renderSnapping(context))

    return React.createElement(React.Fragment, null, ...elements)
  }

  getContextActions(): ContextAction[] {
    const actions: ContextAction[] = []

    if (this.state.points.length > 0) {
      actions.push({
        label: 'Cancel Polygon',
        action: () => this.cancelPolygon(),
        hotkey: 'Escape',
        icon: '✕'
      })
    }

    if (this.state.points.length >= 3) {
      actions.push({
        label: this.state.isClosingLineValid ? 'Complete Polygon' : 'Complete Polygon (Invalid)',
        action: () => this.completePolygon(null),
        hotkey: 'Enter',
        icon: this.state.isClosingLineValid ? '✓' : '⚠️'
      })
    }

    return actions
  }

  private completePolygon(event: CanvasEvent | null): void {
    if (this.state.points.length < 3) return

    // Only complete if closing wouldn't create intersections
    if (!this.state.isClosingLineValid) return

    // Create polygon and ensure clockwise order for outer walls
    let polygon: Polygon2D = { points: [...this.state.points] }

    // Check if polygon is clockwise, if not reverse it
    if (!polygonIsClockwise(polygon)) {
      polygon = { points: [...this.state.points].reverse() }
    }

    if (event) {
      const modelStore = event.context.getModelStore()
      const activeFloorId = event.context.getActiveFloorId()

      try {
        modelStore.addOuterWallPolygon(
          activeFloorId,
          polygon,
          'cells-under-tension',
          createLength(440) // Default 44cm thickness
        )
      } catch (error) {
        console.error('Failed to create outer wall polygon:', error)
      }
    }

    this.state.points = []
    this.state.isCurrentLineValid = true
    this.state.isClosingLineValid = true
    this.updateSnapContext()
  }

  private cancelPolygon(): void {
    this.state.points = []
    this.state.isCurrentLineValid = true
    this.state.isClosingLineValid = true
    this.updateSnapContext()
  }

  private updateValidation(): void {
    if (this.state.points.length === 0) {
      this.state.isCurrentLineValid = true
      this.state.isClosingLineValid = true
      return
    }

    const currentPos = this.state.snapResult?.position ?? this.state.mouse

    // Special case: if snapping to the first point (closing the polygon),
    // don't check for point reuse but still check intersection
    const isSnapToFirstPoint = this.isSnappingToFirstPoint()

    if (isSnapToFirstPoint) {
      // When closing polygon, only check if closing would create intersections
      this.state.isCurrentLineValid =
        this.state.points.length >= 3 ? !wouldClosingPolygonSelfIntersect(this.state.points) : true
    } else {
      // Normal case: check for both intersections and point reuse
      this.state.isCurrentLineValid = !wouldPolygonSelfIntersect(this.state.points, currentPos)
    }

    // Check if closing the polygon would create intersections
    if (this.state.points.length >= 3) {
      this.state.isClosingLineValid = !wouldClosingPolygonSelfIntersect(this.state.points)
    } else {
      this.state.isClosingLineValid = true
    }
  }

  private listeners: (() => void)[] = []

  onRenderNeeded(listener: () => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }
}
