import { vec2, vec3 } from 'gl-matrix'

import { getConfigActions } from '@/construction/config'
import { createConstructionElement, createConstructionElementId } from '@/construction/elements'
import { translate } from '@/construction/geometry'
import {
  partitionByAlignedEdges,
  polygonEdges,
  polygonFromLineIntersections,
  simplePolygonFrame,
  stripesPolygons
} from '@/construction/helpers'
import type { ConstructionModel } from '@/construction/model'
import { polygonPartInfo } from '@/construction/parts'
import { type ConstructionResult, aggregateResults } from '@/construction/results'
import { createExtrudedPolygon } from '@/construction/shapes'
import { TAG_STRAW_INFILL } from '@/construction/tags'
import {
  Bounds2D,
  type Polygon2D,
  direction,
  isPointStrictlyInPolygon,
  midpoint,
  minimumAreaBoundingBox,
  offsetLine,
  offsetPolygon,
  perpendicular,
  subtractPolygons
} from '@/shared/geometry'

import { BaseFloorAssembly } from './base'
import type { FilledFloorConfig, FloorConstructionContext } from './types'

const EPSILON = 1e-5

export class FilledFloorAssembly extends BaseFloorAssembly<FilledFloorConfig> {
  construct = (context: FloorConstructionContext, config: FilledFloorConfig): ConstructionModel => {
    const bbox = minimumAreaBoundingBox(context.outerPolygon)
    const joistDirection = bbox.smallestDirection

    const wallBeamCheckPoints = [...polygonEdges(context.innerPolygon)]
      .filter(e => 1 - Math.abs(vec2.dot(direction(e.start, e.end), joistDirection)) < EPSILON)
      .map(e => midpoint(e.start, e.end))

    const joistArea = polygonFromLineIntersections(
      context.innerLines.map((l, i) =>
        1 - Math.abs(vec2.dot(l.direction, joistDirection)) < EPSILON
          ? offsetLine(l, -config.frameThickness)
          : offsetLine(context.outerLines[i], config.frameThickness)
      )
    )

    const frame = Array.from(
      simplePolygonFrame(
        context.outerPolygon,
        config.frameThickness,
        config.constructionHeight,
        config.frameMaterial,
        undefined,
        'floor-frame',
        undefined,
        true
      )
    )

    const partitions = Array.from(partitionByAlignedEdges(joistArea, joistDirection))
    const expandedHoles = context.openings.map(h => offsetPolygon(h, config.openingFrameThickness))
    const joistPolygons = partitions.flatMap(p => {
      const { leftHasBeam, rightHasBeam } = detectBeamEdges(p, joistDirection, wallBeamCheckPoints)

      return subtractPolygons([p], expandedHoles).flatMap(p =>
        Array.from(
          stripesPolygons(
            p,
            joistDirection,
            config.joistThickness,
            config.joistSpacing,
            leftHasBeam ? 0 : config.joistSpacing,
            rightHasBeam ? 0 : config.joistSpacing,
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
            config.joistMaterial,
            createExtrudedPolygon(p, 'xy', config.constructionHeight),
            undefined,
            undefined,
            polygonPartInfo('joist', p.outer, 'xy', config.constructionHeight)
          )
        }) satisfies ConstructionResult
    )

    const strawMaterial = config.strawMaterial ?? getConfigActions().getDefaultStrawMaterial()

    const infillArea = offsetPolygon(context.outerPolygon, -config.frameThickness)
    const infillPolygons = subtractPolygons([infillArea], [...joistPolygons.map(p => p.outer), ...expandedHoles])
    const infill = infillPolygons.map(
      p =>
        ({
          type: 'element',
          element: createConstructionElement(
            strawMaterial,
            createExtrudedPolygon(p, 'xy', config.constructionHeight),
            undefined,
            [TAG_STRAW_INFILL]
          )
        }) satisfies ConstructionResult
    )

    const openingFrames = context.openings.flatMap(h =>
      Array.from(
        simplePolygonFrame(
          h,
          config.openingFrameThickness,
          config.constructionHeight,
          config.openingFrameMaterial,
          joistArea,
          'floor-opening-frame',
          undefined,
          false
        )
      )
    )

    const totalThickness = config.bottomCladdingThickness + config.constructionHeight + config.subfloorThickness
    const bounds2D = Bounds2D.fromPoints(context.outerPolygon.points)
    const floorPolygons = subtractPolygons([context.outerPolygon], context.openings)
    const subfloor = {
      id: createConstructionElementId(),
      bounds: bounds2D.toBounds3D('xy', 0, config.subfloorThickness),
      transform: translate(vec3.fromValues(0, 0, -config.subfloorThickness)),
      children: floorPolygons.map(p =>
        createConstructionElement(
          config.subfloorMaterial,
          createExtrudedPolygon(p, 'xy', config.subfloorThickness),
          undefined,
          undefined,
          polygonPartInfo('subfloor', p.outer, 'xy', config.subfloorThickness)
        )
      )
    }
    const bottomCladding = {
      id: createConstructionElementId(),
      bounds: bounds2D.toBounds3D('xy', 0, config.bottomCladdingThickness),
      transform: translate(vec3.fromValues(0, 0, -totalThickness)),
      children: floorPolygons.map(p =>
        createConstructionElement(
          config.bottomCladdingMaterial,
          createExtrudedPolygon(p, 'xy', config.bottomCladdingThickness),
          undefined,
          undefined,
          polygonPartInfo('bottom-cladding', p.outer, 'xy', config.bottomCladdingThickness)
        )
      )
    }

    const floorResults = [...joists, ...frame, ...openingFrames, ...infill]
    const aggregatedResults = aggregateResults(floorResults)

    return {
      elements: [
        subfloor,
        {
          id: createConstructionElementId(),
          bounds: bounds2D.toBounds3D('xy', 0, config.constructionHeight),
          transform: translate(vec3.fromValues(0, 0, -config.constructionHeight - config.subfloorThickness)),
          children: aggregatedResults.elements
        },
        bottomCladding
      ],
      areas: aggregatedResults.areas,
      bounds: bounds2D.toBounds3D('xy', 0, -totalThickness),
      errors: aggregatedResults.errors,
      measurements: aggregatedResults.measurements,
      warnings: aggregatedResults.warnings
    }
  }

  getTopOffset = (_config: FilledFloorConfig) => 0
  getBottomOffset = (_config: FilledFloorConfig) => 0
  getConstructionThickness = (config: FilledFloorConfig) =>
    config.bottomCladdingThickness + config.constructionHeight + config.subfloorThickness
}

function detectBeamEdges(
  partition: Polygon2D,
  joistDirection: vec2,
  wallBeamCheckPoints: vec2[]
): { leftHasBeam: boolean; rightHasBeam: boolean } {
  if (partition.points.length === 0 || wallBeamCheckPoints.length === 0) {
    return { leftHasBeam: false, rightHasBeam: false }
  }

  const perpDir = perpendicular(joistDirection)

  // Find left and right boundaries of partition (min/max perpendicular projections)
  const projections = partition.points.map(p => vec2.dot(p, perpDir))
  const leftProjection = Math.min(...projections)
  const rightProjection = Math.max(...projections)
  const centerProjection = (leftProjection + rightProjection) / 2

  let leftHasBeam = false
  let rightHasBeam = false

  for (const checkPoint of wallBeamCheckPoints) {
    if (isPointStrictlyInPolygon(checkPoint, partition)) {
      const projection = vec2.dot(checkPoint, perpDir)

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
