import { createConstructionElement } from '@/construction/elements'
import type { LayerConstruction, StripedLayerConfig } from '@/construction/layers/types'
import { type ConstructionResult, yieldElement, yieldWarning } from '@/construction/results'
import { createExtrudedPolygon } from '@/construction/shapes'
import {
  type Length,
  type Line2D,
  type Plane3D,
  type Polygon2D,
  type PolygonWithHoles2D,
  type Vec2,
  ZERO_VEC2,
  dotVec2,
  fromTrans,
  intersectPolygon,
  lineIntersection,
  newVec2,
  newVec3,
  normVec2,
  perpendicular,
  rotateVec2,
  scaleAddVec2
} from '@/shared/geometry'

/**
 * Rotate vector v by ±45°, choosing the sign such that opposite vectors
 * do NOT produce parallel outputs (e.g. (0,1) vs (0,-1)).
 */
function rotate45(v: Vec2): Vec2 {
  // Determine sign of rotation:
  //  +1 for upper half-plane (y > 0 or y == 0 and x >= 0)
  //  -1 for lower half-plane
  const s = v[1] > 0 || (v[1] === 0 && v[0] >= 0) ? 1 : -1
  const angle = (s * Math.PI) / 4
  return normVec2(rotateVec2(v, ZERO_VEC2, angle))
}

export class StripedLayerConstruction implements LayerConstruction<StripedLayerConfig> {
  construct = function* (
    polygon: PolygonWithHoles2D,
    offset: Length,
    plane: Plane3D,
    config: StripedLayerConfig,
    supportDirection?: Vec2
  ): Generator<ConstructionResult> {
    const position =
      plane === 'xy' ? newVec3(0, 0, offset) : plane === 'xz' ? newVec3(0, offset, 0) : newVec3(offset, 0, 0)

    const baseDir = supportDirection ?? newVec2(1, 0)
    const stripeDir =
      config.direction === 'perpendicular'
        ? perpendicular(baseDir)
        : config.direction === 'colinear'
          ? baseDir
          : rotate45(baseDir)
    const perpDir = perpendicular(stripeDir)

    const dots = polygon.outer.points.map(p => dotVec2(p, perpDir))
    const stripesStart = polygon.outer.points[dots.indexOf(Math.min(...dots))]
    const totalSpan = Math.max(...dots) - Math.min(...dots)

    const dots2 = polygon.outer.points.map(p => dotVec2(p, stripeDir))
    const stripeMin = polygon.outer.points[dots2.indexOf(Math.min(...dots2))]
    const stripeLength = Math.max(...dots2) - Math.min(...dots2)

    const stripeLine: Line2D = { point: stripesStart, direction: stripeDir }
    const perpLine: Line2D = { point: stripeMin, direction: perpDir }

    const intersection = lineIntersection(stripeLine, perpLine)

    if (!intersection) {
      yield yieldWarning($ => $.construction.layer.parallelLines, undefined, [])
      return
    }

    const stepWidth = config.stripeWidth + config.gapWidth
    for (let offset = 0; offset < totalSpan; offset += stepWidth) {
      const clippedOffset = Math.min(offset, totalSpan - config.stripeWidth)
      const p1 = scaleAddVec2(intersection, perpDir, clippedOffset)
      const p2 = scaleAddVec2(p1, perpDir, config.stripeWidth)
      const p3 = scaleAddVec2(p2, stripeDir, stripeLength)
      const p4 = scaleAddVec2(p1, stripeDir, stripeLength)

      const stripePolygon: Polygon2D = { points: [p1, p2, p3, p4] }
      const stripes = intersectPolygon(polygon, { outer: stripePolygon, holes: [] })

      for (const stripe of stripes) {
        yield* yieldElement(
          createConstructionElement(
            config.stripeMaterial,
            createExtrudedPolygon(stripe, plane, config.thickness),
            fromTrans(position)
          )
        )
      }
    }

    if (config.gapMaterial) {
      const lastGapEnd = totalSpan - config.stripeWidth
      for (let offset = config.stripeWidth; offset < lastGapEnd; offset += stepWidth) {
        const clippedWidth = Math.max(Math.min(config.gapWidth, lastGapEnd - offset), 0)
        if (clippedWidth > 0) {
          const p1 = scaleAddVec2(intersection, perpDir, offset)
          const p2 = scaleAddVec2(p1, perpDir, clippedWidth)
          const p3 = scaleAddVec2(p2, stripeDir, stripeLength)
          const p4 = scaleAddVec2(p1, stripeDir, stripeLength)

          const gapPolygon: Polygon2D = { points: [p1, p2, p3, p4] }
          const gaps = intersectPolygon(polygon, { outer: gapPolygon, holes: [] })

          for (const gap of gaps) {
            yield* yieldElement(
              createConstructionElement(
                config.gapMaterial,
                createExtrudedPolygon(gap, plane, config.thickness),
                fromTrans(position),
                undefined
              )
            )
          }
        }
      }
    }
  }
}
