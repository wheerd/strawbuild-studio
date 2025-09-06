import type { MovementBehavior, MovementContext, MouseMovementState } from '../MovementBehavior'
import type { SelectableId } from '@/types/ids'
import type { StoreActions } from '@/model/store/types'
import type { Opening, OuterWallSegment, OuterWallPolygon } from '@/types/model'
import type { Length } from '@/types/geometry'
import { add, dot, scale, distance, createLength } from '@/types/geometry'
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
  originalOffset: Length
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
      originalOffset: opening.offsetFromStart, // TODO: I guess this is not needed because opening can be accessed directly
      newOffset: opening.offsetFromStart
    }
  }

  constrainAndSnap(
    mouseState: MouseMovementState,
    context: MovementContext<OpeningEntityContext>
  ): OpeningMovementState {
    const { segment } = context.entity

    // Constrain to segment direction only - project the mouse delta onto segment direction
    const segmentDirection = segment.direction
    const projectedDistance = dot(mouseState.delta, segmentDirection)

    // Calculate new offset along segment
    const segmentStart = segment.insideLine.start
    const currentPosition = add(segmentStart, scale(segment.direction, context.entity.opening.offsetFromStart))
    const newPosition = add(currentPosition, scale(segmentDirection, projectedDistance))
    // TODO: This causes weird behavior, because it doesn't become negative if newPosition is before the start
    const newOffset = distance(segmentStart, newPosition)

    // TODO: Use findNearestValidOpeningPosition to snap to nearby valid position
    //       See the add opening tool on how to do it
    return {
      originalOffset: context.entity.opening.offsetFromStart,
      newOffset: createLength(Math.max(0, newOffset)) // Ensure non-negative offset
    }
  }

  validatePosition(movementState: OpeningMovementState, context: MovementContext<OpeningEntityContext>): boolean {
    const { wall, segment, opening } = context.entity

    // Use existing validation from store
    // TODO: Validation should allow to exclude the opening's id from the validation (otherwise it blocks itself)
    return context.store.isOpeningPlacementValid(wall.id, segment.id, movementState.newOffset, opening.width)
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

    // Original position for movement indicator
    const originalStart = add(segmentStart, scale(segment.direction, movementState.originalOffset))

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
