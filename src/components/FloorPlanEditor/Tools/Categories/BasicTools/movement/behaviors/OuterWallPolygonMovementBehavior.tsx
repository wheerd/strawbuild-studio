import type { MovementBehavior, MovementContext, MouseMovementState } from '../MovementBehavior'
import type { SelectableId } from '@/types/ids'
import type { StoreActions } from '@/model/store/types'
import type { OuterWallPolygon } from '@/types/model'
import type { Vec2 } from '@/types/geometry'
import { add } from '@/types/geometry'
import { isOuterWallId } from '@/types/ids'
import React from 'react'
import { Group, Line } from 'react-konva'
import { COLORS } from '@/theme/colors'

interface PolygonMovementState {
  offset: Vec2 // Just the movement delta
}

export class OuterWallPolygonMovementBehavior implements MovementBehavior<OuterWallPolygon, PolygonMovementState> {
  getEntity(entityId: SelectableId, _parentIds: SelectableId[], store: StoreActions): OuterWallPolygon {
    if (!isOuterWallId(entityId)) {
      throw new Error(`Invalid entity context for wall ${entityId}`)
    }

    const wall = store.getOuterWallById(entityId)
    if (!wall) {
      throw new Error(`Could not find wall ${entityId}`)
    }

    return wall
  }

  initializeState(mouseState: MouseMovementState, _context: MovementContext<OuterWallPolygon>): PolygonMovementState {
    return {
      offset: mouseState.delta
    }
  }

  constrainAndSnap(mouseState: MouseMovementState, _context: MovementContext<OuterWallPolygon>): PolygonMovementState {
    // TODO: Snapping
    // TODO: Snap state should be in the movement context, so that is only filled once
    // TODO: Snapping for all points of the polygon, use the first snap found

    return { offset: mouseState.delta }
  }

  validatePosition(movementState: PolygonMovementState, context: MovementContext<OuterWallPolygon>): boolean {
    // Check if the moved polygon would intersect with other wall polygons
    const previewBoundary = context.entity.boundary.map(point => add(point, movementState.offset))

    // Get other walls on the same floor
    const currentWall = context.entity
    const allWalls = context.store.getOuterWallsByFloor(currentWall.floorId)
    const otherWalls = allWalls.filter(wall => wall.id !== currentWall.id)

    // Check for intersections with other wall polygons (basic bounding box check for now)
    for (const otherWall of otherWalls) {
      if (this.doPolygonsOverlap(previewBoundary, otherWall.boundary)) {
        return false
      }
    }

    return true
  }

  // Simple polygon overlap check using bounding boxes and point-in-polygon test
  private doPolygonsOverlap(polygon1: Vec2[], polygon2: Vec2[]): boolean {
    // Basic bounding box check first
    const box1 = this.getBoundingBox(polygon1)
    const box2 = this.getBoundingBox(polygon2)

    if (!this.doBoundingBoxesOverlap(box1, box2)) {
      return false
    }

    // If bounding boxes overlap, do a more detailed check
    // Check if any vertex of polygon1 is inside polygon2
    for (const point of polygon1) {
      if (this.isPointInPolygon(point, polygon2)) {
        return true
      }
    }

    // Check if any vertex of polygon2 is inside polygon1
    for (const point of polygon2) {
      if (this.isPointInPolygon(point, polygon1)) {
        return true
      }
    }

    return false
  }

  private getBoundingBox(polygon: Vec2[]): { minX: number; minY: number; maxX: number; maxY: number } {
    if (polygon.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 }

    let minX = polygon[0][0]
    let minY = polygon[0][1]
    let maxX = polygon[0][0]
    let maxY = polygon[0][1]

    for (const point of polygon) {
      minX = Math.min(minX, point[0])
      minY = Math.min(minY, point[1])
      maxX = Math.max(maxX, point[0])
      maxY = Math.max(maxY, point[1])
    }

    return { minX, minY, maxX, maxY }
  }

  private doBoundingBoxesOverlap(box1: any, box2: any): boolean {
    return !(box1.maxX < box2.minX || box2.maxX < box1.minX || box1.maxY < box2.minY || box2.maxY < box1.minY)
  }

  private isPointInPolygon(point: Vec2, polygon: Vec2[]): boolean {
    // Ray casting algorithm
    const x = point[0]
    const y = point[1]
    let inside = false

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0]
      const yi = polygon[i][1]
      const xj = polygon[j][0]
      const yj = polygon[j][1]

      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
        inside = !inside
      }
    }

    return inside
  }

  generatePreview(
    movementState: PolygonMovementState,
    isValid: boolean,
    context: MovementContext<OuterWallPolygon>
  ): React.ReactNode[] {
    const previewBoundary = context.entity.boundary.map(point => add(point, movementState.offset))

    // Create Konva JSX elements for preview
    return [
      <Group key="polygon-preview">
        <Line
          key="preview-polygon"
          points={previewBoundary.flatMap(p => [p[0], p[1]])}
          closed
          stroke={isValid ? COLORS.ui.primary : COLORS.ui.danger}
          strokeWidth={20}
          dash={[80, 40]}
          opacity={0.9}
          listening={false}
        />
        {/* Add semi-transparent fill for better visibility */}
        <Line
          key="preview-polygon-fill"
          points={previewBoundary.flatMap(p => [p[0], p[1]])}
          closed
          fill={isValid ? COLORS.ui.success : COLORS.ui.danger}
          opacity={0.1}
          listening={false}
        />
      </Group>
    ]
  }

  commitMovement(movementState: PolygonMovementState, context: MovementContext<OuterWallPolygon>): boolean {
    const wallId = context.entity.id
    return context.store.moveOuterWallPolygon(wallId, movementState.offset)
  }
}
