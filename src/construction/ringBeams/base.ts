import type { PerimeterCorner, PerimeterWall } from '@/building/model/model'
import type { PerimeterConstructionContext } from '@/construction/context'
import { PolygonWithBoundingRect } from '@/construction/helpers'
import { type ConstructionResult } from '@/construction/results'
import {
  type Length,
  type Line2D,
  type Polygon2D,
  type Vec2,
  distanceToInfiniteLine,
  eqVec2,
  lineIntersection,
  offsetLine,
  scaleAddVec2
} from '@/shared/geometry'

import type { RingBeamAssembly, RingBeamConfigBase, RingBeamSegment } from './types'

export abstract class BaseRingBeamAssembly<T extends RingBeamConfigBase> implements RingBeamAssembly {
  protected readonly config: T

  constructor(config: T) {
    this.config = config
  }

  abstract get height(): Length

  abstract construct(segment: RingBeamSegment, context: PerimeterConstructionContext): Generator<ConstructionResult>

  protected *colinearParts(segment: RingBeamSegment): Generator<{
    startCorner: PerimeterCorner
    endCorner: PerimeterCorner
    wall: PerimeterWall
    prevWallIndex: number
    nextWallIndex: number
  }> {
    const { perimeter, startIndex, endIndex } = segment
    const total = perimeter.walls.length

    const segmentCount = this.calculateSegmentCount(startIndex, endIndex, total)

    // Track colinear segments
    let colinearStartIndex: number | null = null
    let colinearStartCorner: PerimeterCorner | null = null

    for (let offset = 0; offset < segmentCount; offset++) {
      const wallIndex = (startIndex + offset) % total
      const wall = perimeter.walls[wallIndex]
      const nextWallIndex = (wallIndex + 1) % total
      const endCorner = perimeter.corners[nextWallIndex]

      const isColinearWithNext = Math.abs(endCorner.exteriorAngle - 180) < 0.01 && offset < segmentCount - 1
      if (isColinearWithNext) {
        if (colinearStartIndex === null) {
          colinearStartIndex = wallIndex
          colinearStartCorner = perimeter.corners[wallIndex]
        }
        continue // Skip creating polygon, continue to next wall
      }

      // End of colinear segment (or single wall)
      const startCorner = colinearStartCorner ?? perimeter.corners[wallIndex]
      const prevWallIndex = ((colinearStartIndex ?? wallIndex) - 1 + total) % total

      yield {
        startCorner,
        endCorner,
        wall,
        prevWallIndex,
        nextWallIndex
      }

      colinearStartIndex = null
      colinearStartCorner = null
    }
  }

  protected *polygons(
    segment: RingBeamSegment,
    context: PerimeterConstructionContext,
    offsetFromInside: Length,
    width: Length
  ): Generator<PolygonWithBoundingRect> {
    const { perimeter } = segment
    for (const part of this.colinearParts(segment)) {
      const { startCorner, endCorner, nextWallIndex, prevWallIndex, wall } = part
      const prevWallDir = perimeter.walls[prevWallIndex].direction
      const nextWallDir = perimeter.walls[nextWallIndex].direction

      const polygon = this.createBeamPolygon(
        context,
        offsetFromInside,
        width,
        wall.direction,
        wall.outsideDirection,
        this.isWallIndexInSegment(prevWallIndex, segment),
        startCorner,
        prevWallDir,
        this.isWallIndexInSegment(nextWallIndex, segment),
        endCorner,
        nextWallDir
      )

      yield PolygonWithBoundingRect.fromPolygon({ outer: polygon, holes: [] }, wall.direction)
    }
  }

  protected calculateSegmentCount(startIndex: number, endIndex: number, total: number): number {
    if (startIndex <= endIndex) {
      return endIndex - startIndex + 1
    } else {
      // Wrap-around case
      return total - startIndex + endIndex + 1
    }
  }

  protected isWallIndexInSegment(wallIndex: number, segment: RingBeamSegment): boolean {
    const start = segment.startIndex
    const end = segment.endIndex

    if (start <= end) {
      return wallIndex >= start && wallIndex <= end
    } else {
      // Wrap-around case
      return wallIndex >= start || wallIndex <= end
    }
  }

  protected constructionCutByOuterEdge(corner: PerimeterCorner, side: 'start' | 'end'): boolean {
    const isConvex = corner.interiorAngle < 180
    const isCornerConstructedByThisWall =
      side === 'start' ? corner.constructedByWall === 'next' : corner.constructedByWall === 'previous'

    // Decision logic:
    // - Convex corner owned by this wall → use outer edge (extend into corner)
    // - Concave corner NOT owned by this wall → use outer edge (cut off corner)
    // - All other cases → use inner edge (to either extend or cut)
    return (isConvex && isCornerConstructedByThisWall) || (!isConvex && !isCornerConstructedByThisWall)
  }

