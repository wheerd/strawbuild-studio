import type { PerimeterWall, Perimeter } from '@/shared/types/model'
import type { Length } from '@/shared/geometry'
import type { MaterialId } from '@/construction/materials/material'
import type { PostConfig } from '@/construction/materials/posts'
import type { InfillConstructionConfig } from '@/construction/walls/infill/infill'
import type {
  BaseConstructionConfig,
  PerimeterWallConstructionMethod,
  WallConstructionPlan
} from '@/construction/walls/construction'

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
