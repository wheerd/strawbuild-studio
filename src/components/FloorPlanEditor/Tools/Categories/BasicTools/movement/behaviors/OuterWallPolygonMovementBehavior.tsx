import type { MovementBehavior, MovementContext, MouseMovementState } from '../MovementBehavior'
import type { SelectableId } from '@/types/ids'
import type { StoreActions } from '@/model/store/types'
import type { OuterWallPolygon } from '@/types/model'
import type { Vec2, LineSegment2D } from '@/types/geometry'
import { subtract, add } from '@/types/geometry'
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

  constrainAndSnap(mouseState: MouseMovementState, context: MovementContext<OuterWallPolygon>): PolygonMovementState {
    const originalPosition = context.entity.boundary.length > 0 ? context.entity.boundary[0] : ([0, 0] as Vec2)
    const newPosition = add(originalPosition, mouseState.delta)

    // TODO: Snap state should be in the movement context, so that is only filled once
    // TODO: Snapping for all points of the polygon, use the first snap found

    // Get snap points and lines from other polygons
    const snapPoints = this.getOtherPolygonCorners(context)
    const snapLines = this.getOtherPolygonEdges(context)

    const snappingContext = {
      snapPoints,
      referenceLineSegments: snapLines,
      referencePoint: originalPosition
    }

    const snapResult = context.snappingService.findSnapResult(newPosition, snappingContext)
    const finalPosition = snapResult?.position || newPosition
    const offset = subtract(finalPosition, originalPosition)

    return { offset }
  }

  validatePosition(_movementState: PolygonMovementState, _context: MovementContext<OuterWallPolygon>): boolean {
    // TODO: Validate it doesn't intersect other wall polygons
    return true
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

  private getOtherPolygonCorners(context: MovementContext<OuterWallPolygon>): Vec2[] {
    // Get corners from other polygons on the same floor for snapping
    const currentWallId = context.entity.id
    const currentWall = context.entity

    const allWalls = context.store.getOuterWallsByFloor(currentWall.floorId)
    const otherWalls = allWalls.filter(wall => wall.id !== currentWallId)

    const corners: Vec2[] = []
    for (const wall of otherWalls) {
      corners.push(...wall.boundary)
    }

    return corners
  }

  private getOtherPolygonEdges(context: MovementContext<OuterWallPolygon>): LineSegment2D[] {
    // Get edges from other polygons on the same floor for snapping
    const currentWallId = context.entity.id
    const currentWall = context.entity

    const allWalls = context.store.getOuterWallsByFloor(currentWall.floorId)
    const otherWalls = allWalls.filter(wall => wall.id !== currentWallId)

    const edges: LineSegment2D[] = []
    for (const wall of otherWalls) {
      for (let i = 0; i < wall.boundary.length; i++) {
        const start = wall.boundary[i]
        const end = wall.boundary[(i + 1) % wall.boundary.length]
        edges.push({ start, end })
      }
    }

    return edges
  }
}
