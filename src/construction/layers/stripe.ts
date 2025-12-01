import { mat2, mat4, vec2, vec3 } from 'gl-matrix'

import { createConstructionElement } from '@/construction/elements'
import type { LayerConstruction, StripedLayerConfig } from '@/construction/layers/types'
import { polygonPartInfo } from '@/construction/parts'
import { type ConstructionResult, yieldElement, yieldWarning } from '@/construction/results'
import { createExtrudedPolygon } from '@/construction/shapes'
import {
  type Length,
  type Line2D,
  type Plane3D,
  type Polygon2D,
  type PolygonWithHoles2D,
  intersectPolygon,
  lineIntersection,
  perpendicular
} from '@/shared/geometry'

/**
 * Rotate vector v by ±45°, choosing the sign such that opposite vectors
 * do NOT produce parallel outputs (e.g. (0,1) vs (0,-1)).
 */
function rotate45(v: vec2): vec2 {
  // Determine sign of rotation:
  //  +1 for upper half-plane (y > 0 or y == 0 and x >= 0)
  //  -1 for lower half-plane
  const s = v[1] > 0 || (v[1] === 0 && v[0] >= 0) ? 1 : -1
  const angle = (s * Math.PI) / 4
  return vec2.normalize(vec2.create(), vec2.transformMat2(vec2.create(), v, mat2.fromRotation(mat2.create(), angle)))
}

export class StripedLayerConstruction implements LayerConstruction<StripedLayerConfig> {
  construct = function* (
    polygon: PolygonWithHoles2D,
    offset: Length,
    plane: Plane3D,
    config: StripedLayerConfig,
    supportDirection?: vec2
  ): Generator<ConstructionResult> {
    const position =
      plane === 'xy'
        ? vec3.fromValues(0, 0, offset)
        : plane === 'xz'
          ? vec3.fromValues(0, offset, 0)
          : vec3.fromValues(offset, 0, 0)

    const baseDir = supportDirection ?? vec2.fromValues(1, 0)
    const stripeDir =
      config.direction === 'perpendicular'
        ? perpendicular(baseDir)
        : config.direction === 'colinear'
          ? baseDir
          : rotate45(baseDir)
    const perpDir = perpendicular(stripeDir)

    const dots = polygon.outer.points.map(p => vec2.dot(p, perpDir))
    const stripesStart = polygon.outer.points[dots.indexOf(Math.min(...dots))]
    const totalSpan = Math.max(...dots) - Math.min(...dots)

    const dots2 = polygon.outer.points.map(p => vec2.dot(p, stripeDir))
    const stripeMin = polygon.outer.points[dots2.indexOf(Math.min(...dots2))]
    const stripeLength = Math.max(...dots2) - Math.min(...dots2)

    const stripeLine: Line2D = { point: stripesStart, direction: stripeDir }
    const perpLine: Line2D = { point: stripeMin, direction: perpDir }

    const intersection = lineIntersection(stripeLine, perpLine)

    if (!intersection) {
      yield yieldWarning('Could not determine stripe positions due to parallel lines.', [])
      return
    }

    const stepWidth = config.stripeWidth + config.gapWidth
    for (let offset = 0; offset < totalSpan; offset += stepWidth) {
      const clippedOffset = Math.min(offset, totalSpan - config.stripeWidth)
      const p1 = vec2.scaleAndAdd(vec2.create(), intersection, perpDir, clippedOffset)
      const p2 = vec2.scaleAndAdd(vec2.create(), p1, perpDir, config.stripeWidth)
      const p3 = vec2.scaleAndAdd(vec2.create(), p2, stripeDir, stripeLength)
      const p4 = vec2.scaleAndAdd(vec2.create(), p1, stripeDir, stripeLength)

      const stripePolygon: Polygon2D = { points: [p1, p2, p3, p4] }
      const stripes = intersectPolygon(polygon, { outer: stripePolygon, holes: [] })

      for (const stripe of stripes) {
        yield* yieldElement(
          createConstructionElement(
            config.stripeMaterial,
            createExtrudedPolygon(stripe, plane, config.thickness),
            mat4.fromTranslation(mat4.create(), position),
            undefined,
            polygonPartInfo('stripe', stripe.outer, plane, config.thickness)
          )
        )
      }
    }

    if (config.gapMaterial) {
      const lastGapEnd = totalSpan - config.stripeWidth
      for (let offset = config.stripeWidth; offset < lastGapEnd; offset += stepWidth) {
        const clippedWidth = Math.max(Math.min(config.gapWidth, lastGapEnd - offset), 0)
        if (clippedWidth > 0) {
          const p1 = vec2.scaleAndAdd(vec2.create(), intersection, perpDir, offset)
          const p2 = vec2.scaleAndAdd(vec2.create(), p1, perpDir, clippedWidth)
          const p3 = vec2.scaleAndAdd(vec2.create(), p2, stripeDir, stripeLength)
          const p4 = vec2.scaleAndAdd(vec2.create(), p1, stripeDir, stripeLength)

          const gapPolygon: Polygon2D = { points: [p1, p2, p3, p4] }
          const gaps = intersectPolygon(polygon, { outer: gapPolygon, holes: [] })

          for (const gap of gaps) {
            yield* yieldElement(
              createConstructionElement(
                config.gapMaterial,
                createExtrudedPolygon(gap, plane, config.thickness),
                mat4.fromTranslation(mat4.create(), position),
                undefined
              )
            )
          }
        }
      }
    }
  }
}
