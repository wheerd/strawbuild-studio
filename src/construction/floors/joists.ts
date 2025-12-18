import { vec3 } from 'gl-matrix'

import type { PerimeterConstructionContext } from '@/construction/context'
import { createConstructionElement, createConstructionElementId } from '@/construction/elements'
import { translate } from '@/construction/geometry'
import {
  infiniteBeamPolygon,
  partitionByAlignedEdges,
  polygonFromLineIntersections,
  simplePolygonFrame,
  stripesPolygons
} from '@/construction/helpers'
import { type ConstructionModel } from '@/construction/model'
import { type ConstructionResult, aggregateResults } from '@/construction/results'
import { createExtrudedPolygon } from '@/construction/shapes'
import {
  Bounds2D,
  type Polygon2D,
  type PolygonWithHoles2D,
  type Vec2,
  direction,
  dotVec2,
  ensurePolygonIsClockwise,
  intersectPolygon,
  isPointStrictlyInPolygon,
  midpoint,
  minimumAreaBoundingBox,
  offsetLine,
  offsetPolygon,
  perpendicular,
  perpendicularCW,
  subtractPolygons
} from '@/shared/geometry'

import { BaseFloorAssembly } from './base'
import type { JoistFloorConfig } from './types'

const EPSILON = 1e-5

/**
 * Detects whether wall beams exist on the left and right sides of a partition.
 * Checks if midpoints of wall beam polygon edges are strictly inside the partition.
 */
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

export class JoistFloorAssembly extends BaseFloorAssembly<JoistFloorConfig> {
  construct = (context: PerimeterConstructionContext, config: JoistFloorConfig): ConstructionModel => {
    const bbox = minimumAreaBoundingBox(context.outerPolygon)
    const joistDirection = bbox.smallestDirection

    const wallBeamCheckPoints: Vec2[] = []
    const wallBeamPolygons: PolygonWithHoles2D[] = []
    const lineCount = context.innerLines.length
    for (let i = 0; i < lineCount; i++) {
      const insideLine = context.innerLines[i]
      if (1 - Math.abs(dotVec2(insideLine.direction, joistDirection)) > EPSILON) continue
      const outsideLine = context.outerLines[i]
      const prevClip = context.outerLines[(i - 1 + lineCount) % lineCount]
      const nextClip = context.outerLines[(i + 1) % lineCount]

      const insideBeam = infiniteBeamPolygon(
        insideLine,
        prevClip,
        nextClip,
        config.wallBeamInsideOffset,
        config.wallBeamThickness - config.wallBeamInsideOffset
      )

      if (insideBeam) {
        const clippedBeam = subtractPolygons([insideBeam], context.floorOpenings)
        wallBeamPolygons.push(...clippedBeam)
        const leftDir = perpendicularCW(insideLine.direction)
        const leftPoints = insideBeam.points.filter(p => dotVec2(direction(insideLine.point, p), leftDir) > 0)
        wallBeamCheckPoints.push(midpoint(leftPoints[0], leftPoints[1]))
      }

      const outsideBeam = infiniteBeamPolygon(outsideLine, prevClip, nextClip, config.wallBeamThickness, 0)

      if (outsideBeam) {
        const clippedBeam = subtractPolygons([outsideBeam], context.floorOpenings)
        wallBeamPolygons.push(...clippedBeam)
      }
    }

    const joistArea = polygonFromLineIntersections(
      context.innerLines.map((l, i) =>
        1 - Math.abs(dotVec2(l.direction, joistDirection)) < EPSILON ? l : context.outerLines[i]
      )
    )
    const holeClip = polygonFromLineIntersections(
      context.innerLines.map((l, i) =>
        1 - Math.abs(dotVec2(l.direction, joistDirection)) < EPSILON
          ? offsetLine(l, config.wallBeamInsideOffset)
          : context.outerLines[i]
      )
    )
    const partitions = Array.from(partitionByAlignedEdges(joistArea, joistDirection))

    const expandedHoles = context.floorOpenings.map(h => offsetPolygon(h, config.openingSideThickness))

    const joistPolygons = partitions.flatMap(p => {
      const { leftHasBeam, rightHasBeam } = detectBeamEdges(p, joistDirection, wallBeamCheckPoints)

      return subtractPolygons([p], expandedHoles).flatMap(p =>
        Array.from(
          stripesPolygons(
            p,
            joistDirection,
            config.joistThickness,
            config.joistSpacing,
            leftHasBeam ? config.joistSpacing : 0,
            rightHasBeam ? config.joistSpacing : 0,
            3000
          )
        )
      )
    })

    const clippedHoles = expandedHoles
      .map(ensurePolygonIsClockwise)
      .flatMap(p => intersectPolygon({ outer: p, holes: [] }, { outer: joistArea, holes: [] }))
      .map(p => p.outer)

    const infillPolygons = subtractPolygons(
      [context.outerPolygon],
      [context.innerPolygon, ...joistPolygons.map(p => p.outer), ...wallBeamPolygons.map(p => p.outer), ...clippedHoles]
    )

    const wallBeams = wallBeamPolygons.map(
      p =>
        ({
          type: 'element',
          element: createConstructionElement(
            config.wallBeamMaterial,
            createExtrudedPolygon(p, 'xy', config.constructionHeight),
            undefined,
            undefined,
            { type: 'wall-beam' }
          )
        }) satisfies ConstructionResult
    )
    const joists = joistPolygons.map(
      p =>
        ({
          type: 'element',
          element: createConstructionElement(
            config.joistMaterial,
            createExtrudedPolygon(p, 'xy', config.constructionHeight),
            undefined,
            undefined,
            { type: 'joist' }
          )
        }) satisfies ConstructionResult
    )
    const wallInfill = infillPolygons.map(
      p =>
        ({
          type: 'element',
          element: createConstructionElement(
            config.wallInfillMaterial,
            createExtrudedPolygon(p, 'xy', config.constructionHeight)
          )
        }) satisfies ConstructionResult
    )
    const openingFrames = context.floorOpenings.flatMap(h =>
      Array.from(
        simplePolygonFrame(
          h,
          config.openingSideThickness,
          config.constructionHeight,
          config.openingSideMaterial,
          holeClip,
          { type: 'floor-opening-frame' },
          undefined,
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
            config.subfloorMaterial,
            createExtrudedPolygon(p, 'xy', config.subfloorThickness),
            translate(vec3.fromValues(0, 0, config.constructionHeight)),
            undefined,
            { type: 'subfloor' }
          )
        }) satisfies ConstructionResult
    )

    const results = [...wallBeams, ...joists, ...wallInfill, ...openingFrames, ...subfloor]
    const aggregatedResults = aggregateResults(results)

    const bounds = Bounds2D.fromPoints(context.outerPolygon.points).toBounds3D('xy', 0, config.constructionHeight)
    return {
      elements: [
        {
          id: createConstructionElementId(),
          bounds,
          transform: translate(vec3.fromValues(0, 0, -config.constructionHeight)),
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

  getTopOffset = (config: JoistFloorConfig) => config.subfloorThickness
  getBottomOffset = (_config: JoistFloorConfig) => 0
  getConstructionThickness = (config: JoistFloorConfig) => config.constructionHeight
}
