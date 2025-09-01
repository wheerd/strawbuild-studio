import { BaseWallTool, type WallTypeConfig } from './BaseWallTool'
import { createLength } from '@/types/geometry'
import type { StoreActions, FloorId, PointId, Wall } from '@/model'

const OUTER_WALL_CONFIG: WallTypeConfig = {
  id: 'wall.outer',
  name: 'Outer Wall',
  icon: '▬',
  defaultThickness: 440, // 44cm
  primaryColor: '#DAA520',
  secondaryColor: '#2F2F2F',
  label: 'Outer'
}

export class OuterWallTool extends BaseWallTool {
  constructor() {
    super(OUTER_WALL_CONFIG)
  }

  protected createWall(
    modelStore: StoreActions,
    activeFloorId: FloorId,
    startPointId: PointId,
    endPointId: PointId,
    thickness: number
  ): Wall {
    return modelStore.addOuterWall(activeFloorId, startPointId, endPointId, 'left', createLength(thickness))
  }
}
