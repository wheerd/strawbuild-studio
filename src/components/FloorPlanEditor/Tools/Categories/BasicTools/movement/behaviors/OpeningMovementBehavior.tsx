import type { MovementBehavior, MovementContext, MouseMovementState } from '../MovementBehavior'
import type { SelectableId } from '@/types/ids'
import type { StoreActions } from '@/model/store/types'
import type { Opening, OuterWallSegment, OuterWallPolygon } from '@/types/model'
import type { Length } from '@/types/geometry'
import { add, dot, scale, createLength, subtract } from '@/types/geometry'
import { isOuterWallId, isWallSegmentId, isOpeningId } from '@/types/ids'
import React from 'react'
import { Group, Line } from 'react-konva'
import { COLORS } from '@/theme/colors'

// Opening movement needs access to the wall, segment, and opening
export interface OpeningEntityContext {
  wall: OuterWallPolygon
  segment: OuterWallSegment
  opening: Opening
}

// Opening movement state tracks offset changes along the segment
export interface OpeningMovementState {
  newOffset: Length
}

export class OpeningMovementBehavior implements MovementBehavior<OpeningEntityContext, OpeningMovementState> {
  getEntity(entityId: SelectableId, parentIds: SelectableId[], store: StoreActions): OpeningEntityContext {
    const [wallId, segmentId] = parentIds

    if (!isOuterWallId(wallId) || !isWallSegmentId(segmentId) || !isOpeningId(entityId)) {
      throw new Error(`Invalid entity context for opening ${entityId}`)
    }

    const wall = store.getOuterWallById(wallId)
    const segment = store.getSegmentById(wallId, segmentId)
    const opening = store.getOpeningById(wallId, segmentId, entityId)

    if (!wall || !segment || !opening) {
      throw new Error(`Could not find required entities for opening ${entityId}`)
    }

    return { wall, segment, opening }
  }

  initializeState(
    _mouseState: MouseMovementState,
    context: MovementContext<OpeningEntityContext>
  ): OpeningMovementState {
    const { opening } = context.entity
    return {
      newOffset: opening.offsetFromStart
    }
  }

  constrainAndSnap(
    mouseState: MouseMovementState,
    context: MovementContext<OpeningEntityContext>
  ): OpeningMovementState {
    const { segment, opening, wall } = context.entity

    // Constrain to segment direction only - project the mouse delta onto segment direction
    const segmentDirection = segment.direction
    const projectedDistance = dot(mouseState.delta, segmentDirection)

    // Calculate new offset along segment (can be negative)
    const segmentStart = segment.insideLine.start
    const currentPosition = add(segmentStart, scale(segment.direction, opening.offsetFromStart))
    const newPosition = add(currentPosition, scale(segmentDirection, projectedDistance))

    // Use proper signed distance calculation to handle negative offsets
    const deltaFromStart = subtract(newPosition, segmentStart)
    const signedOffset = dot(deltaFromStart, segmentDirection)

    // Try to snap to nearest valid position
    const snappedOffset = context.store.findNearestValidOpeningPosition(
      wall.id,
      segment.id,
      createLength(signedOffset),
      opening.width,
      opening.id
    )

    // Use snapped position if available and within reasonable distance
    const maxSnapDistance = opening.width * 0.4
    const finalOffset =
      snappedOffset !== null && Math.abs(snappedOffset - signedOffset) <= maxSnapDistance
        ? snappedOffset
        : createLength(Math.max(0, signedOffset)) // Clamp to non-negative only if no snap

    return {
      newOffset: finalOffset
    }
  }

  validatePosition(movementState: OpeningMovementState, context: MovementContext<OpeningEntityContext>): boolean {
    const { wall, segment, opening } = context.entity
    return context.store.isOpeningPlacementValid(
      wall.id,
      segment.id,
      movementState.newOffset,
      opening.width,
      opening.id
    )
  }

  generatePreview(
    movementState: OpeningMovementState,
    isValid: boolean,
    context: MovementContext<OpeningEntityContext>
  ): React.ReactNode[] {
    const { segment, opening } = context.entity

    // Calculate the opening rectangle in new position
    const segmentStart = segment.insideLine.start
    const outsideDirection = segment.outsideDirection

    const openingStart = add(segmentStart, scale(segment.direction, movementState.newOffset))
    const openingEnd = add(openingStart, scale(segment.direction, opening.width))

    // Create opening rectangle
    const insideStart = openingStart
    const insideEnd = openingEnd
    const outsideStart = add(openingStart, scale(outsideDirection, segment.thickness))
    const outsideEnd = add(openingEnd, scale(outsideDirection, segment.thickness))

    // Original position for movement indicator (access directly from entity)
    const originalStart = add(segmentStart, scale(segment.direction, opening.offsetFromStart))

    return [
      <Group key="opening-preview">
        {/* Show opening rectangle */}
        <Line
          key="opening-rectangle"
          points={[insideStart, insideEnd, outsideEnd, outsideStart].flatMap(p => [p[0], p[1]])}
          closed
          fill={isValid ? COLORS.ui.success : COLORS.ui.danger}
          stroke={COLORS.ui.white}
          strokeWidth={5}
          opacity={0.6}
          listening={false}
        />
        {/* Show movement indicator */}
        <Line
          key="movement-line"
          points={[originalStart[0], originalStart[1], openingStart[0], openingStart[1]]}
          stroke={COLORS.ui.gray600}
          strokeWidth={10}
          dash={[20, 20]}
          opacity={0.7}
          listening={false}
        />
      </Group>
    ]
  }

  commitMovement(movementState: OpeningMovementState, context: MovementContext<OpeningEntityContext>): boolean {
    const { wall, segment, opening } = context.entity

    // Update opening position
    context.store.updateOpening(wall.id, segment.id, opening.id, {
      offsetFromStart: movementState.newOffset
    })

    return true
  }
}
