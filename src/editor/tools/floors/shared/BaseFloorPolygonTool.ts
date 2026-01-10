import { getModelActions } from '@/building/store'
import { polygonEdges } from '@/construction/helpers'
import { getViewModeActions } from '@/editor/hooks/useViewMode'
import type { SnappingContext } from '@/editor/services/snapping/types'
import { BasePolygonTool, type PolygonToolStateBase } from '@/editor/tools/shared/polygon/BasePolygonTool'
import type { LineSegment2D, Vec2 } from '@/shared/geometry'

const createPolygonSegments = (points: readonly Vec2[]): LineSegment2D[] => {
  if (points.length < 2) return []

  const segments: LineSegment2D[] = []
  for (let index = 0; index < points.length; index += 1) {
    const start = points[index]
    const end = points[(index + 1) % points.length]
    segments.push({ start, end })
  }
  return segments
}

export abstract class BaseFloorPolygonTool<TState extends PolygonToolStateBase> extends BasePolygonTool<TState> {
  protected extendSnapContext(context: SnappingContext): SnappingContext {
    const { getPerimetersByStorey, getFloorAreasByStorey, getFloorOpeningsByStorey, getActiveStoreyId } =
      getModelActions()

    const activeStoreyId = getActiveStoreyId()
    const perimeters = getPerimetersByStorey(activeStoreyId)
    const floorAreas = getFloorAreasByStorey(activeStoreyId)
    const floorOpenings = getFloorOpeningsByStorey(activeStoreyId)

    const perimeterPoints = perimeters.flatMap(perimeter => perimeter.outerPolygon.points)
    const perimeterSegments = perimeters.flatMap(perimeter => [
      ...polygonEdges(perimeter.innerPolygon),
      ...polygonEdges(perimeter.outerPolygon)
    ])

    const areaPoints = floorAreas.flatMap(area => area.area.points)
    const areaSegments = floorAreas.flatMap(area => createPolygonSegments(area.area.points))

    const openingPoints = floorOpenings.flatMap(opening => opening.area.points)
    const openingSegments = floorOpenings.flatMap(opening => createPolygonSegments(opening.area.points))

    return {
      ...context,
      snapPoints: [...context.snapPoints, ...perimeterPoints, ...areaPoints, ...openingPoints],
      alignPoints: [...(context.alignPoints ?? []), ...perimeterPoints, ...areaPoints, ...openingPoints],
      referenceLineSegments: [
        ...(context.referenceLineSegments ?? []),
        ...perimeterSegments,
        ...areaSegments,
        ...openingSegments
      ]
    }
  }

  protected onToolActivated(): void {
    getViewModeActions().ensureMode('floors')
  }
}
