import { BaseWallTool, type WallTypeConfig } from './BaseWallTool'
import { createLength } from '@/types/geometry'
import type { StoreActions, FloorId, PointId, Wall } from '@/model'

const STRUCTURAL_WALL_CONFIG: WallTypeConfig = {
  id: 'wall.structural',
  name: 'Structural Wall',
  icon: '▬',
  defaultThickness: 220, // 22cm
  primaryColor: '#DAA520',
  secondaryColor: '#CD853F',
  label: 'Structural'
}

export class StructuralWallTool extends BaseWallTool {
  constructor() {
    super(STRUCTURAL_WALL_CONFIG)
  }

  protected createWall(
    modelStore: StoreActions,
    activeFloorId: FloorId,
    startPointId: PointId,
    endPointId: PointId,
    thickness: number
  ): Wall {
    // Create structural wall using model store
    return modelStore.addStructuralWall(activeFloorId, startPointId, endPointId, createLength(thickness))
  }
}
