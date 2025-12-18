import type { Perimeter, PerimeterCorner } from '@/building/model/model'
import { createConstructionElement } from '@/construction/elements'
import type { ConstructionModel } from '@/construction/model'
import '@/construction/parts'
import { type ConstructionResult, aggregateResults, yieldArea, yieldElement } from '@/construction/results'
import { createExtrudedPolygon } from '@/construction/shapes'
import { TAG_PERIMETER_INSIDE, TAG_PERIMETER_OUTSIDE } from '@/construction/tags'
import {
  Bounds2D,
  type Polygon2D,
  eqVec2,
  lineFromPoints,
  lineIntersection,
  offsetPolygon,
  simplifyPolygon
} from '@/shared/geometry'

import type { FullRingBeamConfig, RingBeamAssembly } from './types'

export class FullRingBeamAssembly implements RingBeamAssembly<FullRingBeamConfig> {
  construct(perimeter: Perimeter, config: FullRingBeamConfig): ConstructionModel {
    const aggRes = aggregateResults([...this._constructFullRingBeam(perimeter, config)])
    const bounds2D = Bounds2D.fromPoints(perimeter.corners.map(c => c.outsidePoint))
    const bounds3D = bounds2D.toBounds3D('xy', 0, config.height)

    return {
      bounds: bounds3D,
      elements: aggRes.elements,
      measurements: aggRes.measurements,
      areas: aggRes.areas,
      errors: aggRes.errors,
      warnings: aggRes.warnings
    }
  }

  private *_constructFullRingBeam(perimeter: Perimeter, config: FullRingBeamConfig): Generator<ConstructionResult> {
    const insidePolygon: Polygon2D = { points: perimeter.corners.map(c => c.insidePoint) }
    const simplifiedPolygon = simplifyPolygon(insidePolygon)
    const beamInsidePolygon = offsetPolygon(simplifiedPolygon, config.offsetFromEdge).points
    const beamOutsidePolygon = offsetPolygon(simplifiedPolygon, config.offsetFromEdge + config.width).points

    const numCorners = simplifiedPolygon.points.length
    for (let currentStart = 0; currentStart < numCorners; currentStart++) {
      const previousStart = (currentStart - 1 + numCorners) % numCorners
      const currentEnd = (currentStart + 1) % numCorners
      const nextEnd = (currentStart + 2) % numCorners

      const startCorner = perimeter.corners.find((c: PerimeterCorner) =>
        eqVec2(c.insidePoint, simplifiedPolygon.points[currentStart])
      )
      const endCorner = perimeter.corners.find((c: PerimeterCorner) =>
        eqVec2(c.insidePoint, simplifiedPolygon.points[currentEnd])
      )

      const previousEdge =
        startCorner?.constructedByWall === 'previous'
          ? lineFromPoints(beamOutsidePolygon[previousStart], beamOutsidePolygon[currentStart])
          : lineFromPoints(beamInsidePolygon[previousStart], beamInsidePolygon[currentStart])
      const nextEdge =
        endCorner?.constructedByWall === 'next'
          ? lineFromPoints(beamOutsidePolygon[currentEnd], beamOutsidePolygon[nextEnd])
          : lineFromPoints(beamInsidePolygon[currentEnd], beamInsidePolygon[nextEnd])
      const insideEdge = lineFromPoints(beamInsidePolygon[currentStart], beamInsidePolygon[currentEnd])
      const outsideEdge = lineFromPoints(beamOutsidePolygon[currentStart], beamOutsidePolygon[currentEnd])

      if (!previousEdge || !nextEdge || !insideEdge || !outsideEdge) {
        throw new Error('Failed to create beam segment edges from polygon points')
      }

      const startInside = lineIntersection(previousEdge, insideEdge)
      const startOutside = lineIntersection(previousEdge, outsideEdge)
      const endInside = lineIntersection(nextEdge, insideEdge)
      const endOutside = lineIntersection(nextEdge, outsideEdge)

      if (!startInside || !startOutside || !endInside || !endOutside) {
        throw new Error('Failed to calculate beam segment corner intersections')
      }

      const polygon = { outer: { points: [startInside, endInside, endOutside, startOutside] }, holes: [] }
      const shape = createExtrudedPolygon(polygon, 'xy', config.height)

      yield* yieldElement(
        createConstructionElement(config.material, shape, undefined, undefined, { type: 'ring-beam' })
      )
    }

    yield yieldArea({
      type: 'polygon',
      areaType: 'outer-perimeter',
      renderPosition: 'bottom',
      plane: 'xy',
      polygon: { points: perimeter.corners.map(c => c.outsidePoint) },
      tags: [TAG_PERIMETER_OUTSIDE]
    })

    yield yieldArea({
      type: 'polygon',
      areaType: 'inner-perimeter',
      renderPosition: 'bottom',
      plane: 'xy',
      polygon: { points: perimeter.corners.map(c => c.insidePoint) },
      tags: [TAG_PERIMETER_INSIDE]
    })
  }
}
