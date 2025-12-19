import type { PerimeterCorner } from '@/building/model/model'
import type { PerimeterConstructionContext } from '@/construction/context'
import { createConstructionElement } from '@/construction/elements'
import '@/construction/parts'
import { type ConstructionResult, yieldElement } from '@/construction/results'
import { createExtrudedPolygon } from '@/construction/shapes'
import { TAG_PLATE } from '@/construction/tags'
import {
  type Line2D,
  type PolygonWithHoles2D,
  type Vec2,
  distanceToInfiniteLine,
  eqVec2,
  lineIntersection,
  offsetLine,
  scaleAddVec2
} from '@/shared/geometry'

import type { FullRingBeamConfig, RingBeamAssembly, RingBeamSegment } from './types'

export class FullRingBeamAssembly implements RingBeamAssembly {
  private config: FullRingBeamConfig

  constructor(config: FullRingBeamConfig) {
    this.config = config
  }

  get height() {
    return this.config.height
  }

  *construct(segment: RingBeamSegment, context: PerimeterConstructionContext): Generator<ConstructionResult> {
    const { perimeter, startIndex, endIndex } = segment
    const total = perimeter.walls.length
    const config = this.config

    const segmentCount = calculateSegmentCount(startIndex, endIndex, total)

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

      colinearStartIndex = null
      colinearStartCorner = null

      const prevWallDir = perimeter.walls[prevWallIndex].direction
      const nextWallDir = perimeter.walls[nextWallIndex].direction

      // Create beam polygon from startCorner to endCorner
      const polygon = createBeamPolygon(
        context,
        config,
        wall.direction,
        wall.outsideDirection,
        isWallIndexInSegment(prevWallIndex, segment),
        startCorner,
        prevWallDir,
        isWallIndexInSegment(nextWallIndex, segment),
        endCorner,
        nextWallDir
      )

      // Extrude and yield
      const shape = createExtrudedPolygon(polygon, 'xy', config.height)

      yield* yieldElement(
        createConstructionElement(config.material, shape, undefined, [TAG_PLATE], { type: 'ring-beam' })
      )
    }
  }
}

// Helper functions

function calculateSegmentCount(startIndex: number, endIndex: number, total: number): number {
  if (startIndex <= endIndex) {
    return endIndex - startIndex + 1
  } else {
    // Wrap-around case
    return total - startIndex + endIndex + 1
  }
}

function isWallIndexInSegment(wallIndex: number, segment: RingBeamSegment): boolean {
  const start = segment.startIndex
  const end = segment.endIndex

  if (start <= end) {
    return wallIndex >= start && wallIndex <= end
  } else {
    // Wrap-around case
    return wallIndex >= start || wallIndex <= end
  }
}

function constructionCutByOuterEdge(corner: PerimeterCorner, side: 'start' | 'end'): boolean {
  const isConvex = corner.interiorAngle < 180
  const isCornerConstructedByThisWall =
    side === 'start' ? corner.constructedByWall === 'next' : corner.constructedByWall === 'previous'

  // Decision logic:
  // - Convex corner owned by this wall → use outer edge (extend into corner)
  // - Concave corner NOT owned by this wall → use outer edge (cut off corner)
  // - All other cases → use inner edge (to either extend or cut)
  return (isConvex && isCornerConstructedByThisWall) || (!isConvex && !isCornerConstructedByThisWall)
}

function findLineForWall(referencePoint: Vec2, dir: Vec2, lines: Line2D[]): Line2D {
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

function createBeamPolygon(
  context: PerimeterConstructionContext,
  config: FullRingBeamConfig,
  dir: Vec2,
  outsideDir: Vec2,
  prevInSegment: boolean,
  startCorner: PerimeterCorner,
  prevDir: Vec2,
  nextInSegment: boolean,
  endCorner: PerimeterCorner,
  nextDir: Vec2
): PolygonWithHoles2D {
  // Create beam offset lines for start and end walls
  // Note: We use findLineForWall instead of direct indexing because context lines
  // are filtered to remove colinear walls, so indices don't match 1:1 with walls
  //
  // For inner lines: offsetLine uses perpendicularCW, but outsideDirection = perpendicularCCW,
  // so we need NEGATIVE offsets to move from inner line towards outside
  const innerLine = findLineForWall(startCorner.insidePoint, dir, context.innerLines)
  const beamInner = offsetLine(innerLine, -config.offsetFromEdge)
  const beamOuter = offsetLine(innerLine, -(config.offsetFromEdge + config.width))

  const { innerPoint: startInnerPoint, outerPoint: startOuterPoint } = determineCornerPoints(
    startCorner,
    prevInSegment,
    outsideDir,
    config,
    prevDir,
    context,
    beamInner,
    beamOuter,
    'start'
  )
  const { innerPoint: endInnerPoint, outerPoint: endOuterPoint } = determineCornerPoints(
    endCorner,
    nextInSegment,
    outsideDir,
    config,
    nextDir,
    context,
    beamInner,
    beamOuter,
    'end'
  )

  // Create quadrilateral polygon (clockwise order for proper winding)
  return {
    outer: {
      points: [startInnerPoint, endInnerPoint, endOuterPoint, startOuterPoint]
    },
    holes: []
  }
}

function determineCornerPoints(
  corner: PerimeterCorner,
  otherInSegment: boolean,
  outsideDir: Vec2,
  config: FullRingBeamConfig,
  otherDir: Vec2,
  context: PerimeterConstructionContext,
  beamInner: Line2D,
  beamOuter: Line2D,
  side: 'start' | 'end'
): { innerPoint: Vec2; outerPoint: Vec2 } {
  let innerPoint: Vec2
  let outerPoint: Vec2

  if (Math.abs(corner.exteriorAngle - 180) < 0.01 && !otherInSegment) {
    // Colinear at segment boundary - offset corner directly
    innerPoint = scaleAddVec2(corner.insidePoint, outsideDir, config.offsetFromEdge)
    outerPoint = scaleAddVec2(corner.insidePoint, outsideDir, config.offsetFromEdge + config.width)
    return { innerPoint, outerPoint }
  }

  // Determine which edge to use
  let edge: Line2D
  if (otherInSegment) {
    // Other wall in segment - use its beam line
    const otherInnerLine = findLineForWall(corner.insidePoint, otherDir, context.innerLines)
    const useInner = constructionCutByOuterEdge(corner, side) // Inverted logic for more stability of construction
    const offset = useInner ? 0 : config.width
    edge = offsetLine(otherInnerLine, -config.offsetFromEdge - offset)
  } else {
    // Other wall NOT in segment - use raw construction edge
    const useOuter = constructionCutByOuterEdge(corner, side)
    const prevLine = useOuter
      ? findLineForWall(corner.outsidePoint, otherDir, context.outerLines)
      : findLineForWall(corner.insidePoint, otherDir, context.innerLines)
    edge = prevLine
  }

  // Intersect with beam lines
  const innerIntersection = lineIntersection(edge, beamInner)
  const outerIntersection = lineIntersection(edge, beamOuter)

  if (!innerIntersection || !outerIntersection) {
    throw new Error(`Failed to calculate beam start intersections`)
  }

  innerPoint = innerIntersection
  outerPoint = outerIntersection

  return { innerPoint, outerPoint }
}
