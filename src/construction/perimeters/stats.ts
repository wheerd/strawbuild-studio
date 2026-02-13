import type { PerimeterWithGeometry } from '@/building/model'
import { isOpeningId } from '@/building/model/ids'
import { getModelActions } from '@/building/store'
import { getWallStoreyContextCached } from '@/construction/storeys/context'
import {
  type Area,
  type Length,
  type Volume,
  calculatePolygonArea,
  calculatePolygonWithHolesArea,
  polygonPerimeter,
  subtractPolygons
} from '@/shared/geometry'
import { assertUnreachable } from '@/shared/utils'

export interface PerimeterStats {
  footprint: Area
  totalFloorArea: Area

  totalConstructionWallArea: Area
  totalFinishedWallArea: Area
  totalExteriorWallArea: Area
  totalWindowArea: Area
  totalDoorArea: Area

  totalVolume: Volume

  storeyHeight: Length
  ceilingHeight: Length
}

export function getPerimeterStats(perimeter: PerimeterWithGeometry): PerimeterStats {
  const { getFloorOpeningsByStorey, getPerimeterWallById, getWallOpeningById } = getModelActions()

  const storeyContext = getWallStoreyContextCached(perimeter.storeyId)
  const storeyConstructionHeight = storeyContext.wallTop - storeyContext.floorBottom
  const constructionHeight = storeyContext.ceilingConstructionBottom - storeyContext.floorConstructionTop
  const finishedHeight = storeyContext.finishedCeilingBottom - storeyContext.finishedFloorTop

  const footprint = calculatePolygonArea(perimeter.outerPolygon)
  const innerArea = calculatePolygonArea(perimeter.innerPolygon)
  const floorHoles = getFloorOpeningsByStorey(perimeter.storeyId).map(a => a.area)
  const floorPolygons = subtractPolygons([perimeter.innerPolygon], floorHoles)
  const totalFloorArea = floorPolygons.map(calculatePolygonWithHolesArea).reduce((a, b) => a + b, 0)

  let totalConstructionLength = 0
  const totalInsideLength = polygonPerimeter(perimeter.innerPolygon)
  const totalOutsideLength = polygonPerimeter(perimeter.outerPolygon)
  let totalOpeningArea = 0
  let totalWindowArea = 0
  let totalDoorArea = 0

  for (const wallId of perimeter.wallIds) {
    const wall = getPerimeterWallById(wallId)
    totalConstructionLength += wall.wallLength

    for (const entityId of wall.entityIds) {
      if (!isOpeningId(entityId)) continue
      const opening = getWallOpeningById(entityId)
      const openingArea = opening.width * opening.height
      totalOpeningArea += openingArea
      switch (opening.openingType) {
        case 'window':
          totalWindowArea += openingArea
          break
        case 'door':
        case 'passage':
          totalDoorArea += openingArea
          break
        default:
          assertUnreachable(opening.openingType, 'Invalid opening type')
      }
    }
  }

  const totalConstructionWallArea = Math.max(totalConstructionLength * constructionHeight - totalOpeningArea, 0)
  const totalFinishedWallArea = Math.max(totalInsideLength * finishedHeight - totalOpeningArea, 0)
  const totalExteriorWallArea = Math.max(totalOutsideLength * storeyConstructionHeight - totalOpeningArea, 0)

  const totalVolume = innerArea * finishedHeight

  return {
    footprint,
    totalFloorArea,
    totalConstructionWallArea,
    totalFinishedWallArea,
    totalExteriorWallArea,
    totalWindowArea,
    totalDoorArea,
    totalVolume,
    storeyHeight: storeyContext.storeyHeight,
    ceilingHeight: finishedHeight
  }
}
