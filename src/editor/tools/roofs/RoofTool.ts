import { vec2 } from 'gl-matrix'

import type { RoofAssemblyId, RoofType } from '@/building/model'
import { getModelActions } from '@/building/store'
import { getConfigActions } from '@/construction/config/store'
import { getViewModeActions } from '@/editor/hooks/useViewMode'
import type { SnappingContext } from '@/editor/services/snapping/types'
import { BasePolygonTool, type PolygonToolStateBase } from '@/editor/tools/shared/polygon/BasePolygonTool'
import { PolygonToolOverlay } from '@/editor/tools/shared/polygon/PolygonToolOverlay'
import type { ToolImplementation } from '@/editor/tools/system/types'
import type { Length, Polygon2D } from '@/shared/geometry'
import { polygonIsClockwise } from '@/shared/geometry'

import { RoofToolInspector } from './RoofToolInspector'

interface RoofToolState extends PolygonToolStateBase {
  type: RoofType
  slope: number // degrees
  verticalOffset: Length
  overhang: Length // single value applied to all sides
  assemblyId: RoofAssemblyId
}

const createPolygonSegments = (points: readonly vec2[]) => {
  if (points.length < 2) return []

  const segments = []
  for (let index = 0; index < points.length; index += 1) {
    const start = points[index]
    const end = points[(index + 1) % points.length]
    segments.push({ start, end })
  }
  return segments
}

export class RoofTool extends BasePolygonTool<RoofToolState> implements ToolImplementation {
  readonly id = 'roofs.add-roof'
  readonly overlayComponent = PolygonToolOverlay
  readonly inspectorComponent = RoofToolInspector

  constructor() {
    const defaultAssemblyId = getConfigActions().getDefaultRoofAssemblyId()
    super({
      type: 'gable',
      slope: 30,
      verticalOffset: 0,
      overhang: 300,
      assemblyId: defaultAssemblyId
    })
  }

  public setType(type: RoofType): void {
    this.state.type = type
    this.triggerRender()
  }

  public setSlope(slope: number): void {
    this.state.slope = slope
    this.triggerRender()
  }

  public setVerticalOffset(height: Length): void {
    this.state.verticalOffset = height
    this.triggerRender()
  }

  public setOverhang(overhang: Length): void {
    this.state.overhang = overhang
    this.triggerRender()
  }

  public setAssemblyId(assemblyId: RoofAssemblyId): void {
    this.state.assemblyId = assemblyId
    this.triggerRender()
  }

  protected extendSnapContext(context: SnappingContext): SnappingContext {
    const { getPerimetersByStorey, getRoofsByStorey, getActiveStoreyId } = getModelActions()

    const activeStoreyId = getActiveStoreyId()
    const perimeters = getPerimetersByStorey(activeStoreyId)
    const roofs = getRoofsByStorey(activeStoreyId)

    // Only snap to outer points and outer edges of perimeters
    const perimeterPoints = perimeters.flatMap(perimeter => perimeter.corners.map(corner => corner.outsidePoint))
    const perimeterSegments = perimeters.flatMap(perimeter => perimeter.walls.map(wall => wall.outsideLine))

    const roofPoints = roofs.flatMap(roof => roof.referencePolygon.points)
    const roofSegments = roofs.flatMap(roof => createPolygonSegments(roof.referencePolygon.points))

    return {
      ...context,
      snapPoints: [...context.snapPoints, ...perimeterPoints, ...roofPoints],
      referenceLineSegments: [...(context.referenceLineSegments ?? []), ...perimeterSegments, ...roofSegments]
    }
  }

  protected onToolActivated(): void {
    getViewModeActions().ensureMode('roofs')
  }

  protected buildPolygon(points: vec2[]): Polygon2D {
    let polygon: Polygon2D = { points }
    if (!polygonIsClockwise(polygon)) {
      polygon = { points: [...points].reverse() }
    }
    return polygon
  }

  protected onPolygonCompleted(polygon: Polygon2D): void {
    const { addRoof, getActiveStoreyId } = getModelActions()
    const activeStoreyId = getActiveStoreyId()

    // Calculate direction perpendicular to first edge
    if (polygon.points.length < 2) {
      console.error('Polygon must have at least 2 points')
      return
    }

    // Use first side (index 0) as main side for direction
    const mainSideIndex = 0

    addRoof(
      activeStoreyId,
      this.state.type,
      polygon,
      mainSideIndex,
      this.state.slope,
      this.state.verticalOffset,
      this.state.overhang,
      this.state.assemblyId
    )
  }
}
