import type { PerimeterCornerWithGeometry, PerimeterWallWithGeometry } from '@/building/model'
import type { StoreyId } from '@/building/model/ids'
import { getModelActions } from '@/building/store'
import { getRoofHeightLineCached } from '@/construction/derived'
import { createConstructionElement } from '@/construction/elements'
import { PolygonWithBoundingRect, polygonEdges } from '@/construction/helpers'
import type { MaterialId } from '@/construction/materials/material'
import type { PartInfo } from '@/construction/parts'
import type { PerimeterConstructionContext } from '@/construction/perimeters/context'
import { type ConstructionResult, yieldAndClip, yieldElement } from '@/construction/results'
import type { HeightLine } from '@/construction/roofs/types'
import { createExtrudedPolygon } from '@/construction/shapes'
import type { Tag } from '@/construction/tags'
import { type WallTopOffsets } from '@/construction/walls/roofIntegration'
import {
  type Length,
  type Line2D,
  type LineSegment2D,
  type Polygon2D,
  type Vec2,
  direction,
  distanceToLineSegment,
  fromTrans,
  isParallel,
  lineIntersection,
  midpoint,
  newVec3,
  normVec3,
  offsetLine,
  projectPointOntoLine,
  projectVec2,
  rotate,
  scaleAddVec2,
  translate
} from '@/shared/geometry'

import type { RingBeamAssembly, RingBeamConfigBase, RingBeamSegment } from './types'

export interface ColinearPart {
  startCorner: PerimeterCornerWithGeometry
  endCorner: PerimeterCornerWithGeometry
  wall: PerimeterWallWithGeometry
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
    const { getPerimeterCornerById, getPerimeterWallById } = getModelActions()
    const { perimeter, startIndex, endIndex } = segment
    const total = perimeter.wallIds.length

    const segmentCount = this.calculateSegmentCount(startIndex, endIndex, total)

    // Track colinear segments
    let colinearStartIndex: number | null = null
    let colinearStartCorner: PerimeterCornerWithGeometry | null = null

