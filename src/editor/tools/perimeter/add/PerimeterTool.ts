import { vec2 } from 'gl-matrix'

import type { RingBeamAssemblyId, WallAssemblyId } from '@/building/model/ids'
import type { PerimeterReferenceSide } from '@/building/model/model'
import { getModelActions } from '@/building/store'
import { getConfigActions } from '@/construction/config/store'
import { getViewModeActions } from '@/editor/hooks/useViewMode'
import { BasePolygonTool, type PolygonToolStateBase } from '@/editor/tools/shared/polygon/BasePolygonTool'
import type { ToolImplementation } from '@/editor/tools/system/types'
import type { Length, Polygon2D } from '@/shared/geometry'
import { polygonIsClockwise } from '@/shared/geometry'

import { PerimeterToolInspector } from './PerimeterToolInspector'
import { PerimeterToolOverlay } from './PerimeterToolOverlay'

interface PerimeterToolState extends PolygonToolStateBase {
  wallAssemblyId: WallAssemblyId
  wallThickness: Length
  baseRingBeamAssemblyId?: RingBeamAssemblyId
  topRingBeamAssemblyId?: RingBeamAssemblyId
  referenceSide: PerimeterReferenceSide
}

export class PerimeterTool extends BasePolygonTool<PerimeterToolState> implements ToolImplementation {
  readonly id = 'perimeter.add'
  readonly overlayComponent = PerimeterToolOverlay
  readonly inspectorComponent = PerimeterToolInspector

  constructor() {
    super({
      wallAssemblyId: '' as WallAssemblyId,
      wallThickness: 420,
      referenceSide: 'inside'
    })
  }

  public setAssembly(assemblyId: WallAssemblyId): void {
    this.state.wallAssemblyId = assemblyId
    this.triggerRender()
  }

  public setWallThickness(thickness: Length): void {
    this.state.wallThickness = thickness
    this.triggerRender()
  }

  public setBaseRingBeam(assemblyId: RingBeamAssemblyId | undefined): void {
    this.state.baseRingBeamAssemblyId = assemblyId
    this.triggerRender()
  }

  public setTopRingBeam(assemblyId: RingBeamAssemblyId | undefined): void {
    this.state.topRingBeamAssemblyId = assemblyId
    this.triggerRender()
  }

  public setReferenceSide(side: PerimeterReferenceSide): void {
    this.state.referenceSide = side
    this.triggerRender()
  }

  protected onToolActivated(): void {
    getViewModeActions().ensureMode('walls')
    const configStore = getConfigActions()
    this.state.baseRingBeamAssemblyId = configStore.getDefaultBaseRingBeamAssemblyId()
    this.state.topRingBeamAssemblyId = configStore.getDefaultTopRingBeamAssemblyId()
    this.state.wallAssemblyId = configStore.getDefaultWallAssemblyId()
    this.state.referenceSide = 'inside'
  }

  protected buildPolygon(points: vec2[]): Polygon2D {
    let polygon: Polygon2D = { points }
    if (!polygonIsClockwise(polygon)) {
      polygon = { points: [...points].reverse() }
    }
    return polygon
  }

  protected onPolygonCompleted(polygon: Polygon2D): void {
    const { addPerimeter, getActiveStoreyId } = getModelActions()
    const activeStoreyId = getActiveStoreyId()

    if (!this.state.wallAssemblyId) {
      console.error('No wall assembly selected')
      return
    }

    addPerimeter(
      activeStoreyId,
      polygon,
      this.state.wallAssemblyId,
      this.state.wallThickness,
      this.state.baseRingBeamAssemblyId,
      this.state.topRingBeamAssemblyId,
      this.state.referenceSide
    )
  }
}
