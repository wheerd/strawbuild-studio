import { vec2, vec3 } from 'gl-matrix'

import { createConstructionElement, createConstructionElementId } from '@/construction/elements'
import { translate } from '@/construction/geometry'
import type { MaterialId } from '@/construction/materials/material'
import { type ConstructionModel } from '@/construction/model'
import { polygonPartInfo } from '@/construction/parts'
import { type ConstructionResult, aggregateResults, yieldElement, yieldWarning } from '@/construction/results'
import { createExtrudedPolygon } from '@/construction/shapes'
import type { Tag } from '@/construction/tags'
import {
  Bounds2D,
  type Length,
  type Line2D,
  type LineSegment2D,
  type Polygon2D,
  type PolygonWithHoles2D,
  calculatePolygonArea,
  direction,
  ensurePolygonIsClockwise,
  intersectPolygon,
  lineIntersection,
  minimumAreaBoundingBox,
  offsetPolygon,
  perpendicular,
  perpendicularCW
} from '@/shared/geometry'

import { BaseFloorAssembly } from './base'
import type { FloorConstructionContext, JoistFloorConfig } from './types'

const EPSILON = 1e-5

export class JoistFloorAssembly extends BaseFloorAssembly<JoistFloorConfig> {
  construct = (context: FloorConstructionContext, config: JoistFloorConfig): ConstructionModel => {
    const bbox = minimumAreaBoundingBox(context.outerPolygon)
    const joistDirection = bbox.smallestDirection
    const insideSideEdges = Array.from(polygonEdges(context.innerPolygon))
      .map(e => ({ point: e.start, direction: direction(e.start, e.end) }) satisfies Line2D)
      .filter(l => 1 - Math.abs(vec2.dot(l.direction, joistDirection)) < EPSILON)

    const expandedHoles = context.openings.map(h => offsetPolygon(h, config.joistThickness))

    const clipPolygon: PolygonWithHoles2D = { outer: context.outerPolygon, holes: expandedHoles }

    const results = [
      ...insideSideEdges.flatMap(e =>
        Array.from(
          beam(
            e,
            clipPolygon,
            config.joistThickness,
            config.joistThickness,
            config.joistHeight,
            'material_window' as MaterialId, // config.joistMaterial,
            'wall-beam'
          )
        )
      ),
      ...simpleStripes(
        clipPolygon,
        joistDirection,
        config.joistThickness,
        config.joistHeight,
        config.joistSpacing,
        config.joistMaterial,
        'joist'
      ),
      ...context.openings.flatMap(h =>
        Array.from(
          simplePolygonFrame(
            h,
            config.joistThickness,
            config.joistHeight,
            config.joistMaterial,
            'joist-frame',
            undefined,
            false
          )
        )
      )
    ]

    const aggregatedResults = aggregateResults(results)

    const bounds = Bounds2D.fromPoints(context.outerPolygon.points).toBounds3D('xy', 0, config.joistHeight)
    return {
      elements: [
        {
          id: createConstructionElementId(),
          bounds,
          transform: translate(vec3.fromValues(0, 0, -config.joistHeight)),
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
  getConstructionThickness = (config: JoistFloorConfig) => config.joistHeight
}

function* beam(
  line: Line2D,
  clipPolygon: PolygonWithHoles2D,
  thicknessLeft: Length,
  thicknessRight: Length,
  height: Length,
  material: MaterialId,
  partType?: string,
  tags?: Tag[]
): Generator<ConstructionResult> {
  const leftDir = perpendicularCW(line.direction)
  const lineStart = vec2.scaleAndAdd(vec2.create(), line.point, line.direction, 1e6)
  const lineEnd = vec2.scaleAndAdd(vec2.create(), line.point, line.direction, -1e6)
  const p1 = vec2.scaleAndAdd(vec2.create(), lineStart, leftDir, thicknessLeft)
  const p2 = vec2.scaleAndAdd(vec2.create(), lineStart, leftDir, -thicknessRight)
  const p3 = vec2.scaleAndAdd(vec2.create(), lineEnd, leftDir, -thicknessRight)
  const p4 = vec2.scaleAndAdd(vec2.create(), lineEnd, leftDir, thicknessLeft)

  const beamPolygon: Polygon2D = { points: [p1, p2, p3, p4] }
  const beamParts = intersectPolygon(clipPolygon, { outer: beamPolygon, holes: [] })

  for (const part of beamParts) {
    const partInfo = partType ? polygonPartInfo(partType, part.outer, 'xy', height) : undefined
    yield* yieldElement(
      createConstructionElement(material, createExtrudedPolygon(part, 'xy', height), undefined, tags, partInfo)
    )
  }
}

function* simpleStripes(
  polygon: PolygonWithHoles2D,
  direction: vec2,
  thickness: Length,
  height: Length,
  spacing: Length,
  material: MaterialId,
  partType?: string,
  tags?: Tag[]
): Generator<ConstructionResult> {
  const perpDir = perpendicular(direction)

  const dots = polygon.outer.points.map(p => vec2.dot(p, perpDir))
  const joistStart = polygon.outer.points[dots.indexOf(Math.min(...dots))]
  const totalSpan = Math.max(...dots) - Math.min(...dots)

  const dots2 = polygon.outer.points.map(p => vec2.dot(p, direction))
  const joistMin = polygon.outer.points[dots2.indexOf(Math.min(...dots2))]
  const joistLength = Math.max(...dots2) - Math.min(...dots2)

  const joistLine: Line2D = { point: joistStart, direction: direction }
  const perpLine: Line2D = { point: joistMin, direction: perpDir }

  const intersection = lineIntersection(joistLine, perpLine)

  if (!intersection) {
    yield yieldWarning('Could not determine stripe positions due to parallel lines.', [])
    return
  }

  // Used to filter out tiny joist pieces (which are probably not needed)
  const minRelevantArea = (thickness * thickness) / 2

  const stepWidth = thickness + spacing
  const end = totalSpan + spacing
  for (let offset = 0; offset <= end; offset += stepWidth) {
    const clippedOffset = Math.min(offset, totalSpan - thickness)
    const p1 = vec2.scaleAndAdd(vec2.create(), intersection, perpDir, clippedOffset)
    const p2 = vec2.scaleAndAdd(vec2.create(), p1, perpDir, thickness)
    const p3 = vec2.scaleAndAdd(vec2.create(), p2, direction, joistLength)
    const p4 = vec2.scaleAndAdd(vec2.create(), p1, direction, joistLength)

    const joistPolygon: Polygon2D = { points: [p1, p2, p3, p4] }
    const joistParts = intersectPolygon(polygon, { outer: joistPolygon, holes: [] })

    for (const part of joistParts) {
      if (calculatePolygonArea(part.outer) < minRelevantArea) continue
      const partInfo = partType ? polygonPartInfo(partType, part.outer, 'xy', height) : undefined
      yield* yieldElement(
        createConstructionElement(material, createExtrudedPolygon(part, 'xy', height), undefined, tags, partInfo)
      )
    }
  }
}

function* simplePolygonFrame(
  polygon: Polygon2D,
  thickness: Length,
  height: Length,
  material: MaterialId,
  partType?: string,
  tags?: Tag[],
  inside = true
): Generator<ConstructionResult> {
  polygon = ensurePolygonIsClockwise(polygon)
  const outerPolygon = inside ? polygon : offsetPolygon(polygon, thickness)
  const innerPolygon = inside ? offsetPolygon(polygon, -thickness) : polygon

  if (outerPolygon.points.length === innerPolygon.points.length) {
    const l = outerPolygon.points.length
    for (let i0 = 0; i0 < l; i0++) {
      const i1 = (i0 + 1) % l
      const innerStart = innerPolygon.points[i0]
      const innerEnd = innerPolygon.points[i1]
      const outsideStart = closestPoint(innerStart, outerPolygon.points)
      const outsideEnd = closestPoint(innerEnd, outerPolygon.points)

      const elementPolygon: PolygonWithHoles2D = {
        outer: {
          // points: [outerPolygon.points[i0], outerPolygon.points[i1], innerPolygon.points[i1], innerPolygon.points[i0]]
          points: [innerStart, innerEnd, outsideEnd, outsideStart]
        },
        holes: []
      }
      const partInfo = partType ? polygonPartInfo(partType, elementPolygon.outer, 'xy', height) : undefined
      yield* yieldElement(
        createConstructionElement(
          material,
          createExtrudedPolygon(elementPolygon, 'xy', height),
          undefined,
          tags,
          partInfo
        )
      )
    }
  }
}

export function closestPoint(reference: vec2, points: vec2[]): vec2 {
  if (points.length === 0) {
    throw new Error("closestPoint: 'points' array must not be empty.")
  }

  let closest = points[0]
  let minDistSq = vec2.sqrDist(reference, closest)

  for (let i = 1; i < points.length; i++) {
    const p = points[i]
    const distSq = vec2.sqrDist(reference, p)
    if (distSq < minDistSq) {
      minDistSq = distSq
      closest = p
    }
  }

  return vec2.clone(closest)
}

function* polygonEdges(polygon: Polygon2D): Generator<LineSegment2D> {
  for (let i0 = 0; i0 < polygon.points.length; i0++) {
    const i1 = (i0 + 1) % polygon.points.length
    yield {
      start: polygon.points[i0],
      end: polygon.points[i1]
    }
  }
}
