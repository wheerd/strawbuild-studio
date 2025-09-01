import { BaseWallTool, type WallTypeConfig } from './BaseWallTool'
import { createLength } from '@/types/geometry'
import type { StoreActions, FloorId, PointId, Wall } from '@/model'

const PARTITION_WALL_CONFIG: WallTypeConfig = {
  id: 'wall.partition',
  name: 'Partition Wall',
  icon: '▬',
  defaultThickness: 180, // 18cm
  primaryColor: '#DAA520',
  secondaryColor: '#8B4513',
  label: 'Partition'
}

export class PartitionWallTool extends BaseWallTool {
  constructor() {
    super(PARTITION_WALL_CONFIG)
  }

  protected createWall(
    modelStore: StoreActions,
    activeFloorId: FloorId,
    startPointId: PointId,
    endPointId: PointId,
    thickness: number
  ): Wall {
    // Create partition wall using model store
    return modelStore.addPartitionWall(activeFloorId, startPointId, endPointId, createLength(thickness))
  }
}
