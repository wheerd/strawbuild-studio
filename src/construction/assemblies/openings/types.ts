import type { Opening, OpeningAssemblyId } from '@/building/model'
import { type PostConfig, validatePosts } from '@/construction/assemblies/perimeterWalls/posts'
import { type SegmentInfillMethod } from '@/construction/assemblies/perimeterWalls/types'
import type { WallConstructionArea } from '@/construction/assemblies/utils/WallConstructionArea'
import type { ConstructionResult } from '@/construction/model/results'
import type { MaterialId } from '@/materials/types'
import type { Length } from '@/shared/geometry'

export interface OpeningAssembly {
  construct: (
    area: WallConstructionArea,
    adjustedHeader: Length,
    adjustedSill: Length,
    infill: SegmentInfillMethod,
    openings: Opening[]
  ) => Generator<ConstructionResult>

  getSegmentationPadding(openings: Opening[]): Length
  needsWallStands(openings: Opening[]): boolean
}

export type OpeningAssemblyType = 'simple' | 'post' | 'empty' | 'planked' | 'threshold'

export interface OpeningAssemblyConfigBase {
  type: OpeningAssemblyType
  padding: Length
}

export interface HeaderAndSillConfigBase extends OpeningAssemblyConfigBase {
  sillThickness: Length // Default: 60mm
  sillMaterial: MaterialId

  headerThickness: Length // Default: 60mm
  headerMaterial: MaterialId
}

export interface SimpleOpeningConfig extends HeaderAndSillConfigBase {
  type: 'simple'
}

export interface PostOpeningConfig extends HeaderAndSillConfigBase {
  type: 'post'
  posts: PostConfig
  replacePosts: boolean
  postsSupportHeader?: boolean
}

export interface PlankedOpeningConfig extends HeaderAndSillConfigBase {
  type: 'planked'
  plankThickness: Length
  plankMaterial: MaterialId
}

export interface EmptyOpeningConfig extends OpeningAssemblyConfigBase {
  type: 'empty'
  // Only padding, no sill/header materials or thicknesses
}

export interface ThresholdConfig {
  assemblyId: OpeningAssemblyId
  widthThreshold: Length
}

export interface ThresholdAssemblyConfig extends OpeningAssemblyConfigBase {
  type: 'threshold'
  defaultId: OpeningAssemblyId
  thresholds: ThresholdConfig[]
}

export type OpeningConfig =
  | SimpleOpeningConfig
  | EmptyOpeningConfig
  | PostOpeningConfig
  | PlankedOpeningConfig
  | ThresholdAssemblyConfig

// Validation

export const validateOpeningConfig = (config: OpeningConfig): void => {
  if (config.padding < 0) {
    throw new Error('Padding cannot be negative')
  }

  if (config.type === 'simple' || config.type === 'post' || config.type === 'planked') {
    if (config.sillThickness < 0) {
      throw new Error('Sill thickness must not be negative')
    }
    if (config.headerThickness < 0) {
      throw new Error('Header thickness must not be negative')
    }
  }

  if (config.type === 'post') {
    validatePosts(config.posts)
  }

  if (config.type === 'threshold') {
    if (config.thresholds.some(t => t.widthThreshold < 0)) {
      throw new Error('Width threshold cannot be negative')
    }
  }
}
