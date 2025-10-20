import { getModelActions } from '@/building/store'
import { BaseFloorPolygonTool } from '@/editor/tools/floors/shared/BaseFloorPolygonTool'
import type { PolygonToolStateBase } from '@/editor/tools/shared/polygon/BasePolygonTool'
import { PolygonToolOverlay } from '@/editor/tools/shared/polygon/PolygonToolOverlay'
import type { ToolImplementation } from '@/editor/tools/system/types'
import type { Polygon2D } from '@/shared/geometry'

import { FloorOpeningToolInspector } from './FloorOpeningToolInspector'

export class FloorOpeningTool extends BaseFloorPolygonTool<PolygonToolStateBase> implements ToolImplementation {
  readonly id = 'floors.add-opening'
  readonly overlayComponent = PolygonToolOverlay
  readonly inspectorComponent = FloorOpeningToolInspector

  constructor() {
    super({})
  }

  protected onPolygonCompleted(polygon: Polygon2D): void {
    const { addFloorOpening, getActiveStoreyId } = getModelActions()
    addFloorOpening(getActiveStoreyId(), polygon)
  }
}
