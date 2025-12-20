import type { StoreyId } from '@/building/model/ids'
import type { PerimeterConstructionContext } from '@/construction/context'
import { createConstructionElement } from '@/construction/elements'
import { PolygonWithBoundingRect } from '@/construction/helpers'
import { type MaterialId } from '@/construction/materials/material'
import { type ConstructionResult, yieldAndClip, yieldElement } from '@/construction/results'
import type { HeightLine } from '@/construction/roofs/types'
import { createExtrudedPolygon } from '@/construction/shapes'
import { TAG_PLATE } from '@/construction/tags'
import type { Tag } from '@/construction/tags'
import { type WallTopOffsets, getRoofHeightLineForLine } from '@/construction/walls/roofIntegration'
import type { WallStoreyContext } from '@/construction/walls/segmentation'
import {
  type Length,
  type LineSegment2D,
  type Polygon2D,
  type Vec2,
  centroidVec2,
  dotVec2,
  fromTrans,
  intersectPolygon,
  newVec2,
  newVec3,
  normVec3,
  perpendicularCW,
  projectVec2,
  rotate,
  scaleAddVec2,
  subVec2
} from '@/shared/geometry'

import { BaseRingBeamAssembly } from './base'
import type { FullRingBeamConfig, RingBeamSegment } from './types'

export class FullRingBeamAssembly extends BaseRingBeamAssembly<FullRingBeamConfig> {
  get height() {
    return this.config.height
  }