    for (let offset = 0; offset < segmentCount; offset++) {
      const wallIndex = (startIndex + offset) % total
      const wall = getPerimeterWallById(perimeter.wallIds[wallIndex])
      const nextWallIndex = (wallIndex + 1) % total
      const endCorner = getPerimeterCornerById(perimeter.cornerIds[nextWallIndex])

      const isColinearWithNext = Math.abs(endCorner.exteriorAngle - 180) < 0.01 && offset < segmentCount - 1
      if (isColinearWithNext) {
        if (colinearStartIndex === null) {
          colinearStartIndex = wallIndex
          colinearStartCorner = getPerimeterCornerById(perimeter.cornerIds[wallIndex])
        }
        continue // Skip creating polygon, continue to next wall
      }

      // End of colinear segment (or single wall)
      const startCorner = colinearStartCorner ?? getPerimeterCornerById(perimeter.cornerIds[wallIndex])
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
    const { getPerimeterWallById } = getModelActions()
    const { perimeter } = segment
    for (const part of this.colinearParts(segment)) {
      const { startCorner, endCorner, nextWallIndex, prevWallIndex, wall } = part
      const prevWallDir = getPerimeterWallById(perimeter.wallIds[prevWallIndex]).direction
      const nextWallDir = getPerimeterWallById(perimeter.wallIds[nextWallIndex]).direction

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

  protected constructionCutByOuterEdge(corner: PerimeterCornerWithGeometry, side: 'start' | 'end'): boolean {
    const isConvex = corner.interiorAngle < 180
    const isCornerConstructedByThisWall =
      side === 'start' ? corner.constructedByWall === 'next' : corner.constructedByWall === 'previous'

    // Decision logic:
    // - Convex corner owned by this wall → use outer edge (extend into corner)
    // - Concave corner NOT owned by this wall → use outer edge (cut off corner)
    // - All other cases → use inner edge (to either extend or cut)
    return (isConvex && isCornerConstructedByThisWall) || (!isConvex && !isCornerConstructedByThisWall)
  }

  protected findLineForWall(referencePoint: Vec2, dir: Vec2, polygon: Polygon2D): Line2D {
    const edges = Array.from(polygonEdges(polygon))
    let closestLine: Line2D | null = null
    let minDistance = Infinity
    for (const edge of edges) {
      const edgeDir = direction(edge.start, edge.end)
      if (isParallel(edgeDir, dir)) {
        const dist = distanceToLineSegment(referencePoint, edge)
        if (dist < minDistance) {
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
    startCorner: PerimeterCornerWithGeometry,
    prevDir: Vec2,
    nextInSegment: boolean,
    endCorner: PerimeterCornerWithGeometry,
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
    const innerLine = this.findLineForWall(base, dir, context.innerPolygon)

    let actualWidth: Length
    if (width != null) {
      actualWidth = width
    } else {
      const base = midpoint(startCorner.outsidePoint, endCorner.outsidePoint)
      const outerLine = this.findLineForWall(base, dir, context.outerPolygon)
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
    corner: PerimeterCornerWithGeometry,
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
      const otherInnerLine = this.findLineForWall(corner.insidePoint, otherDir, context.innerPolygon)
      const useOuter = this.constructionCutByOuterEdge(corner, side)
      const offset = useOuter ? width : 0
      edge = offsetLine(otherInnerLine, -offsetFromInside - offset)
    } else {
      // Other wall NOT in segment - use raw construction edge
      const useOuter = this.constructionCutByOuterEdge(corner, side)
      const prevLine = useOuter
        ? this.findLineForWall(corner.outsidePoint, otherDir, context.outerPolygon)
        : this.findLineForWall(corner.insidePoint, otherDir, context.innerPolygon)
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

  /**
   * Get height line for a ring beam polygon using inner and outer edges
   * Uses a bounding rect's perpendicular direction to get both lines
   */
  protected getHeightLineForBeamPolygon(
    polygon: Polygon2D,
    pathDirection: Vec2,
    storeyId: StoreyId
  ): {
    heightLine: HeightLine
    boundingRect: PolygonWithBoundingRect
  } {
    const boundingRect = PolygonWithBoundingRect.fromPolygon({ outer: polygon, holes: [] }, pathDirection)

    const epsilon = 1e-2

    // First line: along minPoint in dir direction
    const innerLine: LineSegment2D = {
      start: boundingRect.minPoint,
      end: scaleAddVec2(boundingRect.minPoint, boundingRect.dir, boundingRect.dirExtent)
    }
    const innerLineWithEps: LineSegment2D = {
      start: scaleAddVec2(innerLine.start, boundingRect.perpDir, epsilon),
      end: scaleAddVec2(innerLine.end, boundingRect.perpDir, epsilon)
    }

    // Second line: offset by perpExtent in perpDir direction
    const outerStart = scaleAddVec2(boundingRect.minPoint, boundingRect.perpDir, boundingRect.perpExtent - epsilon)
    const outerLine: LineSegment2D = {
      start: outerStart,
      end: scaleAddVec2(outerStart, boundingRect.dir, boundingRect.dirExtent)
    }

    const heightLine = getRoofHeightLineCached(storeyId, [innerLineWithEps, outerLine])

    return { heightLine, boundingRect }
  }

  /**
   * Convert WallTopOffsets to HeightLine format
   */
  protected offsetsToHeightLine(offsets: WallTopOffsets | undefined, pathLength: Length): HeightLine {
    if (!offsets) return []

    const heightLine: HeightLine = []
    let i = 0

    while (i < offsets.length) {
      const current = offsets[i]
      const position = current[0] / pathLength

      // Check for height jump (two offsets at same X)
      if (i + 1 < offsets.length && Math.abs(offsets[i + 1][0] - current[0]) < 0.0001) {
        heightLine.push({
          position,
          offsetBefore: current[1],
          offsetAfter: offsets[i + 1][1]
        })
        i += 2
      } else {
        heightLine.push({
          position,
          offset: current[1],
          nullAfter: false
        })
        i++
      }
    }

    return heightLine
  }

  /**
   * Split ring beam polygon into sub-segments based on height line
   */
  protected splitPolygonByHeightLine(
    boundingRect: PolygonWithBoundingRect,
    heightLine: HeightLine
  ): {
    startT: number
    endT: number
    startHeight: Length
    endHeight: Length
    subPolygon: PolygonWithBoundingRect
  }[] {
    if (heightLine.length === 0) {
      return [
        {
          startT: 0,
          endT: 1,
          startHeight: 0,
          endHeight: 0,
          subPolygon: boundingRect
        }
      ]
    }

    const segments: {
      startT: number
      endT: number
      startHeight: Length
      endHeight: Length
      subPolygon: PolygonWithBoundingRect
    }[] = []

    // Create segments between positions
    for (let i = 0; i < heightLine.length - 1; i++) {
      const start = heightLine[i]
      const end = heightLine[i + 1]

      const startHeight = 'offsetAfter' in start ? start.offsetAfter : start.offset
      const endHeight = 'offsetBefore' in end ? end.offsetBefore : end.offset

      // Extract sub-polygon using rectangle intersection
      const subPolygons = Array.from(
        boundingRect.subArea(start.position * boundingRect.dirExtent, end.position * boundingRect.dirExtent)
      )

      if (subPolygons.length > 0) {
        segments.push({
          startT: start.position,
          endT: end.position,
          startHeight,
          endHeight,
          subPolygon: subPolygons[0]
        })
      }
    }

    return segments
  }

  /**
   * Expand polygon from center to compensate for slope
   */
  protected expandPolygonAlongPath(
    polygon: PolygonWithBoundingRect,
    slopeAngleRad: number,
    beamHeight: Length
  ): PolygonWithBoundingRect {
    const additionalExpansion = Math.tan(Math.abs(slopeAngleRad)) * beamHeight
    const expansion = polygon.dirExtent / Math.cos(slopeAngleRad)
    const totalExpansion = expansion - polygon.dirExtent + additionalExpansion

    return polygon.expandedInDir(totalExpansion)
  }

  /**
   * Extrude with slope using center-based rotation
   */
  protected *extrudeWithSlope(
    subPolygon: PolygonWithBoundingRect,
    startHeight: Length,
    endHeight: Length,
    beamHeight: Length,
    material: MaterialId,
    tags?: Tag[],
    partInfo?: PartInfo
  ): Generator<ConstructionResult> {
    const heightChange = endHeight - startHeight
    const centerHeight = startHeight + heightChange / 2
    const slopeAngleRad = -Math.atan2(heightChange, subPolygon.dirExtent)

    // Early optimization: if flat (no slope), just extrude at the right height
    if (Math.abs(heightChange) < 0.001) {
      const flatTransform = fromTrans(newVec3(0, 0, startHeight))
      yield* subPolygon.extrude(material, beamHeight, 'xy', flatTransform, tags, partInfo)
      return
    }

    const expandedPolygon = this.expandPolygonAlongPath(subPolygon, slopeAngleRad, beamHeight)
    const expandedShape = createExtrudedPolygon(expandedPolygon.polygon, 'xy', beamHeight)

    const center = subPolygon.center
    const rotationAxis = normVec3(newVec3(subPolygon.perpDir[0], subPolygon.perpDir[1], 0))
    const transform = translate(
      rotate(fromTrans(newVec3(center[0], center[1], centerHeight)), slopeAngleRad, rotationAxis),
      newVec3(-center[0], -center[1], 0)
    )

    const clippingExtent = 2 * (beamHeight + Math.abs(heightChange))
    const clippingShape = createExtrudedPolygon(subPolygon.polygon, 'xy', 2 * clippingExtent)
    const clippingVolume = clippingShape.manifold.translate([0, 0, startHeight - clippingExtent])

    const element = createConstructionElement(material, expandedShape, transform, tags, partInfo)
    yield* yieldAndClip(yieldElement(element), m => m.intersect(clippingVolume))
  }
}
