import type { MovementBehavior, MovementContext, MovementState } from '../MovementBehavior'
import type { OuterWallPolygon } from '@/types/model'
import type { OuterWallId } from '@/types/ids'
import type { Vec2, LineSegment2D } from '@/types/geometry'
import { subtract, add } from '@/types/geometry'
import { isOuterWallId } from '@/types/ids'
import React from 'react'
import { Group, Line } from 'react-konva'
import { COLORS } from '@/theme/colors'

export class OuterWallPolygonMovementBehavior implements MovementBehavior {
  constrainAndSnap(targetPosition: Vec2, context: MovementContext): MovementState {
    // Get snap points and lines from other polygons
    const snapPoints = this.getOtherPolygonCorners(context)
    const snapLines = this.getOtherPolygonEdges(context)

    const snappingContext = {
      snapPoints,
      referenceLineSegments: snapLines,
      referencePoint: context.startPosition
    }

    const snapResult = context.snappingService.findSnapResult(targetPosition, snappingContext)
    const finalPosition = snapResult?.position || targetPosition

    return {
      snapResult,
      finalPosition,
      isValidPosition: true // Will be set by validatePosition
    }
  }

  validatePosition(_finalPosition: Vec2, _context: MovementContext): boolean {
    // Polygon translation is always valid (preserves shape)
    return true
  }

  generatePreview(movementState: MovementState, context: MovementContext): React.ReactNode[] {
    const entity = this.getEntity(context)
    if (!entity) return []

    const offset = subtract(movementState.finalPosition, context.startPosition)
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

  commitMovement(finalPosition: Vec2, context: MovementContext): boolean {
    const offset = subtract(finalPosition, context.startPosition)
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
