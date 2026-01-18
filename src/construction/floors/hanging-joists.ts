import { createConstructionElement, createConstructionElementId } from '@/construction/elements'
import {
  PolygonWithBoundingRect,
  partitionByAlignedEdges,
  polygonEdges,
  simplePolygonFrame
} from '@/construction/helpers'
import { type ConstructionModel } from '@/construction/model'
import type { PerimeterConstructionContext } from '@/construction/perimeters/context'
import { type ConstructionResult, aggregateResults } from '@/construction/results'
import { createExtrudedPolygon } from '@/construction/shapes'
import { TAG_FLOOR_OPENING_FRAME, TAG_HANGING_JOIST_FLOOR, TAG_JOIST, TAG_SUBFLOOR } from '@/construction/tags'
import {
  Bounds2D,
  type Polygon2D,
  type Vec2,
  addVec2,
  direction,
  dotAbsVec2,
  dotVec2,
  fromTrans,
  isPointStrictlyInPolygon,
  midpoint,
  minimumAreaBoundingBox,
  newVec3,
  offsetPolygon,
  perpendicular,
  perpendicularCW,
  subtractPolygons
} from '@/shared/geometry'

import { BaseFloorAssembly } from './base'
import type { HangingJoistFloorConfig } from './types'

const EPSILON = 1e-5

export class HangingJoistFloorAssembly extends BaseFloorAssembly<HangingJoistFloorConfig> {
  construct = (context: PerimeterConstructionContext): ConstructionModel => {
    const bbox = minimumAreaBoundingBox(context.outerPolygon)
    const joistDirection = bbox.smallestDirection

    const checkPoints = [...polygonEdges(context.innerPolygon)]
      .filter(e => 1 - dotAbsVec2(direction(e.start, e.end), joistDirection) < EPSILON)
      .map(e => {
        return addVec2(midpoint(e.start, e.end), perpendicularCW(direction(e.start, e.end)))
      })

    const partitions = Array.from(partitionByAlignedEdges(context.innerPolygon, joistDirection))

    const expandedHoles = context.floorOpenings.map(h => offsetPolygon(h, this.config.openingSideThickness))
    const joistAreas = partitions
      .flatMap(p => subtractPolygons([p], expandedHoles))
      .map(p => PolygonWithBoundingRect.fromPolygon(p, joistDirection))

    const joistPolygons = joistAreas.flatMap(p => {
      const { leftHasBeam, rightHasBeam } = detectBeamEdges(p.polygon.outer, joistDirection, checkPoints)

      return [
        ...p.stripes({
          thickness: this.config.joistThickness,
          spacing: this.config.joistSpacing,
          stripeAtMin: leftHasBeam,
          stripeAtMax: rightHasBeam,
          equalSpacing: true,
          minimumArea: 3000
        })
      ]
    })

    const joists = joistPolygons.flatMap(p => [
      ...p.extrude(this.config.joistMaterial, this.config.joistHeight, 'xy', undefined, [TAG_JOIST], {
        type: 'joist',
        requiresSinglePiece: true
      })
    ])

    const openingFrames = context.floorOpenings.flatMap(h =>
      Array.from(
        simplePolygonFrame(
          h,
          this.config.openingSideThickness,
          this.config.joistHeight,
          this.config.openingSideMaterial,
          context.innerPolygon,
          { type: 'floor-opening-frame' },
          [TAG_FLOOR_OPENING_FRAME],
          false
        )
      )
    )

    const subfloorPolygons = subtractPolygons([context.innerPolygon], context.floorOpenings)
    const subfloor = subfloorPolygons.map(
      p =>
        ({
          type: 'element',
          element: createConstructionElement(
            this.config.subfloorMaterial,
            createExtrudedPolygon(p, 'xy', this.config.subfloorThickness),
            fromTrans(newVec3(0, 0, this.config.joistHeight)),
            [TAG_SUBFLOOR],
            { type: 'subfloor' }
          )
        }) satisfies ConstructionResult
    )

    const results = [...joists, ...openingFrames, ...subfloor]
    const aggregatedResults = aggregateResults(results)

    const bounds = Bounds2D.fromPoints(context.outerPolygon.points).toBounds3D('xy', 0, this.config.joistHeight)
    return {
      elements: [
        {
          id: createConstructionElementId(),
          bounds,
          transform: fromTrans(newVec3(0, 0, -this.config.joistHeight + this.config.verticalOffset)),
          children: aggregatedResults.elements
        }
      ],
      areas: aggregatedResults.areas,
      bounds,
      errors: aggregatedResults.errors,
      measurements: aggregatedResults.measurements,
      warnings: aggregatedResults.warnings
    }
  }

  get topOffset() {
    return this.config.subfloorThickness + this.config.verticalOffset
  }

  get bottomOffset() {
    return this.config.joistHeight - this.config.verticalOffset
  }

  readonly constructionThickness = 0

  protected tag = TAG_HANGING_JOIST_FLOOR
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
