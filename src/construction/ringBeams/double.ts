import type { PerimeterCornerWithGeometry } from '@/building/model'
import { getModelActions } from '@/building/store'
import { PolygonWithBoundingRect } from '@/construction/helpers'
import type { MaterialId } from '@/construction/materials/material'
import type { PerimeterConstructionContext } from '@/construction/perimeters/context'
import { type ConstructionResult } from '@/construction/results'
import type { StoreyContext } from '@/construction/storeys/context'
import { TAG_PLATE, TAG_RB_INFILL } from '@/construction/tags'
import type { Tag } from '@/construction/tags'
import {
  type Length,
  type Line2D,
  type Polygon2D,
  type Vec2,
  lineIntersection,
  midpoint,
  offsetLine,
  projectPointOntoLine,
  scaleAddVec2
} from '@/shared/geometry'
import { assertUnreachable } from '@/shared/utils'

import { BaseRingBeamAssembly } from './base'
import type { CornerHandling, DoubleRingBeamConfig, RingBeamSegment } from './types'

type BeamType = 'inner' | 'infill' | 'outer'

interface DoubleBeamPolygons {
  inner: Polygon2D
  infill: Polygon2D | null
  outer: Polygon2D
}

export class DoubleRingBeamAssembly extends BaseRingBeamAssembly<DoubleRingBeamConfig> {
  get height() {
    return this.config.height
  }

  *construct(
    segment: RingBeamSegment,
    context: PerimeterConstructionContext,
    storeyContext?: StoreyContext
  ): Generator<ConstructionResult> {
    const { getPerimeterWallById } = getModelActions()

    for (const part of this.colinearParts(segment)) {
      const prevWall = getPerimeterWallById(segment.perimeter.wallIds[part.prevWallIndex])
      const nextWall = getPerimeterWallById(segment.perimeter.wallIds[part.nextWallIndex])

      const polygons = this.createDoubleBeamPolygons(
        context,
        part.wall.direction,
        part.wall.outsideDirection,
        this.isWallIndexInSegment(part.prevWallIndex, segment),
        part.startCorner,
        prevWall.direction,
        this.isWallIndexInSegment(part.nextWallIndex, segment),
        part.endCorner,
        nextWall.direction
      )

      // Extrude inner beam
      yield* this.extrudeBeamPolygon(
        polygons.inner,
        part.wall.direction,
        segment,
        storeyContext,
        this.config.material,
        [TAG_PLATE]
      )

      // Extrude infill (if spacing > 0)
      if (polygons.infill) {
        yield* this.extrudeBeamPolygon(
          polygons.infill,
          part.wall.direction,
          segment,
          storeyContext,
          this.config.infillMaterial,
          [TAG_RB_INFILL]
        )
      }

      // Extrude outer beam
      yield* this.extrudeBeamPolygon(
        polygons.outer,
        part.wall.direction,
        segment,
        storeyContext,
        this.config.material,
        [TAG_PLATE]
      )
    }
  }

  private *extrudeBeamPolygon(
    polygon: Polygon2D,
    direction: Vec2,
    segment: RingBeamSegment,
    storeyContext: StoreyContext | undefined,
    material: MaterialId,
    tags: Tag[]
  ): Generator<ConstructionResult> {
    // Backwards compatible: no storey context = flat extrusion
    if (!storeyContext) {
      yield* PolygonWithBoundingRect.fromPolygon({ outer: polygon, holes: [] }, direction).extrude(
        material,
        this.config.height,
        'xy',
        undefined,
        tags,
        { type: 'ring-beam' }
      )
      return
    }

    const ceilingOffset = storeyContext.roofBottom - storeyContext.wallTop

    const { heightLine, boundingRect } = this.getHeightLineForBeamPolygon(
      polygon,
      direction,
      segment.perimeter.storeyId,
      -ceilingOffset,
      storeyContext.perimeterContexts
    )

    const subSegments = this.splitPolygonByHeightLine(boundingRect, heightLine)

    for (const sub of subSegments) {
      const adjustedStartHeight = sub.startHeight + ceilingOffset
      const adjustedEndHeight = sub.endHeight + ceilingOffset

      yield* this.extrudeWithSlope(
        sub.subPolygon,
        adjustedStartHeight,
        adjustedEndHeight,
        this.config.height,
        material,
        tags,
        { type: 'ring-beam' }
      )
    }
  }

  private createDoubleBeamPolygons(
    context: PerimeterConstructionContext,
    dir: Vec2,
    outsideDir: Vec2,
    prevInSegment: boolean,
    startCorner: PerimeterCornerWithGeometry,
    prevDir: Vec2,
    nextInSegment: boolean,
    endCorner: PerimeterCornerWithGeometry,
    nextDir: Vec2
  ): DoubleBeamPolygons {
    const { thickness, spacing } = this.config

    // Get inner line for this wall
    const base = midpoint(startCorner.insidePoint, endCorner.insidePoint)
    const innerLine = this.findLineForWall(base, dir, context.innerPolygon)

    // Create polygons for each beam type
    const innerPolygon = this.createSingleBeamPolygon(
      context,
      outsideDir,
      prevInSegment,
      startCorner,
      prevDir,
      nextInSegment,
      endCorner,
      nextDir,
      innerLine,
      this.offsetInside,
      thickness,
      'inner'
    )

    const infillPolygon =
      spacing > 0
        ? this.createSingleBeamPolygon(
            context,
            outsideDir,
            prevInSegment,
            startCorner,
            prevDir,
            nextInSegment,
            endCorner,
            nextDir,
            innerLine,
            this.offsetInnerOutside,
            spacing,
            'infill'
          )
        : null

    const outerPolygon = this.createSingleBeamPolygon(
      context,
      outsideDir,
      prevInSegment,
      startCorner,
      prevDir,
      nextInSegment,
      endCorner,
      nextDir,
      innerLine,
      this.offsetOuterInside,
      thickness,
      'outer'
    )

    return {
      inner: innerPolygon,
      infill: infillPolygon,
      outer: outerPolygon
    }
  }

