
import type { SelectableId } from '@/building/model/ids'
import { isRoofId } from '@/building/model/ids'
import type { Perimeter, Roof } from '@/building/model/model'
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

export interface RoofEntityContext extends PolygonEntityContext {
  roof: Roof
}

export type RoofMovementState = PolygonMovementState

function buildSnapContext(perimeters: Perimeter[], otherRoofs: Roof[]): SnappingContext {
  // Only snap to outer points and outer edges of perimeters
  const perimeterPoints = perimeters.flatMap(perimeter => perimeter.corners.map(corner => corner.outsidePoint))
  const perimeterSegments = perimeters.flatMap(perimeter => perimeter.walls.map(wall => wall.outsideLine))

  const roofPoints = otherRoofs.flatMap(roof => roof.referencePolygon.points)
  const roofSegments = otherRoofs.flatMap(roof => createPolygonSegments(roof.referencePolygon.points))

  return {
    snapPoints: [...perimeterPoints, ...roofPoints],
    referenceLineSegments: [...perimeterSegments, ...roofSegments]
  }
}

export class RoofMovementBehavior extends PolygonMovementBehavior<RoofEntityContext> {
  getEntity(entityId: SelectableId, _parentIds: SelectableId[], store: StoreActions): RoofEntityContext {
    if (!isRoofId(entityId)) {
      throw new Error(`Invalid roof id ${entityId}`)
    }

    const roof = store.getRoofById(entityId)
    if (!roof) {
      throw new Error(`Unable to locate roof ${entityId}`)
    }

    const perimeters = store.getPerimetersByStorey(roof.storeyId)
    const otherRoofs = store.getRoofsByStorey(roof.storeyId).filter(r => r.id !== roof.id)

    return {
      roof,
      snapContext: buildSnapContext(perimeters, otherRoofs)
    }
  }

  protected getPolygonPoints(context: MovementContext<RoofEntityContext>): readonly Vec2[] {
    return context.entity.roof.referencePolygon.points
  }

  protected applyMovementDelta(delta: Vec2, context: MovementContext<RoofEntityContext>): boolean {
    const newPolygon: Polygon2D = {
      points: this.translatePoints(context.entity.roof.referencePolygon.points, delta)
    }

    return context.store.updateRoofArea(context.entity.roof.id, newPolygon)
  }
}
