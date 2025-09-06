import type { MovementBehavior, MovementContext, MovementState } from '../MovementBehavior'
import type { OuterWallPolygon } from '@/types/model'
import type { OuterWallId } from '@/types/ids'
import type { Vec2, LineSegment2D } from '@/types/geometry'
import { isOuterWallId } from '@/types/ids'
import React from 'react'
import { Group, Line, Circle } from 'react-konva'
import { COLORS } from '@/theme/colors'

export class OuterCornerMovementBehavior implements MovementBehavior {
  constrainAndSnap(targetPosition: Vec2, context: MovementContext): MovementState {
    // Get snap points and lines from other polygons for corner snapping
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

  validatePosition(finalPosition: Vec2, context: MovementContext): boolean {
    // Construct new boundary with moved corner and validate
    const newBoundaryPoints = this.calculateNewBoundaryPoints(finalPosition, context)
    if (!newBoundaryPoints) return false

    const parentWallId = this.getParentWallId(context)
    if (!parentWallId) return false

    // The slice's updateOuterWallBoundary will validate for self-intersection
    return newBoundaryPoints.length >= 3 // Basic validation for now
  }

  generatePreview(movementState: MovementState, context: MovementContext): React.ReactNode[] {
    const parentWall = this.getParentWall(context)
    if (!parentWall) return []

    const newBoundaryPoints = this.calculateNewBoundaryPoints(movementState.finalPosition, context)
    if (!newBoundaryPoints) return []

    return [
      <Group key="corner-preview">
        {/* Show preview of new polygon boundary */}
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
        {/* Highlight the moved corner */}
        <Circle
          key="moved-corner"
          x={movementState.finalPosition[0]}
          y={movementState.finalPosition[1]}
          radius={8}
          fill={movementState.isValidPosition ? COLORS.selection.primary : COLORS.ui.danger}
          stroke={COLORS.ui.white}
          strokeWidth={2}
          opacity={0.9}
          listening={false}
        />
        {/* Add snap visualization if snapping occurred */}
        {movementState.snapResult && (
          <Circle
            key="snap-indicator"
            x={movementState.finalPosition[0]}
            y={movementState.finalPosition[1]}
            radius={12}
            stroke={COLORS.snapping.highlight}
            strokeWidth={3}
            opacity={0.8}
            listening={false}
          />
        )}
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
    if (!parentWall) return null

    // Find which corner this is by matching the corner ID
    const cornerIndex = parentWall.corners.findIndex(c => c.id === context.entityId)
    if (cornerIndex === -1) return null

    // Update that boundary point
    const newBoundary = [...parentWall.boundary]
    newBoundary[cornerIndex] = finalPosition

    return newBoundary
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

  private getOtherPolygonCorners(context: MovementContext): Vec2[] {
    // Get corners from other polygons and other corners of same polygon for snapping
    const parentWall = this.getParentWall(context)
    if (!parentWall) return []

    const allWalls = context.store.getOuterWallsByFloor(parentWall.floorId)
    const corners: Vec2[] = []

    for (const wall of allWalls) {
      if (wall.id === parentWall.id) {
        // Add other corners from same polygon
        for (let i = 0; i < wall.boundary.length; i++) {
          if (i !== parentWall.corners.findIndex(c => c.id === context.entityId)) {
            corners.push(wall.boundary[i])
          }
        }
      } else {
        // Add all corners from other polygons
        corners.push(...wall.boundary)
      }
    }

    return corners
  }

  private getOtherPolygonEdges(context: MovementContext): LineSegment2D[] {
    // Get edges from other polygons for snapping
    const parentWall = this.getParentWall(context)
    if (!parentWall) return []

    const allWalls = context.store.getOuterWallsByFloor(parentWall.floorId)
    const edges: LineSegment2D[] = []

    for (const wall of allWalls) {
      if (wall.id !== parentWall.id) {
        // Add edges from other polygons
        for (let i = 0; i < wall.boundary.length; i++) {
          const start = wall.boundary[i]
          const end = wall.boundary[(i + 1) % wall.boundary.length]
          edges.push({ start, end })
        }
      }
    }

    return edges
  }
}
