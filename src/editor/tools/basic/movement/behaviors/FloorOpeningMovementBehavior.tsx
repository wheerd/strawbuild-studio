
import type { SelectableId } from '@/building/model/ids'
import { isFloorOpeningId } from '@/building/model/ids'
import type { FloorArea, FloorOpening, Perimeter } from '@/building/model/model'
import type { StoreActions } from '@/building/store/types'
import type { SnappingContext } from '@/editor/services/snapping/types'
import type { MovementContext } from '@/editor/tools/basic/movement/MovementBehavior'
import { type Polygon2D, type Vec2 } from '@/shared/geometry'

import {
  type PolygonEntityContext,
  PolygonMovementBehavior,
  type PolygonMovementState
} from './PolygonMovementBehavior'
import { createPolygonSegments } from './polygonUtils'

export interface FloorOpeningEntityContext extends PolygonEntityContext {
  opening: FloorOpening
}

export type FloorOpeningMovementState = PolygonMovementState

function buildSnapContext(perimeters: Perimeter[], areas: FloorArea[], openings: FloorOpening[]): SnappingContext {
  const perimeterPoints = perimeters.flatMap(perimeter => perimeter.corners.map(corner => corner.insidePoint))
  const perimeterSegments = perimeters.flatMap(perimeter => perimeter.walls.map(wall => wall.insideLine))

  const areaPoints = areas.flatMap(area => area.area.points)
  const areaSegments = areas.flatMap(area => createPolygonSegments(area.area.points))

  const openingPoints = openings.flatMap(opening => opening.area.points)
  const openingSegments = openings.flatMap(opening => createPolygonSegments(opening.area.points))

  return {
    snapPoints: [...perimeterPoints, ...areaPoints, ...openingPoints],
    alignPoints: [...perimeterPoints, ...areaPoints, ...openingPoints],
    referenceLineSegments: [...perimeterSegments, ...areaSegments, ...openingSegments]
  }
}

export class FloorOpeningMovementBehavior extends PolygonMovementBehavior<FloorOpeningEntityContext> {
  getEntity(entityId: SelectableId, _parentIds: SelectableId[], store: StoreActions): FloorOpeningEntityContext {
    if (!isFloorOpeningId(entityId)) {
      throw new Error(`Invalid floor opening id ${entityId}`)
    }

    const opening = store.getFloorOpeningById(entityId)
    if (!opening) {
      throw new Error(`Unable to locate floor opening ${entityId}`)
    }

    const floorAreas = store.getFloorAreasByStorey(opening.storeyId)
    const perimeters = store.getPerimetersByStorey(opening.storeyId)
    const otherOpenings = store.getFloorOpeningsByStorey(opening.storeyId).filter(o => o.id !== opening.id)

    return {
      opening,
      snapContext: buildSnapContext(perimeters, floorAreas, otherOpenings)
    }
  }

  protected getPolygonPoints(context: MovementContext<FloorOpeningEntityContext>): readonly Vec2[] {
    return context.entity.opening.area.points
  }

  protected applyMovementDelta(delta: Vec2, context: MovementContext<FloorOpeningEntityContext>): boolean {
    const newPolygon: Polygon2D = {
      points: this.translatePoints(context.entity.opening.area.points, delta)
    }

    return context.store.updateFloorOpening(context.entity.opening.id, newPolygon)
  }
}
