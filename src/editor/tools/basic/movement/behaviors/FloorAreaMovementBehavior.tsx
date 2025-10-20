import type { vec2 } from 'gl-matrix'

import type { SelectableId } from '@/building/model/ids'
import { isFloorAreaId } from '@/building/model/ids'
import type { FloorArea, FloorOpening, Perimeter } from '@/building/model/model'
import type { StoreActions } from '@/building/store/types'
import type { SnappingContext } from '@/editor/services/snapping/types'
import type { MovementContext } from '@/editor/tools/basic/movement/MovementBehavior'
import { type Polygon2D } from '@/shared/geometry'

import {
  type PolygonEntityContext,
  PolygonMovementBehavior,
  type PolygonMovementState
} from './PolygonMovementBehavior'
import { createPolygonSegments } from './polygonUtils'

export interface FloorAreaEntityContext extends PolygonEntityContext {
  floorArea: FloorArea
}

export type FloorAreaMovementState = PolygonMovementState

function buildSnapContext(perimeters: Perimeter[], otherAreas: FloorArea[], openings: FloorOpening[]): SnappingContext {
  const perimeterPoints = perimeters.flatMap(perimeter => perimeter.corners.map(corner => corner.insidePoint))
  const perimeterSegments = perimeters.flatMap(perimeter => perimeter.walls.map(wall => wall.insideLine))

  const areaPoints = otherAreas.flatMap(area => area.area.points)
  const areaSegments = otherAreas.flatMap(area => createPolygonSegments(area.area.points))

  const openingPoints = openings.flatMap(opening => opening.area.points)
  const openingSegments = openings.flatMap(opening => createPolygonSegments(opening.area.points))

  return {
    snapPoints: [...perimeterPoints, ...areaPoints, ...openingPoints],
    alignPoints: [...perimeterPoints, ...areaPoints, ...openingPoints],
    referenceLineSegments: [...perimeterSegments, ...areaSegments, ...openingSegments]
  }
}

export class FloorAreaMovementBehavior extends PolygonMovementBehavior<FloorAreaEntityContext> {
  getEntity(entityId: SelectableId, _parentIds: SelectableId[], store: StoreActions): FloorAreaEntityContext {
    if (!isFloorAreaId(entityId)) {
      throw new Error(`Invalid floor area id ${entityId}`)
    }

    const floorArea = store.getFloorAreaById(entityId)
    if (!floorArea) {
      throw new Error(`Unable to locate floor area ${entityId}`)
    }

    const perimeters = store.getPerimetersByStorey(floorArea.storeyId)
    const otherAreas = store.getFloorAreasByStorey(floorArea.storeyId).filter(area => area.id !== floorArea.id)
    const openings = store.getFloorOpeningsByStorey(floorArea.storeyId)

    return {
      floorArea,
      snapContext: buildSnapContext(perimeters, otherAreas, openings)
    }
  }

  protected getPolygonPoints(context: MovementContext<FloorAreaEntityContext>): readonly vec2[] {
    return context.entity.floorArea.area.points
  }

  protected applyMovementDelta(delta: vec2, context: MovementContext<FloorAreaEntityContext>): boolean {
    const newPolygon: Polygon2D = {
      points: this.translatePoints(context.entity.floorArea.area.points, delta)
    }

    return context.store.updateFloorArea(context.entity.floorArea.id, newPolygon)
  }
}
