import type { MovementBehavior, MovementContext, MovementState } from '../MovementBehavior'
import type { Opening, OuterWallSegment } from '@/types/model'
import type { OuterWallId, WallSegmentId, OpeningId } from '@/types/ids'
import type { Vec2, Length } from '@/types/geometry'
import { subtract, add, dot, scale, distance } from '@/types/geometry'
import { isOuterWallId, isWallSegmentId, isOpeningId } from '@/types/ids'
import React from 'react'
import { Group, Line } from 'react-konva'
import { COLORS } from '@/theme/colors'

export class OpeningMovementBehavior implements MovementBehavior {
  constrainAndSnap(targetPosition: Vec2, context: MovementContext): MovementState {
    const segment = this.getParentSegment(context)
    if (!segment) {
      return {
        snapResult: null,
        finalPosition: targetPosition,
        isValidPosition: false
      }
    }

    // Constrain to segment direction only
    const segmentDirection = segment.direction
    const startToTarget = subtract(targetPosition, context.startPosition)
    const projectedDistance = dot(startToTarget, segmentDirection)
    const constrainedPosition = add(context.startPosition, scale(segmentDirection, projectedDistance))

    return {
      snapResult: null,
      finalPosition: constrainedPosition,
      isValidPosition: true // Will be set by validatePosition
    }
  }

  validatePosition(finalPosition: Vec2, context: MovementContext): boolean {
    const opening = this.getEntity(context)
    const segment = this.getParentSegment(context)
    if (!opening || !segment) return false

    // Calculate new offset along segment
    const segmentStart = segment.insideLine.start
    const newOffset = distance(segmentStart, finalPosition) as Length

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
    const segmentEnd = segment.insideLine.end
    const segmentDirection = segment.direction
    const outsideDirection = segment.outsideDirection

    // Calculate new offset along segment
    const newOffset = distance(segmentStart, movementState.finalPosition)
    const openingStart = add(segmentStart, scale(segmentDirection, newOffset))
    const openingEnd = add(openingStart, scale(segmentDirection, opening.width))

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
          strokeWidth={3}
          opacity={0.6}
          listening={false}
        />
        {/* Show constraint line along segment */}
        <Line
          key="constraint-line"
          points={[segmentStart[0], segmentStart[1], segmentEnd[0], segmentEnd[1]]}
          stroke={COLORS.ui.gray500}
          strokeWidth={1}
          dash={[2, 2]}
          opacity={0.7}
          listening={false}
        />
        {/* Show movement indicator */}
        <Line
          key="movement-line"
          points={[
            context.startPosition[0],
            context.startPosition[1],
            movementState.finalPosition[0],
            movementState.finalPosition[1]
          ]}
          stroke={COLORS.ui.gray600}
          strokeWidth={1}
          dash={[2, 2]}
          opacity={0.7}
          listening={false}
        />
        {/* Show constraint line along segment */}
        <Line
          key="constraint-line"
          points={[segmentStart[0], segmentStart[1], segmentEnd[0], segmentEnd[1]]}
          stroke="gray"
          strokeWidth={1}
          dash={[2, 2]}
          opacity={0.5}
          listening={false}
        />
        {/* Show movement indicator */}
        <Line
          key="movement-line"
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
    const opening = this.getEntity(context)
    const segment = this.getParentSegment(context)
    if (!opening || !segment) return false

    // Calculate new offset
    const segmentStart = segment.insideLine.start
    const newOffset = distance(segmentStart, finalPosition) as Length

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
