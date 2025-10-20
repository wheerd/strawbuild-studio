import { getModelActions } from '@/building/store'
import { BaseFloorPolygonTool } from '@/editor/tools/floors/shared/BaseFloorPolygonTool'
import type { PolygonToolStateBase } from '@/editor/tools/shared/polygon/BasePolygonTool'
import { PolygonToolOverlay } from '@/editor/tools/shared/polygon/PolygonToolOverlay'
import type { ToolImplementation } from '@/editor/tools/system/types'
import type { Polygon2D } from '@/shared/geometry'

import { FloorAreaToolInspector } from './FloorAreaToolInspector'

export class FloorAreaTool extends BaseFloorPolygonTool<PolygonToolStateBase> implements ToolImplementation {
  readonly id = 'floors.add-area'
  readonly overlayComponent = PolygonToolOverlay
  readonly inspectorComponent = FloorAreaToolInspector

  constructor() {
    super({})
  }

  protected onPolygonCompleted(polygon: Polygon2D): void {
    const { addFloorArea, getActiveStoreyId } = getModelActions()
    addFloorArea(getActiveStoreyId(), polygon)
  }
}
