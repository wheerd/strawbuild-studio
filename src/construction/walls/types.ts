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

// Validation

const ensurePositive = (value: number, message: string) => {
  if (Number(value) <= 0) {
    throw new Error(message)
  }
}

const ensureNonNegative = (value: number, message: string) => {
  if (Number(value) < 0) {
    throw new Error(message)
  }
}

const validateLayers = (layers: WallLayersConfig): void => {
  ensureNonNegative(layers.insideThickness, 'Inside layer thickness cannot be negative')
  ensureNonNegative(layers.outsideThickness, 'Outside layer thickness cannot be negative')
}

const validateOpenings = (openings: OpeningConstructionConfig): void => {
  ensureNonNegative(openings.padding, 'Opening padding cannot be negative')
  ensurePositive(openings.headerThickness, 'Header thickness must be greater than 0')
  ensurePositive(openings.sillThickness, 'Sill thickness must be greater than 0')
}

const validateStraw = (straw: StrawConfig): void => {
  ensurePositive(straw.baleLength, 'Straw bale length must be greater than 0')
  ensurePositive(straw.baleHeight, 'Straw bale height must be greater than 0')
  ensurePositive(straw.baleWidth, 'Straw bale width must be greater than 0')
}

const validatePosts = (posts: PostConfig): void => {
  ensurePositive(posts.width, 'Post width must be greater than 0')
  if (posts.type === 'double') {
    ensurePositive(posts.thickness, 'Double post thickness must be greater than 0')
  }
}

const validateInfillSegment = (config: Pick<InfillWallConfig, 'maxPostSpacing' | 'minStrawSpace' | 'posts'>): void => {
  ensurePositive(config.maxPostSpacing, 'Maximum post spacing must be greater than 0')
  ensurePositive(config.minStrawSpace, 'Minimum straw space must be greater than 0')
  validatePosts(config.posts)
}

const validateModule = (module: ModuleConfig): void => {
  ensurePositive(module.width, 'Module width must be greater than 0')
  ensurePositive(module.frameThickness, 'Module frame thickness must be greater than 0')

  if (module.type === 'double') {
    ensurePositive(module.frameWidth, 'Double module frame width must be greater than 0')
  }
}

const validateInfillWallConfig = (config: InfillWallConfig): void => {
  validateInfillSegment(config)
}

const validateModulesWallConfig = (config: ModulesWallConfig): void => {
  validateModule(config.module)
  validateInfillSegment(config.infill)
}

const validateStrawhengeWallConfig = (config: StrawhengeWallConfig): void => {
  validateModule(config.module)
  validateInfillSegment(config.infill)
}

const validateNonStrawbaleWallConfig = (config: NonStrawbaleWallConfig): void => {
  ensurePositive(config.thickness, 'Wall thickness must be greater than 0')
}

export const validateWallConfig = (config: WallConfig): void => {
  validateLayers(config.layers)
  validateOpenings(config.openings)
  validateStraw(config.straw)

  if (config.type === 'infill') {
    validateInfillWallConfig(config)
  } else if (config.type === 'modules') {
    validateModulesWallConfig(config)
  } else if (config.type === 'strawhenge') {
    validateStrawhengeWallConfig(config)
  } else if (config.type === 'non-strawbale') {
    validateNonStrawbaleWallConfig(config)
  } else {
    throw new Error('Invalid wall assembly type')
  }
}