  private createSingleBeamPolygon(
    context: PerimeterConstructionContext,
    outsideDir: Vec2,
    prevInSegment: boolean,
    startCorner: PerimeterCornerWithGeometry,
    prevDir: Vec2,
    nextInSegment: boolean,
    endCorner: PerimeterCornerWithGeometry,
    nextDir: Vec2,
    innerLine: Line2D,
    offsetFromInside: Length,
    width: Length,
    beamType: BeamType
  ): Polygon2D {
    const { innerPoint: startInnerPoint, outerPoint: startOuterPoint } = this.determineDoubleBeamCornerPoints(
      context,
      startCorner,
      prevInSegment,
      outsideDir,
      offsetFromInside,
      width,
      prevDir,
      innerLine,
      'start',
      beamType
    )

    const { innerPoint: endInnerPoint, outerPoint: endOuterPoint } = this.determineDoubleBeamCornerPoints(
      context,
      endCorner,
      nextInSegment,
      outsideDir,
      offsetFromInside,
      width,
      nextDir,
      innerLine,
      'end',
      beamType
    )

    return {
      points: [startInnerPoint, endInnerPoint, endOuterPoint, startOuterPoint]
    }
  }

  private determineDoubleBeamCornerPoints(
    context: PerimeterConstructionContext,
    corner: PerimeterCornerWithGeometry,
    otherInSegment: boolean,
    outsideDir: Vec2,
    offsetFromInside: Length,
    width: Length,
    otherDir: Vec2,
    innerLine: Line2D,
    side: 'start' | 'end',
    beamType: BeamType
  ): { innerPoint: Vec2; outerPoint: Vec2 } {
    // Handle colinear corners at segment boundary
    if (Math.abs(corner.exteriorAngle - 180) < 0.01 && !otherInSegment) {
      const basePoint = projectPointOntoLine(corner.insidePoint, innerLine)
      const innerPoint = scaleAddVec2(basePoint, outsideDir, offsetFromInside)
      const outerPoint = scaleAddVec2(basePoint, outsideDir, offsetFromInside + width)
      return { innerPoint, outerPoint }
    }

    // Calculate the edge to intersect with based on corner handling rules
    const edge = this.getEdgeForDoubleBeamCorner(context, corner, otherInSegment, otherDir, side, beamType)

    // Intersect with beam lines
    const beamInner = offsetLine(innerLine, -offsetFromInside)
    const beamOuter = offsetLine(innerLine, -(offsetFromInside + width))
    const innerIntersection = lineIntersection(edge, beamInner)
    const outerIntersection = lineIntersection(edge, beamOuter)

    if (!innerIntersection || !outerIntersection) {
      throw new Error(`Failed to calculate beam intersections for ${beamType} beam`)
    }

    return { innerPoint: innerIntersection, outerPoint: outerIntersection }
  }

  private getEdgeForDoubleBeamCorner(
    context: PerimeterConstructionContext,
    corner: PerimeterCornerWithGeometry,
    otherInSegment: boolean,
    otherDir: Vec2,
    side: 'start' | 'end',
    beamType: BeamType
  ): Line2D {
    const isConstructedByThisWall =
      side === 'start' ? corner.constructedByWall === 'next' : corner.constructedByWall === 'previous'
    const isConvex = corner.interiorAngle < 180

    const otherInnerLine = this.findLineForWall(corner.insidePoint, otherDir, context.innerPolygon)

    if (!otherInSegment) {
      const useOuter = (isConvex && isConstructedByThisWall) || (!isConvex && !isConstructedByThisWall)
      return useOuter ? offsetLine(otherInnerLine, -this.offsetOutside) : otherInnerLine
    }

    const offset = this.getCornerOffset(this.config.cornerHandling, isConstructedByThisWall, isConvex, beamType)
    return offsetLine(otherInnerLine, -offset)
  }

  private getCornerOffset(
    cornerHandling: CornerHandling,
    isCornerConstructedByThisWall: boolean,
    isConvex: boolean,
    beamType: string
  ) {
    const useOuter = (isConvex && isCornerConstructedByThisWall) || (!isConvex && !isCornerConstructedByThisWall)

    switch (cornerHandling) {
      case 'interweave':
        if (isCornerConstructedByThisWall) {
          if (isConvex) {
            return beamType !== 'outer' ? this.offsetOuterInside : this.offsetOutside
          } else {
            return beamType !== 'inner' ? this.offsetInnerOutside : this.offsetInside
          }
        } else {
          if (isConvex) {
            return beamType !== 'outer' ? this.offsetInside : this.offsetOuterInside
          } else {
            return beamType !== 'inner' ? this.offsetOutside : this.offsetInnerOutside
          }
        }
      case 'cut':
        return useOuter ? this.offsetOutside : this.offsetInside
      default:
        assertUnreachable(cornerHandling, 'Invalid corner handling')
    }
  }

  private get offsetInside() {
    return this.config.offsetFromEdge
  }

  private get offsetInnerOutside() {
    return this.config.offsetFromEdge + this.config.thickness
  }

  private get offsetOuterInside() {
    return this.config.offsetFromEdge + this.config.thickness + this.config.spacing
  }

  private get offsetOutside() {
    return this.config.offsetFromEdge + 2 * this.config.thickness + this.config.spacing
  }
}
