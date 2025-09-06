import type { MovementBehavior, MovementContext, MovementState } from '../MovementBehavior'
import type { SelectableId } from '@/types/ids'
import type { StoreActions } from '@/model/store/types'
import type { OuterWallPolygon } from '@/types/model'
import type { OuterWallId } from '@/types/ids'
import type { Vec2, LineSegment2D } from '@/types/geometry'
import { subtract, add } from '@/types/geometry'
import { isOuterWallId } from '@/types/ids'
import React from 'react'
import { Group, Line } from 'react-konva'
import { COLORS } from '@/theme/colors'

export class OuterWallPolygonMovementBehavior implements MovementBehavior {
  getEntityPosition(entityId: SelectableId, _parentIds: SelectableId[], store: StoreActions): Vec2 {
    if (!isOuterWallId(entityId as string)) return [0, 0]

    const wall = store.getOuterWallById(entityId as OuterWallId)
    if (!wall || wall.boundary.length === 0) return [0, 0]

    // Return the first corner as the reference position for the polygon
    return wall.boundary[0]
  }

  constrainAndSnap(movementState: MovementState, context: MovementContext): MovementState {
    // Calculate the new entity position based on mouse delta
    const newEntityPosition = add(movementState.initialEntityPosition, movementState.mouseDelta)

    // Get snap points and lines from other polygons
    const snapPoints = this.getOtherPolygonCorners(context)
    const snapLines = this.getOtherPolygonEdges(context)

    const snappingContext = {
      snapPoints,
      referenceLineSegments: snapLines,
      referencePoint: movementState.initialEntityPosition
    }

    const snapResult = context.snappingService.findSnapResult(newEntityPosition, snappingContext)
    const finalEntityPosition = snapResult?.position || newEntityPosition

    return {
      ...movementState,
      finalEntityPosition,
      snapResult,
      isValidPosition: true // Will be set by validatePosition
    }
  }

  validatePosition(_movementState: MovementState, _context: MovementContext): boolean {
    // Polygon translation is always valid (preserves shape)
    return true
  }

  generatePreview(movementState: MovementState, context: MovementContext): React.ReactNode[] {
    const entity = this.getEntity(context)
    if (!entity) return []

    const offset = subtract(movementState.finalEntityPosition, movementState.initialEntityPosition)
    const previewBoundary = entity.boundary.map(point => add(point, offset))

    // Create Konva JSX elements for preview
    return [
      <Group key="polygon-preview">
        <Line
          key="preview-polygon"
          points={previewBoundary.flatMap(p => [p[0], p[1]])}
          closed
          stroke={movementState.isValidPosition ? COLORS.ui.primary : COLORS.ui.danger}
          strokeWidth={3}
          dash={[8, 4]}
          opacity={0.9}
          listening={false}
        />
        {/* Add semi-transparent fill for better visibility */}
        <Line
          key="preview-polygon-fill"
          points={previewBoundary.flatMap(p => [p[0], p[1]])}
          closed
          fill={movementState.isValidPosition ? COLORS.ui.success : COLORS.ui.danger}
          opacity={0.1}
          listening={false}
        />
      </Group>
    ]
  }

  commitMovement(movementState: MovementState, context: MovementContext): boolean {
    const offset = subtract(movementState.finalEntityPosition, movementState.initialEntityPosition)
    const wallId = context.entityId as OuterWallId

    return context.store.moveOuterWallPolygon(wallId, offset)
  }

  private getEntity(context: MovementContext): OuterWallPolygon | null {
    if (!isOuterWallId(context.entityId as string)) return null
    return context.store.getOuterWallById(context.entityId as OuterWallId)
  }

  private getOtherPolygonCorners(context: MovementContext): Vec2[] {
    // Get corners from other polygons on the same floor for snapping
    const currentWallId = context.entityId as OuterWallId
    const currentWall = this.getEntity(context)
    if (!currentWall) return []

    const allWalls = context.store.getOuterWallsByFloor(currentWall.floorId)
    const otherWalls = allWalls.filter(wall => wall.id !== currentWallId)

    const corners: Vec2[] = []
    for (const wall of otherWalls) {
      corners.push(...wall.boundary)
    }

    return corners
  }

  private getOtherPolygonEdges(context: MovementContext): LineSegment2D[] {
    // Get edges from other polygons on the same floor for snapping
    const currentWallId = context.entityId as OuterWallId
    const currentWall = this.getEntity(context)
    if (!currentWall) return []

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
