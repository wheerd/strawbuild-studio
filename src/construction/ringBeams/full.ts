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
import { type WallTopOffsets, getRoofHeightLineForLines } from '@/construction/walls/roofIntegration'
import type { WallStoreyContext } from '@/construction/walls/segmentation'
import {
  type Length,
  type LineSegment2D,
  type Polygon2D,
  type Vec2,
  fromTrans,
  newVec3,
  normVec3,
  rotate,
  scaleAddVec2,
  translate
} from '@/shared/geometry'

import { BaseRingBeamAssembly } from './base'
import type { FullRingBeamConfig, RingBeamSegment } from './types'

export class FullRingBeamAssembly extends BaseRingBeamAssembly<FullRingBeamConfig> {
  get height() {
    return this.config.height
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
      let ceilingOffset = -this.config.height

      // Get height line using aligned bounds
      const { heightLine, boundingRect } = this.getHeightLineForBeamPolygon(
        polygon,
        part.wall.direction,
        segment.perimeter.storeyId,
        -ceilingOffset,
        storeyContext.perimeterContexts
      )

      // Split by height changes
      const subSegments = this.splitPolygonByHeightLine(boundingRect, heightLine)

      // Construct each piece
      for (const sub of subSegments) {
        // Heights represent the top of the beam (bottom of roof)
        // Adjust down by beam thickness to get the bottom position
        const adjustedStartHeight = (sub.startHeight - this.config.height) as Length
        const adjustedEndHeight = (sub.endHeight - this.config.height) as Length

        yield* this.extrudeWithSlope(
          sub.subPolygon,
          adjustedStartHeight,
          adjustedEndHeight,
          this.config.height,
          this.config.material,
          [TAG_PLATE]
        )
      }
    }
  }

  /**
   * Get height line for a ring beam polygon using inner and outer edges
   * Uses the bounding rect's perpendicular direction to get both lines
   */
  protected getHeightLineForBeamPolygon(
    polygon: Polygon2D,
    pathDirection: Vec2,
    storeyId: StoreyId,
    ceilingBottomOffset: Length,
    perimeterContexts: PerimeterConstructionContext[]
  ): {
    heightLine: HeightLine
    boundingRect: PolygonWithBoundingRect
  } {
    const boundingRect = PolygonWithBoundingRect.fromPolygon({ outer: polygon, holes: [] }, pathDirection)

    // First line: along minPoint in the dir direction
    const innerLine: LineSegment2D = {
      start: boundingRect.minPoint,
      end: scaleAddVec2(boundingRect.minPoint, boundingRect.dir, boundingRect.dirExtent)
    }

    // Second line: offset by perpExtent in perpDir direction
    const outerStart = scaleAddVec2(boundingRect.minPoint, boundingRect.perpDir, boundingRect.perpExtent)
    const outerLine: LineSegment2D = {
      start: outerStart,
      end: scaleAddVec2(outerStart, boundingRect.dir, boundingRect.dirExtent)
    }

    const heightLine = getRoofHeightLineForLines(
      storeyId,
      [innerLine, outerLine],
      ceilingBottomOffset,
      perimeterContexts
    )

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
    tags?: Tag[]
  ): Generator<ConstructionResult> {
    const heightChange = endHeight - startHeight
    const centerHeight = startHeight + heightChange / 2
    const slopeAngleRad = -Math.atan2(heightChange, subPolygon.dirExtent)

    // Early optimization: if flat (no slope), just extrude at the right height
    if (Math.abs(heightChange) < 0.001) {
      const flatTransform = fromTrans(newVec3(0, 0, startHeight))
      yield* subPolygon.extrude(material, beamHeight, 'xy', flatTransform, tags)
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
    const clippingVolume = clippingShape.manifold.translate([0, 0, -clippingExtent])

    const element = createConstructionElement(material, expandedShape, transform, tags)
    yield* yieldAndClip(yieldElement(element), m => m.intersect(clippingVolume))
  }
}
