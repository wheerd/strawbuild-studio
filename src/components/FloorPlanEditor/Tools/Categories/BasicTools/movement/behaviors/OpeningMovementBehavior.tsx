import type { MovementBehavior, MovementContext, MovementState } from '../MovementBehavior'
import type { SelectableId } from '@/types/ids'
import type { StoreActions } from '@/model/store/types'
import type { Opening, OuterWallSegment } from '@/types/model'
import type { OuterWallId, WallSegmentId, OpeningId } from '@/types/ids'
import type { Vec2, Length } from '@/types/geometry'
import { add, dot, scale, distance } from '@/types/geometry'
import { isOuterWallId, isWallSegmentId, isOpeningId } from '@/types/ids'
import React from 'react'
import { Group, Line } from 'react-konva'
import { COLORS } from '@/theme/colors'

export class OpeningMovementBehavior implements MovementBehavior {
  getEntityPosition(entityId: SelectableId, parentIds: SelectableId[], store: StoreActions): Vec2 {
    const parentWallId = parentIds.find(id => isOuterWallId(id as string)) as OuterWallId
    const parentSegmentId = parentIds.find(id => isWallSegmentId(id as string)) as WallSegmentId

    if (!parentWallId || !parentSegmentId || !isOpeningId(entityId as string)) {
      return [0, 0]
    }

    const opening = store.getOpeningById(parentWallId, parentSegmentId, entityId as OpeningId)
    const segment = store.getSegmentById(parentWallId, parentSegmentId)

    if (!opening || !segment) return [0, 0]

    // Calculate opening position based on its offset along the segment
    const segmentStart = segment.insideLine.start
    return add(segmentStart, scale(segment.direction, opening.offsetFromStart))
  }

  constrainAndSnap(movementState: MovementState, context: MovementContext): MovementState {
    const segment = this.getParentSegment(context)
    if (!segment) {
      return {
        ...movementState,
        finalEntityPosition: movementState.initialEntityPosition,
        snapResult: null,
        isValidPosition: false
      }
    }

    // Constrain to segment direction only - project the mouse delta onto segment direction
    const segmentDirection = segment.direction
    const projectedDistance = dot(movementState.mouseDelta, segmentDirection)
    const constrainedEntityPosition = add(
      movementState.initialEntityPosition,
      scale(segmentDirection, projectedDistance)
    )

    return {
      ...movementState,
      finalEntityPosition: constrainedEntityPosition,
      snapResult: {
        position: constrainedEntityPosition,
        lines: [{ point: constrainedEntityPosition, direction: segment.direction }]
      },
      isValidPosition: true // Will be set by validatePosition
    }
  }

  validatePosition(movementState: MovementState, context: MovementContext): boolean {
    const opening = this.getEntity(context)
    const segment = this.getParentSegment(context)
    if (!opening || !segment) return false

    // Calculate new offset along segment
    const segmentStart = segment.insideLine.start
    const newOffset = distance(segmentStart, movementState.finalEntityPosition) as Length

    // Use existing validation from store
    const parentWallId = this.getParentWallId(context)
    const parentSegmentId = this.getParentSegmentId(context)

    if (!parentWallId || !parentSegmentId) return false

    return context.store.isOpeningPlacementValid(parentWallId, parentSegmentId, newOffset, opening.width)
  }

  generatePreview(movementState: MovementState, context: MovementContext): React.ReactNode[] {
    const opening = this.getEntity(context)
    const segment = this.getParentSegment(context)
    if (!opening || !segment) return []

    // Calculate the opening rectangle in new position
    const segmentStart = segment.insideLine.start
    const outsideDirection = segment.outsideDirection

    // Calculate new offset along segment
    const newOffset = distance(segmentStart, movementState.finalEntityPosition)
    const openingStart = add(segmentStart, scale(segment.direction, newOffset))
    const openingEnd = add(openingStart, scale(segment.direction, opening.width))

    // Create opening rectangle
    const insideStart = openingStart
    const insideEnd = openingEnd
    const outsideStart = add(openingStart, scale(outsideDirection, segment.thickness))
    const outsideEnd = add(openingEnd, scale(outsideDirection, segment.thickness))

    return [
      <Group key="opening-preview">
        {/* Show opening rectangle */}
        <Line
          key="opening-rectangle"
          points={[insideStart, insideEnd, outsideEnd, outsideStart].flatMap(p => [p[0], p[1]])}
          closed
          fill={movementState.isValidPosition ? COLORS.ui.success : COLORS.ui.danger}
          stroke={COLORS.ui.white}
          strokeWidth={5}
          opacity={0.6}
          listening={false}
        />
        {/* Show movement indicator */}
        <Line
          key="movement-line"
          points={[
            movementState.initialEntityPosition[0],
            movementState.initialEntityPosition[1],
            movementState.finalEntityPosition[0],
            movementState.finalEntityPosition[1]
          ]}
          stroke={COLORS.ui.gray600}
          strokeWidth={10}
          dash={[20, 20]}
          opacity={0.7}
          listening={false}
        />
      </Group>
    ]
  }

  commitMovement(movementState: MovementState, context: MovementContext): boolean {
    const opening = this.getEntity(context)
    const segment = this.getParentSegment(context)
    if (!opening || !segment) return false

    // Calculate new offset
    const segmentStart = segment.insideLine.start
    const newOffset = distance(segmentStart, movementState.finalEntityPosition) as Length

    // Update opening position
    const parentWallId = this.getParentWallId(context)
    const parentSegmentId = this.getParentSegmentId(context)

    if (!parentWallId || !parentSegmentId) return false

    context.store.updateOpening(parentWallId, parentSegmentId, opening.id, {
      offsetFromStart: newOffset
    })

    return true
  }

  private getEntity(context: MovementContext): Opening | null {
    const parentWallId = this.getParentWallId(context)
    const parentSegmentId = this.getParentSegmentId(context)

    if (!parentWallId || !parentSegmentId || !isOpeningId(context.entityId as string)) return null

    return context.store.getOpeningById(parentWallId, parentSegmentId, context.entityId as OpeningId)
  }

  private getParentSegment(context: MovementContext): OuterWallSegment | null {
    const parentWallId = this.getParentWallId(context)
    const parentSegmentId = this.getParentSegmentId(context)

    if (!parentWallId || !parentSegmentId) return null

    return context.store.getSegmentById(parentWallId, parentSegmentId)
  }

  private getParentWallId(context: MovementContext): OuterWallId | null {
    const parentWallId = context.parentIds.find(id => isOuterWallId(id as string))
    return parentWallId ? (parentWallId as OuterWallId) : null
  }

  private getParentSegmentId(context: MovementContext): WallSegmentId | null {
    const parentSegmentId = context.parentIds.find(id => isWallSegmentId(id as string))
    return parentSegmentId ? (parentSegmentId as WallSegmentId) : null
  }
}