  /**
   * Get height line for a ring beam polygon using its aligned bounds
   */
  protected getHeightLineForBeamPolygon(
    polygon: Polygon2D,
    pathDirection: Vec2,
    storeyId: StoreyId,
    ceilingBottomOffset: Length,
    perimeterContexts: PerimeterConstructionContext[]
  ): {
    heightLine: HeightLine | undefined
    boundingRect: PolygonWithBoundingRect
  } {
    const boundingRect = PolygonWithBoundingRect.fromPolygon({ outer: polygon, holes: [] }, pathDirection)

    // Query along aligned bounds: minPoint to minPoint + dir * dirExtent
    const referenceLine: LineSegment2D = {
      start: boundingRect.minPoint,
      end: scaleAddVec2(boundingRect.minPoint, boundingRect.dir, boundingRect.dirExtent)
    }

    const offsets = getRoofHeightLineForLine(
      storeyId,
      referenceLine,
      boundingRect.dirExtent,
      ceilingBottomOffset,
      perimeterContexts
    )

    const heightLine = this.offsetsToHeightLine(offsets, boundingRect.dirExtent)

    return {
      heightLine: heightLine.length > 0 ? heightLine : undefined,
      boundingRect
    }
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
   * Get offset before/after at position by interpolation
   * Copied from walls/roofIntegration.ts getOffsetAt
   */
  protected getOffsetAt(heightLine: HeightLine, position: number): [Length, Length] {
    position = Math.max(0, Math.min(1, position))

    let before: HeightLine[number] | null = null
    let after: HeightLine[number] | null = null

    for (const item of heightLine) {
      if (item.position <= position) {
        before = item
      }
      if (item.position >= position && after === null) {
        after = item
        break
      }
    }

    if (!before || !after) {
      throw new Error('inconsistent height line (not filled?)')
    }

    // Exact match
    const POSITION_EPSILON = 0.0001
    if (Math.abs(before.position - position) < POSITION_EPSILON) {
      return 'offset' in before ? [before.offset, before.offset] : [before.offsetBefore, before.offsetAfter]
    }
    if (Math.abs(after.position - position) < POSITION_EPSILON) {
      return 'offset' in after ? [after.offset, after.offset] : [after.offsetBefore, after.offsetAfter]
    }

    // Interpolate
    const beforeOffset = 'offset' in before ? before.offset : before.offsetAfter
    const afterOffset = 'offset' in after ? after.offset : after.offsetBefore

    const ratio = (position - before.position) / (after.position - before.position)
    const interpolated = beforeOffset + ratio * (afterOffset - beforeOffset)
    return [interpolated, interpolated]
  }

  /**
   * Split ring beam polygon into sub-segments based on height line
   */
  protected splitPolygonByHeightLine(
    beamPolygon: Polygon2D,
    boundingRect: PolygonWithBoundingRect,
    heightLine: HeightLine | undefined
  ): Array<{
    startT: number
    endT: number
    startHeight: Length
    endHeight: Length
    subPolygon: Polygon2D
  }> {
    if (!heightLine || heightLine.length === 0) {
      return [
        {
          startT: 0,
          endT: 1,
          startHeight: 0,
          endHeight: 0,
          subPolygon: beamPolygon
        }
      ]
    }

    const segments: Array<{
      startT: number
      endT: number
      startHeight: Length
      endHeight: Length
      subPolygon: Polygon2D
    }> = []

    // Get all unique positions from height line
    const positions: number[] = [0]
    for (const item of heightLine) {
      if (!positions.includes(item.position)) {
        positions.push(item.position)
      }
    }
    if (!positions.includes(1)) {
      positions.push(1)
    }
    positions.sort((a, b) => a - b)

    // Create segments between positions
    for (let i = 0; i < positions.length - 1; i++) {
      const startT = positions[i]
      const endT = positions[i + 1]

      // Get heights (use offsetAfter at start, offsetBefore at end for jumps)
      const [, startHeight] = this.getOffsetAt(heightLine, startT)
      const [endHeight] = this.getOffsetAt(heightLine, endT)

      // Extract sub-polygon using rectangle intersection
      const subPolygon = this.extractSubPolygon(beamPolygon, boundingRect, startT, endT)

      if (subPolygon && subPolygon.points.length > 0) {
        segments.push({ startT, endT, startHeight, endHeight, subPolygon })
      }
    }

    return segments
  }

  /**
   * Extract sub-polygon for a range using rectangle intersection
   */
  protected extractSubPolygon(
    polygon: Polygon2D,
    boundingRect: PolygonWithBoundingRect,
    startT: number,
    endT: number
  ): Polygon2D | null {
    const startOffset = startT * boundingRect.dirExtent
    const endOffset = endT * boundingRect.dirExtent
    const width = endOffset - startOffset

    const p1 = scaleAddVec2(boundingRect.minPoint, boundingRect.dir, startOffset)
    const p2 = scaleAddVec2(p1, boundingRect.perpDir, boundingRect.perpExtent)
    const p3 = scaleAddVec2(p2, boundingRect.dir, width)
    const p4 = scaleAddVec2(p1, boundingRect.dir, width)

    const rectPolygon: Polygon2D = { points: [p1, p2, p3, p4] }

    const intersected = intersectPolygon({ outer: polygon, holes: [] }, { outer: rectPolygon, holes: [] })

    return intersected.length > 0 ? intersected[0].outer : null
  }

  /**
   * Calculate center point of a polygon
   */
  protected getPolygonCenter(polygon: Polygon2D): Vec2 {
    const sum = polygon.points.reduce((acc, p) => scaleAddVec2(acc, p, 1), newVec2(0, 0))
    return scaleAddVec2(newVec2(0, 0), sum, 1 / polygon.points.length)
  }

  /**
   * Expand polygon from center to compensate for slope
   */
  protected expandPolygonAlongPath(
    polygon: Polygon2D,
    dir: Vec2,
    center: Vec2,
    slopeAngleRad: number,
    beamHeight: Length
  ): Polygon2D {
    const additionalExpansion = Math.tan(Math.abs(slopeAngleRad)) * beamHeight
    const expansionFactor = 1 / Math.cos(slopeAngleRad)

    const perpDir = perpendicularCW(dir)

    const expandedPoints = polygon.points.map(point => {
      const projection = projectVec2(center, point, dir)
      const perpProjection = projectVec2(center, point, perpDir)
      const newDist = projection * expansionFactor + Math.sign(projection) * additionalExpansion
      return scaleAddVec2(scaleAddVec2(center, perpDir, perpProjection), dir, newDist)
    })

    return { points: expandedPoints }
  }

  /**
   * Extrude with slope using center-based rotation
   */
  protected *extrudeWithSlope(
    subPolygon: Polygon2D,
    pathDirection: Vec2,
    pathStartPoint: Vec2,
    pathLength: Length,
    startHeight: Length,
    endHeight: Length,
    beamHeight: Length,
    material: MaterialId,
    tags?: Tag[]
  ): Generator<ConstructionResult> {
    const heightChange = endHeight - startHeight
    const slopeAngleRad = Math.atan2(heightChange, pathLength)

    // Early optimization: if flat (no slope), just extrude at the right height
    if (Math.abs(slopeAngleRad) < 0.0001) {
      const flatShape = createExtrudedPolygon({ outer: subPolygon, holes: [] }, 'xy', beamHeight)
      const flatTransform = fromTrans(newVec3(0, 0, startHeight))
      yield* yieldElement(createConstructionElement(material, flatShape, flatTransform, tags))
      return
    }

    // Use polygon center as reference point
    const center = centroidVec2(subPolygon.points)

    // 1. Expand polygon from center
    const expandedPolygon = this.expandPolygonAlongPath(subPolygon, pathDirection, center, slopeAngleRad, beamHeight)

    // Translate to origin (center point)
    const translatedExpanded = {
      points: expandedPolygon.points.map(p => subVec2(p, center))
    }

    // 2. Extrude expanded
    const expandedShape = createExtrudedPolygon({ outer: translatedExpanded, holes: [] }, 'xy', beamHeight)

    // 3. Create clipping volume from original (un-expanded)
    const clippingExtent = 2 * (beamHeight + Math.abs(heightChange))
    const clippingShape = createExtrudedPolygon({ outer: subPolygon, holes: [] }, 'xy', 2 * clippingExtent)
    const clippingVolume = clippingShape.manifold.translate([0, 0, -clippingExtent])

    // 4. Calculate height at center
    const centerDist = dotVec2(subVec2(center, pathStartPoint), pathDirection)
    const centerT = centerDist / pathLength
    const centerHeight = startHeight + centerT * heightChange

    // 5. Transform: rotate around perpendicular axis at center
    const perpToPath = perpendicularCW(pathDirection)
    const rotationAxis = normVec3(newVec3(perpToPath[0], perpToPath[1], 0))

    const transform = rotate(fromTrans(newVec3(center[0], center[1], centerHeight)), slopeAngleRad, rotationAxis)

    // 7. Yield with clipping
    const element = createConstructionElement(material, expandedShape, transform, tags)

    //yield* yieldElement(element)
    yield* yieldAndClip(yieldElement(element), m => m.intersect(clippingVolume))
  }

  *construct(
    segment: RingBeamSegment,
    context: PerimeterConstructionContext,
    storeyContext?: WallStoreyContext
  ): Generator<ConstructionResult> {
    for (const part of this.colinearParts(segment)) {
      const polygon = this.createBeamPolygon(
        context,
        part.wall.direction,
        part.wall.outsideDirection,
        this.isWallIndexInSegment(part.prevWallIndex, segment),
        part.startCorner,
        segment.perimeter.walls[part.prevWallIndex].direction,
        this.isWallIndexInSegment(part.nextWallIndex, segment),
        part.endCorner,
        segment.perimeter.walls[part.nextWallIndex].direction,
        this.config.offsetFromEdge,
        this.config.width
      )

      // Backwards compatible: no storey context = flat extrusion
      if (!storeyContext) {
        yield* PolygonWithBoundingRect.fromPolygon({ outer: polygon, holes: [] }, part.wall.direction).extrude(
          this.config.material,
          this.config.height,
          'xy',
          undefined,
          [TAG_PLATE],
          {
            type: 'ring-beam'
          }
        )
        continue
      }

      // Calculate ceiling offset
      const ceilingOffset =
        storeyContext.storeyHeight -
        (storeyContext.ceilingHeight + storeyContext.floorTopOffset + storeyContext.ceilingBottomOffset)

      // Get height line using aligned bounds
      const { heightLine, boundingRect } = this.getHeightLineForBeamPolygon(
        polygon,
        part.wall.direction,
        segment.perimeter.storeyId,
        -ceilingOffset,
        storeyContext.perimeterContexts
      )

      // Split by height changes
      const subSegments = this.splitPolygonByHeightLine(polygon, boundingRect, heightLine)

      // Construct each piece
      for (const sub of subSegments) {
        const segmentStartPoint = scaleAddVec2(
          boundingRect.minPoint,
          boundingRect.dir,
          sub.startT * boundingRect.dirExtent
        )
        const segmentLength = ((sub.endT - sub.startT) * boundingRect.dirExtent) as Length

        // Heights represent the top of the beam (bottom of roof)
        // Adjust down by beam thickness to get the bottom position
        const adjustedStartHeight = (sub.startHeight - this.config.height) as Length
        const adjustedEndHeight = (sub.endHeight - this.config.height) as Length

        yield* this.extrudeWithSlope(
          sub.subPolygon,
          boundingRect.dir,
          segmentStartPoint,
          segmentLength,
          adjustedStartHeight,
          adjustedEndHeight,
          this.config.height,
          this.config.material,
          [TAG_PLATE]
        )
      }
    }
  }
}
