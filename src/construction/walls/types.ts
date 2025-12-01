import type { Perimeter, PerimeterWall } from '@/building/model'
import type { WallConstructionArea } from '@/construction/geometry'
import type { LayerConfig } from '@/construction/layers/types'
import type { MaterialId } from '@/construction/materials/material'
import type { PostConfig } from '@/construction/materials/posts'
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
}

export interface WallLayersConfig {
  insideThickness: Length
  insideLayers: LayerConfig[]
  outsideThickness: Length
  outsideLayers: LayerConfig[]
}

export interface InfillWallSegmentConfig {
  maxPostSpacing: Length // Default: 900mm
  desiredPostSpacing: Length // Default: 800mm
  minStrawSpace: Length // Default: 70mm
  posts: PostConfig // Default: full
  strawMaterial?: MaterialId
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

export type InfillMethod = (area: WallConstructionArea) => Generator<ConstructionResult>

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

const validatePosts = (posts: PostConfig): void => {
  ensurePositive(posts.width, 'Post width must be greater than 0')
  if (posts.type === 'double') {
    ensurePositive(posts.thickness, 'Double post thickness must be greater than 0')
  }
}

const validateInfillSegment = (
  config: Pick<InfillWallConfig, 'desiredPostSpacing' | 'maxPostSpacing' | 'minStrawSpace' | 'posts'>
): void => {
  ensurePositive(config.desiredPostSpacing, 'Desired post spacing must be greater than 0')
  ensurePositive(config.maxPostSpacing, 'Maximum post spacing must be greater than 0')
  ensurePositive(config.minStrawSpace, 'Minimum straw space must be greater than 0')
  validatePosts(config.posts)
}

const validateModule = (module: ModuleConfig): void => {
  ensurePositive(module.width, 'Module width must be greater than 0')
  ensurePositive(module.frameThickness, 'Module frame thickness must be greater than 0')

  if (module.type === 'double') {
    ensurePositive(module.frameWidth, 'Double module frame width must be greater than 0')
    ensurePositive(module.spacerSize, 'Double module spacer size must be greater than 0')
    if (module.spacerCount < 2) {
      throw new Error('Double module spacer count must be at least 2')
    }
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
