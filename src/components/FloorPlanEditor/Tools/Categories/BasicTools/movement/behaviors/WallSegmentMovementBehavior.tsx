import type { MovementBehavior, MovementContext, MouseMovementState } from '../MovementBehavior'
import type { SelectableId } from '@/types/ids'
import type { StoreActions } from '@/model/store/types'
import type { OuterWallSegment, OuterWallPolygon } from '@/types/model'
import { add, dot, scale, midpoint, type Vec2 } from '@/types/geometry'
import { wouldClosingPolygonSelfIntersect } from '@/types/geometry/polygon'
import { isOuterWallId, isWallSegmentId } from '@/types/ids'
import React from 'react'
import { Group, Line, Circle } from 'react-konva'
import { COLORS } from '@/theme/colors'

// Wall segment movement needs access to the wall to update the boundary
interface WallSegmentEntityContext {
  wall: OuterWallPolygon
  segment: OuterWallSegment
  segmentIndex: number // Index of the segment in the wall
}

// Wall segment movement state - just the projected delta along perpendicular
interface WallSegmentMovementState {
  projectedDelta: Vec2
  newBoundary: Vec2[]
}

export class WallSegmentMovementBehavior
  implements MovementBehavior<WallSegmentEntityContext, WallSegmentMovementState>
{
  getEntity(entityId: SelectableId, parentIds: SelectableId[], store: StoreActions): WallSegmentEntityContext {
    const [wallId] = parentIds

    if (!isOuterWallId(wallId) || !isWallSegmentId(entityId)) {
      throw new Error(`Invalid entity context for segment ${entityId}`)
    }

    const wall = store.getOuterWallById(wallId)
    const segment = store.getSegmentById(wallId, entityId)

    if (!wall || !segment) {
      throw new Error(`Could not find wall or segment ${entityId}`)
    }

    // Find which segment index this is
    const segmentIndex = wall.segments.findIndex(s => s.id === segment.id)
    if (segmentIndex === -1) {
      throw new Error(`Could not find segment index for ${entityId}`)
    }

    return { wall, segment, segmentIndex }
  }

  initializeState(
    mouseState: MouseMovementState,
    context: MovementContext<WallSegmentEntityContext>
  ): WallSegmentMovementState {
    const { wall, segment, segmentIndex } = context.entity
    const projectedDistance = dot(mouseState.delta, segment.outsideDirection)
    const projectedDelta = scale(segment.outsideDirection, projectedDistance)

    const newBoundary = [...wall.boundary]
    newBoundary[segmentIndex] = add(wall.boundary[segmentIndex], projectedDelta)
    newBoundary[(segmentIndex + 1) % wall.boundary.length] = add(
      wall.boundary[(segmentIndex + 1) % wall.boundary.length],
      projectedDelta
    )
    return { projectedDelta, newBoundary }
  }

  constrainAndSnap(
    mouseState: MouseMovementState,
    context: MovementContext<WallSegmentEntityContext>
  ): WallSegmentMovementState {
    const { wall, segment, segmentIndex } = context.entity
    const projectedDistance = dot(mouseState.delta, segment.outsideDirection)
    const projectedDelta = scale(segment.outsideDirection, projectedDistance)

    const newBoundary = [...wall.boundary]
    newBoundary[segmentIndex] = add(wall.boundary[segmentIndex], projectedDelta)
    newBoundary[(segmentIndex + 1) % wall.boundary.length] = add(
      wall.boundary[(segmentIndex + 1) % wall.boundary.length],
      projectedDelta
    )
    return { projectedDelta, newBoundary }
  }

  validatePosition(
    movementState: WallSegmentMovementState,
    _context: MovementContext<WallSegmentEntityContext>
  ): boolean {
    return !wouldClosingPolygonSelfIntersect(movementState.newBoundary)
  }

  generatePreview(
    movementState: WallSegmentMovementState,
    isValid: boolean,
    context: MovementContext<WallSegmentEntityContext>
  ): React.ReactNode[] {
    const { segment } = context.entity
    const { projectedDelta, newBoundary } = movementState

    // Calculate original and new midpoints for visualization
    const originalMidpoint = midpoint(segment.insideLine.start, segment.insideLine.end)
    const newMidpoint = add(originalMidpoint, projectedDelta)

    return [
      <Group key="segment-preview">
        {/* Show the new segment midpoint */}
        <Circle
          key="new-midpoint"
          x={newMidpoint[0]}
          y={newMidpoint[1]}
          radius={20}
          fill={isValid ? COLORS.ui.success : COLORS.ui.danger}
          stroke={COLORS.ui.white}
          strokeWidth={2}
          opacity={0.8}
          listening={false}
        />
        {/* Show movement line */}
        <Line
          key="movement-line"
          points={[originalMidpoint[0], originalMidpoint[1], newMidpoint[0], newMidpoint[1]]}
          stroke={COLORS.ui.gray600}
          strokeWidth={10}
          dash={[50, 50]}
          opacity={0.7}
          listening={false}
        />
        {/* Show the updated wall boundary preview */}
        <Line
          key="wall-boundary-preview"
          points={newBoundary.flatMap(p => [p[0], p[1]])}
          closed
          stroke={isValid ? COLORS.ui.primary : COLORS.ui.danger}
          strokeWidth={10}
          dash={[80, 40]}
          opacity={0.6}
          listening={false}
        />
      </Group>
    ]
  }

  commitMovement(movementState: WallSegmentMovementState, context: MovementContext<WallSegmentEntityContext>): boolean {
    return context.store.updateOuterWallBoundary(context.entity.wall.id, movementState.newBoundary)
  }
}
