import type { Perimeter, PerimeterWall } from '@/building/model'
import type { WallAssemblyId } from '@/building/model/ids'
import type { MaterialId } from '@/construction/materials/material'
import type { PostConfig } from '@/construction/materials/posts'
import type { StrawConfig } from '@/construction/materials/straw'
import type { ConstructionModel } from '@/construction/model'
import type { OpeningConstructionConfig } from '@/construction/openings/openings'
import type { Length } from '@/shared/geometry'

import type { WallStoreyContext } from './segmentation'
import type { ModuleConfig } from './strawhenge/modules'

export interface WallAssembly<TConfig extends WallAssemblyBaseConfig> {
  construct: (
    wall: PerimeterWall,
    perimeter: Perimeter,
    storeyContext: WallStoreyContext,
    config: TConfig
  ) => ConstructionModel
}

export type WallAssemblyType = 'infill' | 'strawhenge' | 'non-strawbale' | 'modules'

export interface WallAssemblyBaseConfig {
  id: WallAssemblyId
  name: string
  type: WallAssemblyType
  layers: WallLayersConfig
  openings: OpeningConstructionConfig
  straw: StrawConfig
}

export interface WallLayersConfig {
  insideThickness: Length
  outsideThickness: Length
}

export interface InfillWallConfig {
  maxPostSpacing: Length // Default: 800mm
  minStrawSpace: Length // Default: 70mm
  posts: PostConfig // Default: full
}

export interface InfillWallAssemblyConfig extends InfillWallConfig, WallAssemblyBaseConfig {
  type: 'infill'
}

export interface ModulesWallAssemblyConfig extends WallAssemblyBaseConfig {
  type: 'modules'
  module: ModuleConfig
  infill: InfillWallConfig
}

export interface StrawhengeWallAssemblyConfig extends WallAssemblyBaseConfig {
  type: 'strawhenge'
  module: ModuleConfig
  infill: InfillWallConfig
}

export interface NonStrawbaleWallAssemblyConfig extends WallAssemblyBaseConfig {
  type: 'non-strawbale'
  material: MaterialId
  thickness: number
}

export type WallAssemblyConfig =
  | InfillWallAssemblyConfig
  | ModulesWallAssemblyConfig
  | StrawhengeWallAssemblyConfig
  | NonStrawbaleWallAssemblyConfig
