import type { MovementBehavior, MovementContext, MouseMovementState } from '../MovementBehavior'
import type { SelectableId } from '@/types/ids'
import type { StoreActions } from '@/model/store/types'
import type { OuterCorner, OuterWallPolygon } from '@/types/model'
import type { Vec2 } from '@/types/geometry'
import type { SnapResult } from '@/model/store/services/snapping/types'
import { add } from '@/types/geometry'
import { isOuterWallId, isOuterCornerId } from '@/types/ids'
import React from 'react'
import { Group, Circle, Line } from 'react-konva'
import { COLORS } from '@/theme/colors'

// Corner movement needs access to the wall to update the boundary
interface CornerEntityContext {
  wall: OuterWallPolygon
  corner: OuterCorner
  cornerIndex: number // Index of the boundary point that corresponds to this corner
  // TODO: Add snap context here so that it only needs to be constructed once
}

// Corner movement state
export interface CornerMovementState {
  position: Vec2
  snapResult?: SnapResult
}

export class OuterCornerMovementBehavior implements MovementBehavior<CornerEntityContext, CornerMovementState> {
  getEntity(entityId: SelectableId, parentIds: SelectableId[], store: StoreActions): CornerEntityContext {
    const [wallId] = parentIds

    if (!isOuterWallId(wallId) || !isOuterCornerId(entityId)) {
      throw new Error(`Invalid entity context for corner ${entityId}`)
    }

    const wall = store.getOuterWallById(wallId)
    const corner = store.getCornerById(wallId, entityId)

    if (!wall || !corner) {
      throw new Error(`Could not find wall or corner ${entityId}`)
    }

    // Find which boundary point corresponds to this corner
    const cornerIndex = wall.corners.findIndex(c => c.id === corner.id)
    if (cornerIndex === -1) {
      throw new Error(`Could not find corner index for ${entityId}`)
    }

    return { wall, corner, cornerIndex }
  }

  initializeState(_mouseState: MouseMovementState, context: MovementContext<CornerEntityContext>): CornerMovementState {
    const boundaryPoint = context.entity.wall.boundary[context.entity.cornerIndex]

    return {
      position: boundaryPoint
    }
  }

  constrainAndSnap(mouseState: MouseMovementState, context: MovementContext<CornerEntityContext>): CornerMovementState {
    const originalPosition = context.entity.wall.boundary[context.entity.cornerIndex]
    const newPosition = add(originalPosition, mouseState.delta)

    // TODO: Add snapping to other corners/grid
    const snapResult = context.snappingService.findSnapResult(newPosition, {
      snapPoints: [],
      referenceLineSegments: [],
      referencePoint: originalPosition
    })

    const finalPosition = snapResult?.position || newPosition

    return {
      position: finalPosition,
      snapResult: snapResult ?? undefined
    }
  }

  validatePosition(movementState: CornerMovementState, context: MovementContext<CornerEntityContext>): boolean {
    const { wall, cornerIndex } = context.entity

    // Create new boundary with the moved corner
    const newBoundary = [...wall.boundary]
    newBoundary[cornerIndex] = movementState.position

    // Check minimum boundary size
    if (newBoundary.length < 3) return false

    // TODO: Add more validation like self-intersection check
    // For now, just check that the new position is different
    const originalPosition = wall.boundary[cornerIndex]
    return movementState.position[0] !== originalPosition[0] || movementState.position[1] !== originalPosition[1]
  }

  generatePreview(
    movementState: CornerMovementState,
    isValid: boolean,
    context: MovementContext<CornerEntityContext>
  ): React.ReactNode[] {
    const { wall, cornerIndex } = context.entity
    const originalPosition = wall.boundary[cornerIndex]

    return [
      <Group key="corner-preview">
        {/* Show the new corner position */}
        <Circle
          key="new-corner"
          x={movementState.position[0]}
          y={movementState.position[1]}
          radius={30}
          fill={isValid ? COLORS.ui.success : COLORS.ui.danger}
          stroke={COLORS.ui.white}
          strokeWidth={5}
          opacity={0.8}
          listening={false}
        />
        {/* Show movement line */}
        <Line
          key="movement-line"
          points={[originalPosition[0], originalPosition[1], movementState.position[0], movementState.position[1]]}
          stroke={COLORS.ui.gray600}
          strokeWidth={10}
          dash={[50, 50]}
          opacity={0.7}
          listening={false}
        />
        {/* Show the updated wall boundary preview */}
        {this.generateWallBoundaryPreview(movementState, isValid, context)}
      </Group>
    ]
  }

  private generateWallBoundaryPreview(
    movementState: CornerMovementState,
    isValid: boolean,
    context: MovementContext<CornerEntityContext>
  ): React.ReactNode {
    const { wall, cornerIndex } = context.entity

    // Create new boundary with the moved corner
    const newBoundary = [...wall.boundary]
    newBoundary[cornerIndex] = movementState.position

    return (
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
    )
  }

  commitMovement(movementState: CornerMovementState, context: MovementContext<CornerEntityContext>): boolean {
    const { wall, cornerIndex } = context.entity

    // Create new boundary with the moved corner
    const newBoundary = [...wall.boundary]
    newBoundary[cornerIndex] = movementState.position

    // Use the store's updateOuterWallBoundary method
    return context.store.updateOuterWallBoundary(wall.id, newBoundary)
  }
}
