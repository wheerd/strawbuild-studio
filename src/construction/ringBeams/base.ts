import type { PerimeterCorner, PerimeterWall } from '@/building/model/model'
import type { PerimeterConstructionContext } from '@/construction/context'
import { PolygonWithBoundingRect, polygonEdges } from '@/construction/helpers'
import { type ConstructionResult } from '@/construction/results'
import {
  type Length,
  type Line2D,
  type Polygon2D,
  type Vec2,
  direction,
  distanceToLineSegment,
  isParallel,
  lineIntersection,
  midpoint,
  offsetLine,
  perpendicular,
  projectPointOntoLine,
  projectVec2,
  scaleAddVec2
} from '@/shared/geometry'

import type { RingBeamAssembly, RingBeamConfigBase, RingBeamSegment } from './types'

export interface ColinearPart {
  startCorner: PerimeterCorner
  endCorner: PerimeterCorner
  wall: PerimeterWall
  prevWallIndex: number
  nextWallIndex: number
}

export abstract class BaseRingBeamAssembly<T extends RingBeamConfigBase> implements RingBeamAssembly {
  protected readonly config: T

  constructor(config: T) {
    this.config = config
  }

  abstract get height(): Length

  abstract construct(segment: RingBeamSegment, context: PerimeterConstructionContext): Generator<ConstructionResult>

  protected *colinearParts(segment: RingBeamSegment): Generator<ColinearPart> {
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
    offsetFromInside?: Length,
    width?: Length
  ): Generator<PolygonWithBoundingRect> {
    const { perimeter } = segment
    for (const part of this.colinearParts(segment)) {
      const { startCorner, endCorner, nextWallIndex, prevWallIndex, wall } = part
      const prevWallDir = perimeter.walls[prevWallIndex].direction
      const nextWallDir = perimeter.walls[nextWallIndex].direction

      const polygon = this.createBeamPolygon(
        context,
        wall.direction,
        wall.outsideDirection,
        this.isWallIndexInSegment(prevWallIndex, segment),
        startCorner,
        prevWallDir,
        this.isWallIndexInSegment(nextWallIndex, segment),
        endCorner,
        nextWallDir,
        offsetFromInside ?? 0,
        width
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

  protected findLineForWall(referencePoint: Vec2, dir: Vec2, perpDir: Vec2, polygon: Polygon2D, debug = false): Line2D {
    const edges = Array.from(polygonEdges(polygon))
    let closestLine: Line2D | null = null
    let minDistance = Infinity
    if (debug) console.log('lines', referencePoint, dir, perpDir)
    for (const edge of edges) {
      const edgeDir = direction(edge.start, edge.end)
      if (debug) console.log('  parallel', edgeDir, isParallel(edgeDir, dir))
      if (isParallel(edgeDir, dir)) {
        const dist = distanceToLineSegment(referencePoint, edge)
        if (debug) console.log('    edge', edge.start, edge.end, dist)
        if (dist < minDistance) {
          if (debug) console.log('      closest', dist, minDistance)
          closestLine = { point: edge.start, direction: edgeDir }
          minDistance = dist
        }
      }
    }

    if (!closestLine) {
      throw new Error(`No parallel lines found for wall`)
    }

    return closestLine
  }

  protected createBeamPolygon(
    context: PerimeterConstructionContext,
    dir: Vec2,
    outsideDir: Vec2,
    prevInSegment: boolean,
    startCorner: PerimeterCorner,
    prevDir: Vec2,
    nextInSegment: boolean,
    endCorner: PerimeterCorner,
    nextDir: Vec2,
    offsetFromInside: Length,
    width?: Length
  ): Polygon2D {
    // Create beam offset lines for start and end walls
    // Note: We use findLineForWall instead of direct indexing because context lines
    // are filtered to remove colinear walls, so indices don't match 1:1 with walls
    //
    // For inner lines: offsetLine uses perpendicularCW, but outsideDirection = perpendicularCCW,
    // so we need NEGATIVE offsets to move from inner line towards outside
    const base = midpoint(startCorner.insidePoint, endCorner.insidePoint)
    const innerLine = this.findLineForWall(base, dir, outsideDir, context.innerPolygon)

    let actualWidth: Length
    if (width != null) {
      actualWidth = width
    } else {
      const base = midpoint(startCorner.outsidePoint, endCorner.outsidePoint)
      const outerLine = this.findLineForWall(base, dir, outsideDir, context.outerPolygon, true)
      const totalThickness = Math.abs(projectVec2(innerLine.point, outerLine.point, outsideDir))
      actualWidth = Math.max(totalThickness - offsetFromInside, 0)
    }

    const { innerPoint: startInnerPoint, outerPoint: startOuterPoint } = this.determineCornerPoints(
      startCorner,
      prevInSegment,
      outsideDir,
      offsetFromInside,
      actualWidth,
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
      actualWidth,
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

    const perpDir = perpendicular(otherDir)

    if (Math.abs(corner.exteriorAngle - 180) < 0.01 && !otherInSegment) {
      const basePoint = projectPointOntoLine(corner.insidePoint, innerLine)
      // Colinear at segment boundary - offset corner directly
      innerPoint = scaleAddVec2(basePoint, outsideDir, offsetFromInside)
      outerPoint = scaleAddVec2(basePoint, outsideDir, offsetFromInside + width)
      return { innerPoint, outerPoint }
    }

    // Determine which edge to use
    let edge: Line2D
    if (otherInSegment) {
      // Other wall in segment - use its beam line
      const otherInnerLine = this.findLineForWall(corner.insidePoint, otherDir, perpDir, context.innerPolygon)
      const useOuter = this.constructionCutByOuterEdge(corner, side)
      const offset = useOuter ? width : 0
      edge = offsetLine(otherInnerLine, -offsetFromInside - offset)
    } else {
      // Other wall NOT in segment - use raw construction edge
      const useOuter = this.constructionCutByOuterEdge(corner, side)
      const prevLine = useOuter
        ? this.findLineForWall(corner.outsidePoint, otherDir, perpDir, context.outerPolygon)
        : this.findLineForWall(corner.insidePoint, otherDir, perpDir, context.innerPolygon)
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
