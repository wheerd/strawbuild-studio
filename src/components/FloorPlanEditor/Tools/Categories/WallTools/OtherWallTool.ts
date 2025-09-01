import { BaseWallTool, type WallTypeConfig } from './BaseWallTool'
import { createLength } from '@/types/geometry'
import type { StoreActions, FloorId, PointId, Wall } from '@/model'

const OTHER_WALL_CONFIG: WallTypeConfig = {
  id: 'wall.other',
  name: 'Other Wall',
  icon: '▬',
  defaultThickness: 200, // 20cm
  primaryColor: '#2F2F2F',
  secondaryColor: '#2F2F2F',
  label: 'Other'
}

export class OtherWallTool extends BaseWallTool {
  constructor() {
    super(OTHER_WALL_CONFIG)
  }

  protected createWall(
    modelStore: StoreActions,
    activeFloorId: FloorId,
    startPointId: PointId,
    endPointId: PointId,
    thickness: number
  ): Wall {
    // Create other wall using model store
    return modelStore.addOtherWall(activeFloorId, startPointId, endPointId, createLength(thickness))
  }
}
