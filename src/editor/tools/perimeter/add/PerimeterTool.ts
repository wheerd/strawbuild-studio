import { generateFreeformConstraints } from '@/building/gcs/constraintGenerator'
import type { PerimeterReferenceSide } from '@/building/model'
import type { PerimeterWallAssemblyId, RingBeamAssemblyId } from '@/building/model/ids'
import { getModelActions } from '@/building/store'
import { getConfigActions } from '@/config/store'
import { getViewModeActions } from '@/editor/canvas/state/viewModeStore'
import { BasePolygonTool, type PolygonToolStateBase } from '@/editor/tools/shared/polygon/BasePolygonTool'
import type { ToolSystem } from '@/editor/tools/system/ToolSystem'
import type { ToolImplementation } from '@/editor/tools/system/types'
import { type Length, type Polygon2D, type Vec2, polygonIsClockwise } from '@/shared/geometry'

import { PerimeterToolInspector } from './PerimeterToolInspector'
import { PerimeterToolOverlay } from './PerimeterToolOverlay'

interface PerimeterToolState extends PolygonToolStateBase {
  wallAssemblyId: PerimeterWallAssemblyId
  wallThickness: Length
  baseRingBeamAssemblyId?: RingBeamAssemblyId
  topRingBeamAssemblyId?: RingBeamAssemblyId
  referenceSide: PerimeterReferenceSide
}

export class PerimeterTool extends BasePolygonTool<PerimeterToolState> implements ToolImplementation {
  readonly id = 'perimeter.add'
  readonly overlayComponent = PerimeterToolOverlay
  readonly inspectorComponent = PerimeterToolInspector

  constructor(toolSystem: ToolSystem) {
    super(toolSystem, {
      wallAssemblyId: '' as PerimeterWallAssemblyId,
      wallThickness: 420,
      referenceSide: 'inside'
    })
  }

  public setAssembly(assemblyId: PerimeterWallAssemblyId): void {
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
    this.state.wallAssemblyId = configStore.getDefaultPerimeterWallAssemblyId()
    this.state.referenceSide = 'inside'
  }

  /** Whether `buildPolygon` reversed the points to make them clockwise. */
  private wasReversed = false

  protected buildPolygon(points: Vec2[]): Polygon2D {
    let polygon: Polygon2D = { points }
    if (!polygonIsClockwise(polygon)) {
      polygon = { points: [...points].reverse() }
      this.wasReversed = true
    } else {
      this.wasReversed = false
    }
    return polygon
  }

  protected onPolygonCompleted(polygon: Polygon2D): void {
    const { addPerimeter, getActiveStoreyId, getPerimeterCornersById, getPerimeterWallsById, addBuildingConstraint } =
      getModelActions()
    const activeStoreyId = getActiveStoreyId()

    const perimeter = addPerimeter(
      activeStoreyId,
      polygon,
      this.state.wallAssemblyId,
      this.state.wallThickness,
      this.state.baseRingBeamAssemblyId,
      this.state.topRingBeamAssemblyId,
      this.state.referenceSide
    )

    // Adjust overrides if buildPolygon reversed the point order.
    // Original segments [P0→P1, ..., Pn-1→P0] with overrides [o0, ..., on-1].
    // Reversed segments [Pn-1→Pn-2, ..., P1→P0, P0→Pn-1].
    // Non-closing overrides reverse; closing override stays at end.
    let overrides = [...this.state.segmentLengthOverrides]
    if (this.wasReversed && overrides.length > 1) {
      const closing = overrides[overrides.length - 1]
      const nonClosing = overrides.slice(0, -1).reverse()
      overrides = [...nonClosing, closing]
    }

    // Adjust origin snapped index if polygon was reversed
    let originSnappedIndex = this.state.originSnappedIndex
    if (this.wasReversed && originSnappedIndex !== null) {
      const n = polygon.points.length
      originSnappedIndex = n - 1 - originSnappedIndex
    }

    // Generate and add freeform constraints
    const corners = getPerimeterCornersById(perimeter.id)
    const walls = getPerimeterWallsById(perimeter.id)
    const originSnappedIndices = originSnappedIndex !== null ? [originSnappedIndex] : []
    const constraints = generateFreeformConstraints(
      corners,
      walls,
      this.state.referenceSide,
      overrides,
      originSnappedIndices
    )
    for (const constraint of constraints) {
      try {
        addBuildingConstraint(constraint)
      } catch (e) {
        console.warn('Failed to add constraint', constraint, e)
      }
    }
  }
}
