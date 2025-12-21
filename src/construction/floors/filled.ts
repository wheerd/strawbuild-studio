import { createConstructionElement, createConstructionElementId } from '@/construction/elements'
import {
  PolygonWithBoundingRect,
  partitionByAlignedEdges,
  polygonEdges,
  polygonFromLineIntersections,
  simplePolygonFrame,
  stripesPolygons
} from '@/construction/helpers'
import { constructStrawPolygon } from '@/construction/materials/straw'
import type { ConstructionModel } from '@/construction/model'
import type { PerimeterConstructionContext } from '@/construction/perimeters/context'
import { type ConstructionResult, aggregateResults, yieldMeasurement } from '@/construction/results'
import { createExtrudedPolygon } from '@/construction/shapes'
import {
  TAG_FLOOR_CEAILING_SHEATHING,
  TAG_FLOOR_FRAME,
  TAG_FLOOR_OPENING_FRAME,
  TAG_JOIST,
  TAG_JOIST_LENGTH,
  TAG_JOIST_SPACING,
  TAG_SUBFLOOR
} from '@/construction/tags'
import {
  Bounds2D,
  type Polygon2D,
  type Vec2,
  direction,
  dotAbsVec2,
  dotVec2,
  ensurePolygonIsClockwise,
  fromTrans,
  isPointStrictlyInPolygon,
  midpoint,
  minimumAreaBoundingBox,
  newVec3,
  offsetLine,
  offsetPolygon,
  perpendicular,
  subtractPolygons
} from '@/shared/geometry'

import { BaseFloorAssembly } from './base'
import type { FilledFloorConfig } from './types'

const EPSILON = 1e-5

