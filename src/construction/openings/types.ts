import type { WallConstructionArea } from '@/construction/geometry'
import type { MaterialId } from '@/construction/materials/material'
import { type PostConfig, validatePosts } from '@/construction/materials/posts'
import type { ConstructionResult } from '@/construction/results'
import { type InfillMethod } from '@/construction/walls/types'
import type { Length } from '@/shared/geometry'

export interface OpeningAssembly {
  construct: (
    area: WallConstructionArea,
    adjustedHeader: Length,
    adjustedSill: Length,
    infill: InfillMethod
  ) => Generator<ConstructionResult>

  get segmentationPadding(): Length
  get needsWallStands(): boolean
}

export type OpeningAssemblyType = 'simple' | 'post' | 'empty' | 'planked'

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

export type OpeningConfig = SimpleOpeningConfig | EmptyOpeningConfig | PostOpeningConfig | PlankedOpeningConfig

// Validation

export const validateOpeningConfig = (config: OpeningConfig): void => {
  if (config.padding < 0) {
    throw new Error('Padding cannot be negative')
  }

  if (config.type !== 'empty') {
    if (config.sillThickness < 0) {
      throw new Error('Sill thickness must not be negative')
    }
    if (config.headerThickness <= 0) {
      throw new Error('Header thickness must be positive')
    }
  }

  if (config.type === 'post') {
    validatePosts(config.posts)
  }
}
