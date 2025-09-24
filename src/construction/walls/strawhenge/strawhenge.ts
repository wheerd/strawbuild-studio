import type { PerimeterWall } from '@/shared/types/model'
import type { Perimeter } from '@/shared/types/model'
import type { Length } from '@/shared/geometry'
import type { MaterialId } from '../../materials/material'
import type { PostConfig } from '../../materials/posts'
import type { InfillConstructionConfig } from '../infill/infill'
import type { BaseConstructionConfig, PerimeterWallConstructionMethod, WallConstructionPlan } from '../base'

export interface ModuleConfig {
  width: Length // Default: 920mm
  frame: PostConfig // Default: full
  strawMaterial: MaterialId
}

export interface StrawhengeConstructionConfig extends BaseConstructionConfig {
  type: 'strawhenge'
  module: ModuleConfig
  infill: InfillConstructionConfig
}

export const constructStrawhengeWall: PerimeterWallConstructionMethod<StrawhengeConstructionConfig> = (
  _wall: PerimeterWall,
  _perimeter: Perimeter,
  _floorHeight: Length,
  _config: StrawhengeConstructionConfig
): WallConstructionPlan => {
  throw new Error('TODO: Implementation')
}
