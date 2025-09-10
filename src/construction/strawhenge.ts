import type { PerimeterWall } from '@/model'
import type { Length } from '@/types/geometry'
import type { MaterialId } from './material'
import type { PostConfig } from './posts'
import type { InfillConstructionConfig } from './infill'
import type { PerimeterWallConstructionMethod, WallConstructionPlan } from './base'

export interface ModuleConfig {
  width: Length // Default: 920mm
  frame: PostConfig // Default: full
  strawMaterial: MaterialId
}

export interface StrawhengeConstructionConfig {
  module: ModuleConfig
  infill: InfillConstructionConfig
}

export const constructStrawhengeWall: PerimeterWallConstructionMethod<StrawhengeConstructionConfig> = (
  _wall: PerimeterWall,
  _floorHeight: Length,
  _config: StrawhengeConstructionConfig
): WallConstructionPlan => {
  throw new Error('TODO: Implementation')
}
