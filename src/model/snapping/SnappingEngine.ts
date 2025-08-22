import {
  type Point2D,
  createVector2D,
  distance,
  lineIntersection,
  distanceToInfiniteLine,
  projectPointOntoLine,
  type Line2D,
  lineFromSegment,
  distanceSquared
} from '@/types/geometry'
import type { ModelState, Point, Wall } from '@/types/model'
import { type SnapResult, type SnappingContext, type SnapConfig, DEFAULT_SNAP_CONFIG } from './types'

/**
 * Core snapping engine that handles all snap calculations
 * This is the single source of truth for snapping behavior
 */
export class SnappingEngine {
  private readonly snapConfig: SnapConfig

  constructor (snapConfig: Partial<SnapConfig> = {}) {
    this.snapConfig = { ...DEFAULT_SNAP_CONFIG, ...snapConfig }
  }

  /**
   * Main snapping function - finds the best snap result for a target point
   */
  findSnapResult (
    target: Point2D,
    context: SnappingContext
  ): SnapResult | null {
    // Step 1: Try point snapping first (highest priority)
    const pointSnapResult = this.findPointSnapPosition(
      target, context
    )

    if (pointSnapResult != null) return pointSnapResult

    // Step 2: Generate snap lines and check for line/intersection snapping
    const snapLines = this.generateLine2Ds(context
    )

    return this.findLineSnapPosition(target, snapLines, context)
  }

  /**
   * Find existing points for direct point snapping
   */
  private findPointSnapPosition (
    from: Point2D, context: SnappingContext
  ): SnapResult | null {
    let bestPoint: Point | null = null
    let bestDistanceSquared = this.snapConfig.pointSnapDistance ** 2

    for (const point of context.points) {
      if (point.id === context.referencePointId) continue

      const targetDistSq = (from.x - point.position.x) ** 2 + (from.y - point.position.y) ** 2

      if (targetDistSq <= bestDistanceSquared) {
        bestDistanceSquared = targetDistSq
        bestPoint = point
      }
    }

    return (bestPoint != null) ? { position: bestPoint.position, pointId: bestPoint.id } : null
  }

  /**
   * Generate snap lines for architectural alignment
   */
  private generateLine2Ds (
    context: SnappingContext
  ): Line2D[] {
    const snapLines: Line2D[] = []

    // 1. Add horizontal and vertical lines through all points on active floor
    for (const point of context.points) {
      // Horizontal line through point
      snapLines.push({
        point: point.position,
        direction: createVector2D(1, 0)
      }
      )

      // Vertical line through point
      snapLines.push({
        point: point.position,
        direction: createVector2D(0, 1)
      }
      )
    }

    // 2. Add horizontal and vertical lines through reference point (if any)
    if (context.referencePoint != null) {
      // Horizontal line through point
      snapLines.push({
        point: context.referencePoint,
        direction: createVector2D(1, 0)
      }
      )

      // Vertical line through point
      snapLines.push({
        point: context.referencePoint,
        direction: createVector2D(0, 1)
      }
      )
    }

    // 2. Add extension and perpendicular lines for walls connected to fromPoint (only when drawing from existing point)
    if (context.referenceLineSegments != null) {
      for (const segment of context.referenceLineSegments) {
        const line = lineFromSegment(segment)

        // Extension line (same direction as wall)
        snapLines.push({
          point: line.point,
          direction: line.direction
        }
        )

        // Perpendicular line (90 degrees rotated)
        snapLines.push({
          point: line.point,
          direction: createVector2D(-line.direction.y, line.direction.x)

        })
      }
    }

    return snapLines
  }

  /**
   * Find walls connected to a specific point
   * TODO: Move this into the place where the engine is called and pass in the walls directly
   */
  private findWallsConnectedToPoint (state: ModelState, point: Point2D): Wall[] {
    const connectedWalls: Wall[] = []
    const tolerance = 1 // 1mm tolerance for point matching

    for (const wall of state.walls.values()) {
      const startPoint = state.points.get(wall.startPointId)
      const endPoint = state.points.get(wall.endPointId)

      if (startPoint == null || endPoint == null) continue

      // Check if either endpoint matches our point (within tolerance)
      const startDist = distance(startPoint.position, point)
      const endDist = distance(endPoint.position, point)

      if (Number(startDist) <= tolerance || Number(endDist) <= tolerance) {
        connectedWalls.push(wall)
      }
    }

    return connectedWalls
  }

  /**
   * Simplified snapping function: filter nearby lines first, then check intersections
   */
  private findLineSnapPosition (
    target: Point2D,
    snapLines: Line2D[],
    context: SnappingContext
  ): SnapResult | null {
    const minDistanceSquared = this.snapConfig.minDistance ** 2
    const nearbyLines: Array<{ line: Line2D, distance: number, projectedPosition: Point2D }> = []

    for (const line of snapLines) {
      const distance = Number(distanceToInfiniteLine(target, line))
      if (distance <= this.snapConfig.lineSnapDistance) {
        const projectedPosition = projectPointOntoLine(target, line)

        if (context.referencePoint != null) {
          // Check minimum wall length
          const distanceSquared = (projectedPosition.x - context.referencePoint.x) ** 2 + (projectedPosition.y - context.referencePoint.y) ** 2
          if (distanceSquared >= minDistanceSquared) {
            nearbyLines.push({ line, distance, projectedPosition })
          }
        } else {
          nearbyLines.push({ line, distance, projectedPosition })
        }
      }
    }

    if (nearbyLines.length === 0) {
      return null
    }

    if (nearbyLines.length === 1) {
      return { lines: [nearbyLines[0].line], position: nearbyLines[0].projectedPosition }
    }

    // Check for intersections between the closest line and other nearby lines

    for (let i = 0; i < nearbyLines.length - 1; i++) {
      for (let j = i + 1; j < nearbyLines.length; j++) {
        const closestLine = nearbyLines[i]
        const otherLine = nearbyLines[j]

        // Calculate intersection between the two lines
        const intersection = lineIntersection(closestLine.line, otherLine.line)

        if (intersection != null) {
          // Check if intersection is close enough to target
          const intersectionDistance = distanceSquared(target, intersection)

          if (Number(intersectionDistance) <= this.snapConfig.lineSnapDistance ** 2) {
            if (context.referencePoint != null) {
              // Check minimum wall length
              const distanceSquared = (intersection.x - context.referencePoint.x) ** 2 + (intersection.y - context.referencePoint.y) ** 2
              if (distanceSquared >= minDistanceSquared) {
                return {
                  position: intersection,
                  lines: [closestLine.line, otherLine.line]
                }
              }
            } else {
              return {
                position: intersection,
                lines: [closestLine.line, otherLine.line]
              }
            }
          }
        }
      }
    }

    // Sort by distance to target
    nearbyLines.sort((a, b) => a.distance - b.distance)

    // No intersection found, return closest line snap
    const bestSnap = nearbyLines[0]
    return {
      position: bestSnap.projectedPosition,
      lines: [bestSnap.line]
    }
  }
}