  protected findLineForWall(referencePoint: Vec2, dir: Vec2, lines: Line2D[]): Line2D {
    const parallelLines = lines.filter(line => eqVec2(line.direction, dir))

    if (parallelLines.length === 0) {
      throw new Error(`No parallel lines found for wall`)
    }

    let closestLine = parallelLines[0]
    let minDistance = distanceToInfiniteLine(referencePoint, parallelLines[0])
    for (let i = 1; i < parallelLines.length; i++) {
      const distance = distanceToInfiniteLine(referencePoint, parallelLines[i])
      if (distance < minDistance) {
        minDistance = distance
        closestLine = parallelLines[i]
      }
    }

    return closestLine
  }

  protected createBeamPolygon(
    context: PerimeterConstructionContext,
    offsetFromInside: Length,
    width: Length,
    dir: Vec2,
    outsideDir: Vec2,
    prevInSegment: boolean,
    startCorner: PerimeterCorner,
    prevDir: Vec2,
    nextInSegment: boolean,
    endCorner: PerimeterCorner,
    nextDir: Vec2
  ): Polygon2D {
    // Create beam offset lines for start and end walls
    // Note: We use findLineForWall instead of direct indexing because context lines
    // are filtered to remove colinear walls, so indices don't match 1:1 with walls
    //
    // For inner lines: offsetLine uses perpendicularCW, but outsideDirection = perpendicularCCW,
    // so we need NEGATIVE offsets to move from inner line towards outside
    const innerLine = this.findLineForWall(startCorner.insidePoint, dir, context.innerLines)

    const { innerPoint: startInnerPoint, outerPoint: startOuterPoint } = this.determineCornerPoints(
      startCorner,
      prevInSegment,
      outsideDir,
      offsetFromInside,
      width,
      prevDir,
      context,
      innerLine,
      'start'
    )
    const { innerPoint: endInnerPoint, outerPoint: endOuterPoint } = this.determineCornerPoints(
      endCorner,
      nextInSegment,
      outsideDir,
      offsetFromInside,
      width,
      nextDir,
      context,
      innerLine,
      'end'
    )

    // Create quadrilateral polygon (clockwise order for proper winding)
    return {
      points: [startInnerPoint, endInnerPoint, endOuterPoint, startOuterPoint]
    }
  }

  private determineCornerPoints(
    corner: PerimeterCorner,
    otherInSegment: boolean,
    outsideDir: Vec2,
    offsetFromInside: Length,
    width: Length,
    otherDir: Vec2,
    context: PerimeterConstructionContext,
    innerLine: Line2D,
    side: 'start' | 'end'
  ): { innerPoint: Vec2; outerPoint: Vec2 } {
    let innerPoint: Vec2
    let outerPoint: Vec2

    if (Math.abs(corner.exteriorAngle - 180) < 0.01 && !otherInSegment) {
      // Colinear at segment boundary - offset corner directly
      innerPoint = scaleAddVec2(corner.insidePoint, outsideDir, offsetFromInside)
      outerPoint = scaleAddVec2(corner.insidePoint, outsideDir, offsetFromInside + width)
      return { innerPoint, outerPoint }
    }

    // Determine which edge to use
    let edge: Line2D
    if (otherInSegment) {
      // Other wall in segment - use its beam line
      const otherInnerLine = this.findLineForWall(corner.insidePoint, otherDir, context.innerLines)
      const useInner = this.constructionCutByOuterEdge(corner, side) // Inverted logic for more stability of construction
      const offset = useInner ? 0 : width
      edge = offsetLine(otherInnerLine, -offsetFromInside - offset)
    } else {
      // Other wall NOT in segment - use raw construction edge
      const useOuter = this.constructionCutByOuterEdge(corner, side)
      const prevLine = useOuter
        ? this.findLineForWall(corner.outsidePoint, otherDir, context.outerLines)
        : this.findLineForWall(corner.insidePoint, otherDir, context.innerLines)
      edge = prevLine
    }

    // Intersect with beam lines
    const beamInner = offsetLine(innerLine, -offsetFromInside)
    const beamOuter = offsetLine(innerLine, -(offsetFromInside + width))
    const innerIntersection = lineIntersection(edge, beamInner)
    const outerIntersection = lineIntersection(edge, beamOuter)

    if (!innerIntersection || !outerIntersection) {
      throw new Error(`Failed to calculate beam start intersections`)
    }

    innerPoint = innerIntersection
    outerPoint = outerIntersection

    return { innerPoint, outerPoint }
  }
}
