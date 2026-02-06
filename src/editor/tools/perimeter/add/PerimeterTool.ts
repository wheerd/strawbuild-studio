import type { PerimeterReferenceSide } from '@/building/model'
import type { RingBeamAssemblyId, WallAssemblyId } from '@/building/model/ids'
import { getModelActions } from '@/building/store'
import { getConfigActions } from '@/construction/config/store'
import { generateFreeformConstraints } from '@/editor/gcs/constraintGenerator'
import { getGcsActions } from '@/editor/gcs/store'
import { getViewModeActions } from '@/editor/hooks/useViewMode'
import { BasePolygonTool, type PolygonToolStateBase } from '@/editor/tools/shared/polygon/BasePolygonTool'
import type { ToolImplementation } from '@/editor/tools/system/types'
import { type Length, type Polygon2D, type Vec2, polygonIsClockwise } from '@/shared/geometry'

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
    const { addPerimeter, getActiveStoreyId, getPerimeterCornersById, getPerimeterWallsById } = getModelActions()
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

    // Generate and add freeform constraints
    const corners = getPerimeterCornersById(perimeter.id)
    const walls = getPerimeterWallsById(perimeter.id)
    const constraints = generateFreeformConstraints(corners, walls, this.state.referenceSide, overrides)
    const gcsActions = getGcsActions()
    for (const constraint of constraints) {
      try {
        gcsActions.addBuildingConstraint(constraint)
      } catch {
        // Non-fatal: constraint may conflict or reference missing geometry
      }
    }
  }
}
