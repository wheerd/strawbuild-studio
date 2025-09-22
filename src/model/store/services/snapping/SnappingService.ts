import {
  type Vec2,
  createVec2,
  lineIntersection,
  distanceToInfiniteLine,
  projectPointOntoLine,
  type Line2D,
  lineFromSegment,
  distanceSquared
} from '@/types/geometry'
import { type SnapResult, type SnappingContext, type SnapConfig, DEFAULT_SNAP_CONFIG } from './types'

/**
 * Integrated snapping service that handles all snap calculations
 * Combines the functionality of the old SnappingEngine and SnappingService
 */
export class SnappingService {
  private readonly snapConfig: SnapConfig

  constructor(snapConfig: Partial<SnapConfig> = {}) {
    this.snapConfig = { ...DEFAULT_SNAP_CONFIG, ...snapConfig }
  }

  /**
   * Find the snap result for a target point
   * This is the main function that should be used by all components
   */
  findSnapResult(target: Vec2, context: SnappingContext): SnapResult | null {
    // Step 1: Try point snapping first (highest priority)
    const pointSnapResult = this.findPointSnapPosition(target, context)

    if (pointSnapResult != null) return pointSnapResult

    // Step 2: Generate snap lines and check for line/intersection snapping
    const snapLines = this.generateSnapLines(context)

    return this.findLineSnapPosition(target, snapLines, context)
  }

  /**
   * Find existing points for direct point snapping
   */
  private findPointSnapPosition(target: Vec2, context: SnappingContext): SnapResult | null {
    let bestPoint: Vec2 | null = null
    let bestDistanceSq = this.snapConfig.pointSnapDistance ** 2

    for (const point of context.snapPoints) {
      const targetDistSq = distanceSquared(target, point)
      if (targetDistSq <= bestDistanceSq) {
        bestDistanceSq = targetDistSq
        bestPoint = point
      }
    }

    return bestPoint != null ? { position: bestPoint } : null
  }

  /**
   * Generate snap lines for architectural alignment
   */
  private generateSnapLines(context: SnappingContext): Line2D[] {
    const snapLines: Line2D[] = []

    const allPoints = [...context.snapPoints, ...(context.alignPoints ?? [])]

    // 1. Add horizontal and vertical lines through all points
    for (const point of allPoints) {
      // Horizontal line through point
      snapLines.push({
        point,
        direction: createVec2(1, 0)
      })

      // Vertical line through point
      snapLines.push({
        point,
        direction: createVec2(0, 1)
      })
    }

    // 2. Add horizontal and vertical lines through reference point (if any)
    if (context.referencePoint != null) {
      // Horizontal line through point
      snapLines.push({
        point: context.referencePoint,
        direction: createVec2(1, 0)
      })

      // Vertical line through point
      snapLines.push({
        point: context.referencePoint,
        direction: createVec2(0, 1)
      })
    }

    // 3. Add extension and perpendicular lines for reference line walls (if any)
    for (const wall of context.referenceLineWalls ?? []) {
      const line = lineFromSegment(wall)

      // Extension line (same direction as wall)
      snapLines.push({
        point: line.point,
        direction: line.direction
      })

      // Perpendicular lines (90 degrees rotated)
      snapLines.push({
        point: wall.start,
        direction: createVec2(-line.direction[1], line.direction[0])
      })
      snapLines.push({
        point: wall.end,
        direction: createVec2(-line.direction[1], line.direction[0])
      })
    }

    return snapLines
  }

  /**
   * Find snap position on lines or line intersections
   */
  private findLineSnapPosition(target: Vec2, snapLines: Line2D[], context: SnappingContext): SnapResult | null {
    const minDistanceSquared = this.snapConfig.minDistance ** 2
    const nearbyLines: { line: Line2D; distance: number; projectedPosition: Vec2 }[] = []
    let closestDist = Infinity
    let closestIndex = -1

    for (const line of snapLines) {
      const distance = Number(distanceToInfiniteLine(target, line))
      if (distance <= this.snapConfig.lineSnapDistance) {
        const projectedPosition = projectPointOntoLine(target, line)
        if (
          context.referencePoint == null ||
          distanceSquared(projectedPosition, context.referencePoint) >= minDistanceSquared
        ) {
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

        if (
          context.referencePoint == null ||
          distanceSquared(intersection, context.referencePoint) >= minDistanceSquared
        ) {
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
