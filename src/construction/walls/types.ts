import type { vec3 } from 'gl-matrix'

import type { Perimeter, PerimeterWall } from '@/building/model'
import type { MaterialId } from '@/construction/materials/material'
import type { PostConfig } from '@/construction/materials/posts'
import type { StrawConfig } from '@/construction/materials/straw'
import type { ConstructionModel } from '@/construction/model'
import type { OpeningConstructionConfig } from '@/construction/openings/openings'
import type { ConstructionResult } from '@/construction/results'
import type { Length } from '@/shared/geometry'

import type { WallStoreyContext } from './segmentation'
import type { ModuleConfig } from './strawhenge/modules'

export interface WallAssembly<TConfig extends WallBaseConfig> {
  construct: (
    wall: PerimeterWall,
    perimeter: Perimeter,
    storeyContext: WallStoreyContext,
    config: TConfig
  ) => ConstructionModel
}

export type WallAssemblyType = 'infill' | 'strawhenge' | 'non-strawbale' | 'modules'

export interface WallBaseConfig {
  type: WallAssemblyType
  layers: WallLayersConfig
  openings: OpeningConstructionConfig
  straw: StrawConfig
}

export interface WallLayersConfig {
  insideThickness: Length
  outsideThickness: Length
}

export interface InfillWallSegmentConfig {
  maxPostSpacing: Length // Default: 800mm
  minStrawSpace: Length // Default: 70mm
  posts: PostConfig // Default: full
}

export interface InfillWallConfig extends InfillWallSegmentConfig, WallBaseConfig {
  type: 'infill'
}

export interface ModulesWallConfig extends WallBaseConfig {
  type: 'modules'
  module: ModuleConfig
  infill: InfillWallSegmentConfig
}

export interface StrawhengeWallConfig extends WallBaseConfig {
  type: 'strawhenge'
  module: ModuleConfig
  infill: InfillWallSegmentConfig
}

export interface NonStrawbaleWallConfig extends WallBaseConfig {
  type: 'non-strawbale'
  material: MaterialId
  thickness: number
}

export type WallConfig = InfillWallConfig | ModulesWallConfig | StrawhengeWallConfig | NonStrawbaleWallConfig

export type InfillMethod = (position: vec3, size: vec3) => Generator<ConstructionResult>
