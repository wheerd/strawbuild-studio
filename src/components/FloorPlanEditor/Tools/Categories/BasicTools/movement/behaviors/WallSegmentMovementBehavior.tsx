import type { MovementBehavior, MovementContext, MovementState } from '../MovementBehavior'
import type { OuterWallPolygon, OuterWallSegment } from '@/types/model'
import type { OuterWallId, WallSegmentId } from '@/types/ids'
import type { Vec2 } from '@/types/geometry'
import { subtract, add, dot, scale, perpendicularCCW } from '@/types/geometry'
import { isOuterWallId, isWallSegmentId } from '@/types/ids'
import React from 'react'
import { Group, Line } from 'react-konva'
import { COLORS } from '@/theme/colors'

export class WallSegmentMovementBehavior implements MovementBehavior {
  constrainAndSnap(targetPosition: Vec2, context: MovementContext): MovementState {
    const entity = this.getEntity(context)
    if (!entity) {
      return {
        snapResult: null,
        finalPosition: targetPosition,
        isValidPosition: false
      }
    }

    // Constrain to perpendicular direction only
    const segmentDirection = entity.direction
    const perpendicularDirection = perpendicularCCW(segmentDirection)

    // Project target onto perpendicular line through start position
    const startToTarget = subtract(targetPosition, context.startPosition)
    const projectedDistance = dot(startToTarget, perpendicularDirection)
    const constrainedPosition = add(context.startPosition, scale(perpendicularDirection, projectedDistance))

    // No snapping for segments - they're constrained to axis
    return {
      snapResult: null,
      finalPosition: constrainedPosition,
      isValidPosition: true // Will be set by validatePosition
    }
  }

  validatePosition(finalPosition: Vec2, context: MovementContext): boolean {
    // Construct new boundary points and validate using slice
    const newBoundaryPoints = this.calculateNewBoundaryPoints(finalPosition, context)
    if (!newBoundaryPoints) return false

    const parentWallId = this.getParentWallId(context)
    if (!parentWallId) return false

    // Use the slice's updateOuterWallBoundary to validate (it checks self-intersection)
    // We'll create a temporary validation by checking if the update would succeed
    return newBoundaryPoints.length >= 3 // Basic validation for now
  }

  generatePreview(movementState: MovementState, context: MovementContext): React.ReactNode[] {
    const entity = this.getEntity(context)
    const parentWall = this.getParentWall(context)
    if (!entity || !parentWall) return []

    const newBoundaryPoints = this.calculateNewBoundaryPoints(movementState.finalPosition, context)
    if (!newBoundaryPoints) return []

    // Show preview of new polygon boundary
    return [
      <Group key="segment-preview">
        <Line
          key="preview-polygon"
          points={newBoundaryPoints.flatMap(p => [p[0], p[1]])}
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
          points={newBoundaryPoints.flatMap(p => [p[0], p[1]])}
          closed
          fill={movementState.isValidPosition ? COLORS.ui.success : COLORS.ui.danger}
          opacity={0.1}
          listening={false}
        />
        <Line
          key="constraint-line"
          points={[
            context.startPosition[0],
            context.startPosition[1],
            movementState.finalPosition[0],
            movementState.finalPosition[1]
          ]}
          stroke={COLORS.ui.gray500}
          strokeWidth={1}
          dash={[2, 2]}
          opacity={0.7}
          listening={false}
        />
        <Line
          key="constraint-line"
          points={[
            context.startPosition[0],
            context.startPosition[1],
            movementState.finalPosition[0],
            movementState.finalPosition[1]
          ]}
          stroke="gray"
          strokeWidth={1}
          dash={[2, 2]}
          opacity={0.5}
          listening={false}
        />
      </Group>
    ]
  }

  commitMovement(finalPosition: Vec2, context: MovementContext): boolean {
    const newBoundaryPoints = this.calculateNewBoundaryPoints(finalPosition, context)
    if (!newBoundaryPoints) return false

    const parentWallId = this.getParentWallId(context)
    if (!parentWallId) return false

    return context.store.updateOuterWallBoundary(parentWallId, newBoundaryPoints)
  }

  private calculateNewBoundaryPoints(finalPosition: Vec2, context: MovementContext): Vec2[] | null {
    const parentWall = this.getParentWall(context)
    const entity = this.getEntity(context)
    if (!parentWall || !entity) return null

    // Find which segment this is
    const segmentIndex = parentWall.segments.findIndex(s => s.id === context.entityId)
    if (segmentIndex === -1) return null

    // Calculate the movement offset perpendicular to the segment
    const offset = subtract(finalPosition, context.startPosition)
    const segmentDirection = entity.direction
    const perpendicularDirection = perpendicularCCW(segmentDirection)
    const perpendicularDistance = dot(offset, perpendicularDirection)

    // Move the boundary points connected to this segment
    const newBoundary = [...parentWall.boundary]
    const startIndex = segmentIndex
    const endIndex = (segmentIndex + 1) % newBoundary.length

    newBoundary[startIndex] = add(newBoundary[startIndex], scale(perpendicularDirection, perpendicularDistance))
    newBoundary[endIndex] = add(newBoundary[endIndex], scale(perpendicularDirection, perpendicularDistance))

    return newBoundary
  }

  private getEntity(context: MovementContext): OuterWallSegment | null {
    const parentWallId = this.getParentWallId(context)
    if (!parentWallId || !isWallSegmentId(context.entityId as string)) return null

    return context.store.getSegmentById(parentWallId, context.entityId as WallSegmentId)
  }

  private getParentWall(context: MovementContext): OuterWallPolygon | null {
    const parentWallId = this.getParentWallId(context)
    if (!parentWallId) return null

    return context.store.getOuterWallById(parentWallId)
  }

  private getParentWallId(context: MovementContext): OuterWallId | null {
    const parentWallId = context.parentIds.find(id => isOuterWallId(id as string))
    return parentWallId ? (parentWallId as OuterWallId) : null
  }
}