export class FilledFloorAssembly extends BaseFloorAssembly<FilledFloorConfig> {
  construct = (context: PerimeterConstructionContext): ConstructionModel => {
    const bbox = minimumAreaBoundingBox(context.outerPolygon)
    const joistDirection = bbox.smallestDirection

    const wallBeamCheckPoints = [...polygonEdges(context.innerPolygon)]
      .filter(e => 1 - dotAbsVec2(direction(e.start, e.end), joistDirection) < EPSILON)
      .map(e => midpoint(e.start, e.end))

    const joistArea = polygonFromLineIntersections(
      context.innerLines.map((l, i) =>
        1 - dotAbsVec2(l.direction, joistDirection) < EPSILON
          ? offsetLine(l, -this.config.frameThickness)
          : offsetLine(context.outerLines[i], this.config.frameThickness)
      )
    )

    const frame = Array.from(
      simplePolygonFrame(
        context.outerPolygon,
        this.config.frameThickness,
        this.config.constructionHeight,
        this.config.frameMaterial,
        undefined,
        { type: 'floor-frame' },
        [TAG_FLOOR_FRAME],
        true
      )
    )

    const partitions = Array.from(partitionByAlignedEdges(joistArea, joistDirection))
    const expandedHoles = context.floorOpenings
      .map(h => offsetPolygon(h, this.config.openingFrameThickness))
      .map(ensurePolygonIsClockwise)
    const joistPolygons = partitions.flatMap(p => {
      const { leftHasBeam, rightHasBeam } = detectBeamEdges(p, joistDirection, wallBeamCheckPoints)

      return subtractPolygons([p], expandedHoles).flatMap(p =>
        Array.from(
          stripesPolygons(
            p,
            joistDirection,
            this.config.joistThickness,
            this.config.joistSpacing,
            leftHasBeam ? 0 : this.config.joistSpacing,
            rightHasBeam ? 0 : this.config.joistSpacing,
            3000
          )
        )
      )
    })
    const joists = joistPolygons.map(
      p =>
        ({
          type: 'element',
          element: createConstructionElement(
            this.config.joistMaterial,
            createExtrudedPolygon(p, 'xy', this.config.constructionHeight),
            undefined,
            [TAG_JOIST],
            { type: 'joist' }
          )
        }) satisfies ConstructionResult
    )

    const fullJoistPolygons = partitions.flatMap(p => {
      const { leftHasBeam, rightHasBeam } = detectBeamEdges(p, joistDirection, wallBeamCheckPoints)

      return Array.from(
        stripesPolygons(
          { outer: offsetPolygon(p, 1), holes: [] },
          joistDirection,
          this.config.joistThickness,
          this.config.joistSpacing,
          leftHasBeam ? 1 : this.config.joistSpacing + 1,
          rightHasBeam ? 1 : this.config.joistSpacing + 1,
          3000
        )
      )
    })
    const infillArea = offsetPolygon(context.outerPolygon, -this.config.frameThickness)
    const infillPolygons = subtractPolygons(
      [infillArea],
      [...fullJoistPolygons.map(p => p.outer), ...expandedHoles]
    ).map(p => PolygonWithBoundingRect.fromPolygon(p, joistDirection))
    const infill = infillPolygons.flatMap(p =>
      Array.from(constructStrawPolygon(p, 'xy', this.config.constructionHeight, this.config.strawMaterial))
    )
    const measurements = infillPolygons
      .flatMap(p => [
        p.perpMeasurement('xy', this.config.constructionHeight, [TAG_JOIST_SPACING]),
        p.dirMeasurement('xy', this.config.constructionHeight, [TAG_JOIST_LENGTH])
      ])
      .filter(m => m != null)
      .map(yieldMeasurement)

    const openingFrames = context.floorOpenings.flatMap(h =>
      Array.from(
        simplePolygonFrame(
          h,
          this.config.openingFrameThickness,
          this.config.constructionHeight,
          this.config.openingFrameMaterial,
          joistArea,
          { type: 'floor-opening-frame' },
          [TAG_FLOOR_OPENING_FRAME],
          false
        )
      )
    )

    const totalThickness =
      this.config.ceilingSheathingThickness + this.config.constructionHeight + this.config.subfloorThickness
    const bounds2D = Bounds2D.fromPoints(context.outerPolygon.points)
    const floorPolygons = subtractPolygons([context.outerPolygon], context.floorOpenings)
    const subfloor = {
      id: createConstructionElementId(),
      bounds: bounds2D.toBounds3D('xy', 0, this.config.subfloorThickness),
      transform: fromTrans(newVec3(0, 0, -this.config.subfloorThickness)),
      children: floorPolygons.map(p =>
        createConstructionElement(
          this.config.subfloorMaterial,
          createExtrudedPolygon(p, 'xy', this.config.subfloorThickness),
          undefined,
          [TAG_SUBFLOOR],
          { type: 'subfloor' }
        )
      )
    }
    const ceilingSheathing = {
      id: createConstructionElementId(),
      bounds: bounds2D.toBounds3D('xy', 0, this.config.ceilingSheathingThickness),
      transform: fromTrans(newVec3(0, 0, -totalThickness)),
      children: floorPolygons.map(p =>
        createConstructionElement(
          this.config.ceilingSheathingMaterial,
          createExtrudedPolygon(p, 'xy', this.config.ceilingSheathingThickness),
          undefined,
          [TAG_FLOOR_CEAILING_SHEATHING],
          { type: 'ceiling-sheathing' }
        )
      )
    }

    const floorResults = [...joists, ...frame, ...openingFrames, ...infill, ...measurements]
    const aggregatedResults = aggregateResults(floorResults)

    return {
      elements: [
        subfloor,
        {
          id: createConstructionElementId(),
          bounds: bounds2D.toBounds3D('xy', 0, this.config.constructionHeight),
          transform: fromTrans(newVec3(0, 0, -this.config.constructionHeight - this.config.subfloorThickness)),
          children: aggregatedResults.elements
        },
        ceilingSheathing
      ],
      areas: aggregatedResults.areas,
      bounds: bounds2D.toBounds3D('xy', 0, -totalThickness),
      errors: aggregatedResults.errors,
      measurements: aggregatedResults.measurements,
      warnings: aggregatedResults.warnings
    }
  }

  topOffset = 0
  bottomOffset = 0
  get constructionThickness() {
    return this.config.ceilingSheathingThickness + this.config.constructionHeight + this.config.subfloorThickness
  }
}

function detectBeamEdges(
  partition: Polygon2D,
  joistDirection: Vec2,
  wallBeamCheckPoints: Vec2[]
): { leftHasBeam: boolean; rightHasBeam: boolean } {
  if (partition.points.length === 0 || wallBeamCheckPoints.length === 0) {
    return { leftHasBeam: false, rightHasBeam: false }
  }

  const perpDir = perpendicular(joistDirection)

  // Find left and right boundaries of partition (min/max perpendicular projections)
  const projections = partition.points.map(p => dotVec2(p, perpDir))
  const leftProjection = Math.min(...projections)
  const rightProjection = Math.max(...projections)
  const centerProjection = (leftProjection + rightProjection) / 2

  let leftHasBeam = false
  let rightHasBeam = false

  for (const checkPoint of wallBeamCheckPoints) {
    if (isPointStrictlyInPolygon(checkPoint, partition)) {
      const projection = dotVec2(checkPoint, perpDir)

      if (projection < centerProjection) {
        leftHasBeam = true
      } else {
        rightHasBeam = true
      }
    }

    if (leftHasBeam && rightHasBeam) break
  }

  return { leftHasBeam, rightHasBeam }
}
