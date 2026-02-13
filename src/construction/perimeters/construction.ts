import type { PerimeterWithGeometry } from '@/building/model'
import { getModelActions } from '@/building/store'
import { getPerimeterContextCached } from '@/construction/derived'
import { polygonEdges } from '@/construction/helpers'
import type { RawMeasurement } from '@/construction/measurements'
import type { ConstructionModel } from '@/construction/model'
import { getWallStoreyContextCached } from '@/construction/storeys/context'
import {
  TAG_WALL_CONSTRUCTION_LENGTH_INSIDE,
  TAG_WALL_CONSTRUCTION_LENGTH_OUTSIDE,
  TAG_WALL_LENGTH_INSIDE,
  TAG_WALL_LENGTH_OUTSIDE
} from '@/construction/tags'
import { Bounds3D, direction, newVec3, perpendicularCCW, perpendicularCW, scaleAddVec2 } from '@/shared/geometry'

export function createPerimeterMeasurementsModel(perimeter: PerimeterWithGeometry): ConstructionModel {
  const { getPerimeterWallById, getPerimeterCornerById } = getModelActions()
  const storeyContext = getWallStoreyContextCached(perimeter.storeyId)
  const perimeterContext = getPerimeterContextCached(perimeter.id)
  const measurements: RawMeasurement[] = []

  for (const wallId of perimeter.wallIds) {
    const wall = getPerimeterWallById(wallId)
    const corner = getPerimeterCornerById(wall.startCornerId)
    const nextCorner = getPerimeterCornerById(wall.endCornerId)

    const insideStart = newVec3(corner.insidePoint[0], corner.insidePoint[1], storeyContext.finishedFloorTop)
    const insideEnd = newVec3(nextCorner.insidePoint[0], nextCorner.insidePoint[1], storeyContext.finishedFloorTop)

    const insideExtend1In2D = scaleAddVec2(corner.insidePoint, wall.outsideDirection, wall.thickness)
    const insideExtend1 = newVec3(insideExtend1In2D[0], insideExtend1In2D[1], storeyContext.finishedFloorTop)
    const insideExtend2 = newVec3(corner.insidePoint[0], corner.insidePoint[1], storeyContext.finishedCeilingBottom)

    measurements.push({
      startPoint: insideStart,
      endPoint: insideEnd,
      extend1: insideExtend1,
      extend2: insideExtend2,
      tags: [TAG_WALL_LENGTH_INSIDE]
    })

    const outsideStart = newVec3(corner.outsidePoint[0], corner.outsidePoint[1], storeyContext.floorBottom)
    const outsideEnd = newVec3(nextCorner.outsidePoint[0], nextCorner.outsidePoint[1], storeyContext.floorBottom)

    const outsideExtend1In2D = scaleAddVec2(corner.outsidePoint, wall.outsideDirection, -wall.thickness)
    const outsideExtend1 = newVec3(outsideExtend1In2D[0], outsideExtend1In2D[1], storeyContext.floorBottom)
    const outsideExtend2 = newVec3(corner.outsidePoint[0], corner.outsidePoint[1], storeyContext.wallTop)

    measurements.push({
      startPoint: outsideStart,
      endPoint: outsideEnd,
      extend1: outsideExtend1,
      extend2: outsideExtend2,
      tags: [TAG_WALL_LENGTH_OUTSIDE]
    })
  }

  for (const edge of polygonEdges(perimeterContext.innerPolygon)) {
    const outDirection = perpendicularCCW(direction(edge.start, edge.end))
    const extend1In2D = scaleAddVec2(edge.start, outDirection, 10)
    const extend1 = newVec3(extend1In2D[0], extend1In2D[1], storeyContext.wallBottom)
    const extend2 = newVec3(edge.start[0], edge.start[1], storeyContext.wallTop)

    measurements.push({
      startPoint: newVec3(edge.start[0], edge.start[1], storeyContext.wallBottom),
      endPoint: newVec3(edge.end[0], edge.end[1], storeyContext.wallBottom),
      extend1,
      extend2,
      tags: [TAG_WALL_CONSTRUCTION_LENGTH_INSIDE]
    })
  }

  for (const edge of polygonEdges(perimeterContext.outerPolygon)) {
    const inDirection = perpendicularCW(direction(edge.start, edge.end))
    const extend1In2D = scaleAddVec2(edge.start, inDirection, 10)
    const extend1 = newVec3(extend1In2D[0], extend1In2D[1], storeyContext.wallBottom)
    const extend2 = newVec3(edge.start[0], edge.start[1], storeyContext.wallTop)
    measurements.push({
      startPoint: newVec3(edge.start[0], edge.start[1], storeyContext.wallBottom),
      endPoint: newVec3(edge.end[0], edge.end[1], storeyContext.wallBottom),
      extend1,
      extend2,
      tags: [TAG_WALL_CONSTRUCTION_LENGTH_OUTSIDE]
    })
  }

  return {
    measurements,
    areas: [],
    bounds: Bounds3D.EMPTY,
    elements: [],
    errors: [],
    warnings: []
  }
}
