import type { MovementBehavior, MovementContext, MouseMovementState } from '../MovementBehavior'
import type { SelectableId } from '@/types/ids'
import type { StoreActions } from '@/model/store/types'
import type { OuterCorner, OuterWallPolygon } from '@/types/model'
import type { LineSegment2D, Vec2 } from '@/types/geometry'
import type { SnappingContext, SnapResult } from '@/model/store/services/snapping/types'
import { add, wouldClosingPolygonSelfIntersect } from '@/types/geometry'
import { isOuterWallId, isOuterCornerId } from '@/types/ids'
import React from 'react'
import { Group, Circle, Line } from 'react-konva'
import { COLORS } from '@/theme/colors'

// Corner movement needs access to the wall to update the boundary
interface CornerEntityContext {
  wall: OuterWallPolygon
  corner: OuterCorner
  cornerIndex: number // Index of the boundary point that corresponds to this corner
  snapContext: SnappingContext
}

// Corner movement state
export interface CornerMovementState {
  position: Vec2
  snapResult?: SnapResult
  newBoundary: Vec2[]
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

    const snapLines = this.getSnapLines(wall, cornerIndex)
    const snapContext: SnappingContext = {
      snapPoints: [wall.boundary[cornerIndex]],
      alignPoints: wall.boundary,
      referenceLineSegments: snapLines
    }

    return { wall, corner, cornerIndex, snapContext }
  }

  initializeState(_mouseState: MouseMovementState, context: MovementContext<CornerEntityContext>): CornerMovementState {
    const { wall, cornerIndex } = context.entity
    const boundaryPoint = wall.boundary[cornerIndex]
    const newBoundary = [...wall.boundary]

    return {
      position: boundaryPoint,
      newBoundary
    }
  }

  constrainAndSnap(mouseState: MouseMovementState, context: MovementContext<CornerEntityContext>): CornerMovementState {
    const { wall, cornerIndex, snapContext } = context.entity

    const originalPosition = wall.boundary[cornerIndex]
    const newPosition = add(originalPosition, mouseState.delta)

    const snapResult = context.snappingService.findSnapResult(newPosition, snapContext)
    const finalPosition = snapResult?.position || newPosition

    const newBoundary = [...wall.boundary]
    newBoundary[cornerIndex] = finalPosition

    return {
      position: finalPosition,
      snapResult: snapResult ?? undefined,
      newBoundary
    }
  }

  validatePosition(movementState: CornerMovementState, _context: MovementContext<CornerEntityContext>): boolean {
    const { newBoundary } = movementState

    if (newBoundary.length < 3) return false

    return !wouldClosingPolygonSelfIntersect(newBoundary)
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
        <Line
          key="wall-boundary-preview"
          points={movementState.newBoundary.flatMap(p => [p[0], p[1]])}
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

  commitMovement(movementState: CornerMovementState, context: MovementContext<CornerEntityContext>): boolean {
    return context.store.updateOuterWallBoundary(context.entity.wall.id, movementState.newBoundary)
  }

  private getSnapLines(wall: OuterWallPolygon, cornerIndex: number): Array<LineSegment2D> {
    const snapLines: Array<LineSegment2D> = []

    for (let i = 0; i < wall.boundary.length; i++) {
      const nextIndex = (i + 1) % wall.boundary.length
      if (i === cornerIndex || nextIndex === cornerIndex) continue
      const start = wall.boundary[i]
      const end = wall.boundary[nextIndex]
      snapLines.push({ start, end })
    }

    return snapLines
  }
}
