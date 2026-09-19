import type { OpeningAssemblyId, PerimeterWallWithGeometry } from '@/building/model'
import type { LayerSetId } from '@/building/model/ids'
import { type PostConfig, validatePosts } from '@/construction/assemblies/perimeterWalls/posts'
import type { TriangularBattenConfig } from '@/construction/assemblies/perimeterWalls/triangularBattens'
import type { AssemblyPhysicsStructure, PhysicsSeries } from '@/construction/assemblies/physics'
import type { WallConstructionArea } from '@/construction/assemblies/utils/WallConstructionArea'
import type { StoreyContext } from '@/construction/context/storeys'
import type { ConstructionModel } from '@/construction/model/model'
import type { ConstructionResult } from '@/construction/model/results'
import type { Tag } from '@/construction/model/tags'
import type { ThicknessRange } from '@/materials/thickness'
import type { MaterialId } from '@/materials/types'
import type { Length } from '@/shared/geometry'
import { assertUnreachable } from '@/shared/utils'

import type { ModuleConfig } from './modules/modules'

export interface PerimeterWallAssembly {
  construct: (wall: PerimeterWallWithGeometry, storeyContext: StoreyContext) => ConstructionModel

  get tag(): Tag
  get thicknessRange(): ThicknessRange
  getCorePhysicsStructure(coreThickness: Length, height: Length): PhysicsSeries[]
  getPhysicsStructure: (totalThickness: Length, height: Length) => AssemblyPhysicsStructure
}

export type PerimeterWallAssemblyType = 'infill' | 'strawhenge' | 'non-strawbale' | 'modules' | 'prefab-modules'

export interface PerimeterWallBaseConfig {
  type: PerimeterWallAssemblyType
  insideLayerSetId?: LayerSetId
  outsideLayerSetId?: LayerSetId
  openingAssemblyId?: OpeningAssemblyId
}

export interface InfillWallSegmentConfig {
  maxPostSpacing: Length // Default: 900mm
  desiredPostSpacing: Length // Default: 800mm
  minStrawSpace: Length // Default: 70mm
  posts: PostConfig // Default: full
  triangularBattens: TriangularBattenConfig
  strawMaterial?: MaterialId
  infillMaterial?: MaterialId
}

export interface InfillWallConfig extends InfillWallSegmentConfig, PerimeterWallBaseConfig {
  type: 'infill'
}

export interface ModulesWallConfig extends PerimeterWallBaseConfig {
  type: 'modules'
  module: ModuleConfig
  infill: InfillWallSegmentConfig
}

export interface StrawhengeWallConfig extends PerimeterWallBaseConfig {
  type: 'strawhenge'
  module: ModuleConfig
  infill: InfillWallSegmentConfig
}

export interface NonStrawbaleWallConfig extends PerimeterWallBaseConfig {
  type: 'non-strawbale'
  material: MaterialId
}

export interface PrefabModulesWallConfig extends PerimeterWallBaseConfig {
  type: 'prefab-modules'
  defaultMaterial: MaterialId
  fallbackMaterial: MaterialId
  inclinedMaterial: MaterialId
  lintelMaterial?: MaterialId
  sillMaterial?: MaterialId
  maxWidth: Length
  targetWidth: Length
  preferEqualWidths: boolean
  tallReinforceThreshold: Length
  tallReinforceThickness: Length
  tallReinforceStagger: Length
  tallReinforceMaterial: MaterialId
}

export type PerimeterWallConfig =
  | InfillWallConfig
  | ModulesWallConfig
  | StrawhengeWallConfig
  | NonStrawbaleWallConfig
  | PrefabModulesWallConfig

export type SegmentInfillMethod = (area: WallConstructionArea, type: 'lintel' | 'sill') => Generator<ConstructionResult>

// Validation

const ensurePositive = (value: number, message: string) => {
  if (value <= 0) {
    throw new Error(message)
  }
}

const ensureNonNegative = (value: number, message: string) => {
  if (value < 0) {
    throw new Error(message)
  }
}

// Opening validation moved to OpeningConfig in openings/types.ts

const validateTriangularBattens = (config: TriangularBattenConfig): void => {
  ensurePositive(config.size, 'Triangular batten size must be greater than zero')
  ensureNonNegative(config.minLength, 'Triangular batten minimum length cannot be negative')
}

const validateInfillSegment = (
  config: Pick<
    InfillWallConfig,
    'desiredPostSpacing' | 'maxPostSpacing' | 'minStrawSpace' | 'posts' | 'triangularBattens'
  >
): void => {
  ensurePositive(config.desiredPostSpacing, 'Desired post spacing must be greater than 0')
  ensurePositive(config.maxPostSpacing, 'Maximum post spacing must be greater than 0')
  ensurePositive(config.minStrawSpace, 'Minimum straw space must be greater than 0')
  validatePosts(config.posts)
  validateTriangularBattens(config.triangularBattens)
}

const validateModule = (module: ModuleConfig): void => {
  ensurePositive(module.minWidth, 'Module width must be greater than 0')
  ensurePositive(module.maxWidth, 'Module width must be greater than 0')
  ensurePositive(module.frameThickness, 'Module frame thickness must be greater than 0')

  if (module.maxWidth < module.minWidth) {
    throw new Error('Minimum module width must not be bigger than maximum module width')
  }

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

const validateNonStrawbaleWallConfig = (_config: NonStrawbaleWallConfig): void => {
  // No validation needed
}

const validatePrefabModulesWallConfig = (config: PrefabModulesWallConfig): void => {
  ensurePositive(config.maxWidth, 'Maximum width must be greater than 0')
  ensurePositive(config.targetWidth, 'Target width must be greater than 0')

  if (config.maxWidth < config.targetWidth) {
    throw new Error('Maximum width must not be less than target width')
  }
}

export const validatePerimeterWallConfig = (config: PerimeterWallConfig): void => {
  switch (config.type) {
    case 'infill':
      validateInfillWallConfig(config)
      break
    case 'modules':
      validateModulesWallConfig(config)
      break
    case 'strawhenge':
      validateStrawhengeWallConfig(config)
      break
    case 'non-strawbale':
      validateNonStrawbaleWallConfig(config)
      break
    case 'prefab-modules':
      validatePrefabModulesWallConfig(config)
      break
    default:
      assertUnreachable(config, 'Invalid wall assembly type')
  }
}
