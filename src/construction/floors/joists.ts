import { vec2, vec3 } from 'gl-matrix'

import { type ConstructionElement, createConstructionElement } from '@/construction/elements'
import { translate } from '@/construction/geometry'
import { type ConstructionModel, createUnsupportedModel } from '@/construction/model'
import { polygonPartInfo } from '@/construction/parts'
import { createExtrudedPolygon } from '@/construction/shapes'
import {
  Bounds2D,
  type Line2D,
  type Polygon2D,
  type PolygonWithHoles2D,
  intersectPolygon,
  lineIntersection,
  minimumAreaBoundingBox,
  perpendicular
} from '@/shared/geometry'

import { BaseFloorAssembly } from './base'
import type { JoistFloorConfig } from './types'

export class JoistFloorAssembly extends BaseFloorAssembly<JoistFloorConfig> {
  construct = (polygon: PolygonWithHoles2D, config: JoistFloorConfig): ConstructionModel => {
    const bbox = minimumAreaBoundingBox(polygon.outer)
    const joistDirection = bbox.smallestDirection
    const perpDir = perpendicular(joistDirection)

    const dots = polygon.outer.points.map(p => vec2.dot(p, perpDir))
    const joistStart = polygon.outer.points[dots.indexOf(Math.min(...dots))]
    const totalSpan = Math.max(...dots) - Math.min(...dots)

    const dots2 = polygon.outer.points.map(p => vec2.dot(p, joistDirection))
    const joistMin = polygon.outer.points[dots2.indexOf(Math.min(...dots2))]
    const joistLength = Math.max(...dots2) - Math.min(...dots2)

    const joistLine: Line2D = { point: joistStart, direction: joistDirection }
    const perpLine: Line2D = { point: joistMin, direction: perpDir }

    const intersection = lineIntersection(joistLine, perpLine)

    if (!intersection) {
      return createUnsupportedModel('Could not determine joist positions due to parallel lines.')
    }

    const joists: ConstructionElement[] = []
    const stepWidth = config.joistThickness + config.joistSpacing
    for (let offset = 0; offset < totalSpan; offset += stepWidth) {
      const clippedOffset = Math.min(offset, totalSpan - config.joistThickness)
      const p1 = vec2.scaleAndAdd(vec2.create(), intersection, perpDir, clippedOffset)
      const p2 = vec2.scaleAndAdd(vec2.create(), p1, perpDir, config.joistThickness)
      const p3 = vec2.scaleAndAdd(vec2.create(), p2, joistDirection, joistLength)
      const p4 = vec2.scaleAndAdd(vec2.create(), p1, joistDirection, joistLength)

      const joistPolygon: Polygon2D = { points: [p1, p2, p3, p4] }
      const joistParts = intersectPolygon(polygon, { outer: joistPolygon, holes: [] })

      for (const part of joistParts) {
        joists.push(
          createConstructionElement(
            config.joistMaterial,
            createExtrudedPolygon(part, 'xy', config.joistHeight),
            translate(vec3.fromValues(0, 0, -config.joistHeight)),
            undefined,
            polygonPartInfo('joist', part.outer, 'xy', config.joistHeight)
          )
        )
      }
    }

    return {
      elements: joists,
      areas: [],
      bounds: Bounds2D.fromPoints(polygon.outer.points).toBounds3D('xy', 0, config.joistHeight),
      errors: [],
      measurements: [],
      warnings: []
    }
  }

  getTopOffset = (config: JoistFloorConfig) => config.subfloorThickness
  getBottomOffset = (_config: JoistFloorConfig) => 0
  getConstructionThickness = (config: JoistFloorConfig) => config.joistHeight
}
