import {
  type Point2D,
  createVector2D,
  lineIntersection,
  distanceToInfiniteLine,
  projectPointOntoLine,
  type Line2D,
  lineFromSegment,
  distanceSquared
} from '@/types/geometry'
import type { Point } from '@/types/model'
import { type SnapResult, type SnappingContext, type SnapConfig, DEFAULT_SNAP_CONFIG } from './types'

/**
 * Integrated snapping service that handles all snap calculations
 * Combines the functionality of the old SnappingEngine and SnappingService
 */
export class SnappingService {
  private readonly snapConfig: SnapConfig

  constructor (snapConfig: Partial<SnapConfig> = {}) {
    this.snapConfig = { ...DEFAULT_SNAP_CONFIG, ...snapConfig }
  }

  /**
   * Find the snap result for a target point
   * This is the main function that should be used by all components
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
    const snapLines = this.generateSnapLines(context)

    return this.findLineSnapPosition(target, snapLines, context)
  }

  /**
   * Convenience method to get just the snapped position
   * Returns the target point if no snap is found
   */
  findSnapPosition (
    target: Point2D,
    context: SnappingContext
  ): Point2D {
    const result = this.findSnapResult(target, context)
    return result?.position ?? target
  }

  /**
   * Find existing points for direct point snapping
   */
  private findPointSnapPosition (
    target: Point2D, context: SnappingContext
  ): SnapResult | null {
    let bestPoint: Point | null = null
    let bestDistanceSq = this.snapConfig.pointSnapDistance ** 2

    for (const point of context.points) {
      if (point.id === context.referencePointId) continue

      const targetDistSq = (target.x - point.position.x) ** 2 + (target.y - point.position.y) ** 2
      if (targetDistSq <= bestDistanceSq) {
        bestDistanceSq = targetDistSq
        bestPoint = point
      }
    }

    return (bestPoint != null) ? { position: bestPoint.position, pointId: bestPoint.id } : null
  }

  /**
   * Generate snap lines for architectural alignment
   */
  private generateSnapLines (
    context: SnappingContext
  ): Line2D[] {
    const snapLines: Line2D[] = []

    // 1. Add horizontal and vertical lines through all points
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

    // 3. Add extension and perpendicular lines for reference line segments (if any)
    if (context.referenceLineSegments != null) {
      for (const segment of context.referenceLineSegments) {
        const line = lineFromSegment(segment)

        // Extension line (same direction as wall)
        snapLines.push({
          point: line.point,
          direction: line.direction
        })

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
   * Find snap position on lines or line intersections
   */
  private findLineSnapPosition (
    target: Point2D,
    snapLines: Line2D[],
    context: SnappingContext
  ): SnapResult | null {
    const minDistanceSquared = this.snapConfig.minDistance ** 2
    const nearbyLines: Array<{ line: Line2D, distance: number, projectedPosition: Point2D }> = []
    let closestDist = Number(this.snapConfig.lineSnapDistance)
    let closestIndex = -1

    for (const line of snapLines) {
      const distance = Number(distanceToInfiniteLine(target, line))
      if (distance <= this.snapConfig.lineSnapDistance) {
        const projectedPosition = projectPointOntoLine(target, line)
        if (context.referencePoint == null || distanceSquared(projectedPosition, context.referencePoint) >= minDistanceSquared) {
          nearbyLines.push({ line, distance, projectedPosition })
          if (distance < closestDist) {
            closestDist = distance
            closestIndex = nearbyLines.length - 1
          }
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
    const lineSnapDistSq = this.snapConfig.lineSnapDistance ** 2

    for (let i = 0; i < nearbyLines.length - 1; i++) {
      for (let j = i + 1; j < nearbyLines.length; j++) {
        const line1 = nearbyLines[i]
        const line2 = nearbyLines[j]

        const intersection = lineIntersection(line1.line, line2.line)
        if (intersection == null) continue

        if (distanceSquared(target, intersection) > lineSnapDistSq) continue

        if (context.referencePoint == null || distanceSquared(intersection, context.referencePoint) >= minDistanceSquared) {
          return { position: intersection, lines: [line1.line, line2.line] }
        }
      }
    }

    // No intersection found, return closest line snap
    const bestSnap = nearbyLines[closestIndex]
    return {
      position: bestSnap.projectedPosition,
      lines: [bestSnap.line]
    }
  }
}

// Create a default singleton instance
export const defaultSnappingService = new SnappingService()
