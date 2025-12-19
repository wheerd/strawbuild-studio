import type { WallConstructionArea } from '@/construction/geometry'
import type { MaterialId } from '@/construction/materials/material'
import { type PostConfig, validatePosts } from '@/construction/materials/posts'
import type { ConstructionResult } from '@/construction/results'
import { type InfillMethod } from '@/construction/walls/types'
import type { Length } from '@/shared/geometry'

export interface OpeningAssembly<TConfig extends OpeningAssemblyConfigBase> {
  construct: (
    area: WallConstructionArea,
    adjustedHeader: Length,
    adjustedSill: Length,
    config: TConfig,
    infill: InfillMethod
  ) => Generator<ConstructionResult>

  getSegmentationPadding(config: TConfig): Length
  needsWallStands(config: TConfig): boolean
}

export type OpeningAssemblyType = 'simple' | 'post' | 'empty'

export interface OpeningAssemblyConfigBase {
  type: OpeningAssemblyType
  padding: Length
}

export interface SimpleOpeningConfig extends OpeningAssemblyConfigBase {
  type: 'simple'

  sillThickness: Length // Default: 60mm
  sillMaterial: MaterialId

  headerThickness: Length // Default: 60mm
  headerMaterial: MaterialId
}

export interface PostOpeningConfig extends OpeningAssemblyConfigBase {
  type: 'post'

  sillThickness: Length // Default: 60mm
  sillMaterial: MaterialId

  headerThickness: Length // Default: 60mm
  headerMaterial: MaterialId

  posts: PostConfig
  replacePosts: boolean
}

export interface EmptyOpeningConfig extends OpeningAssemblyConfigBase {
  type: 'empty'
  // Only padding, no sill/header materials or thicknesses
}

export type OpeningConfig = SimpleOpeningConfig | EmptyOpeningConfig | PostOpeningConfig

// Validation

export const validateOpeningConfig = (config: OpeningConfig): void => {
  if (config.padding < 0) {
    throw new Error('Padding cannot be negative')
  }

  if (config.type !== 'empty') {
    if (config.sillThickness <= 0) {
      throw new Error('Sill thickness must be positive')
    }
    if (config.headerThickness <= 0) {
      throw new Error('Header thickness must be positive')
    }
  }

  if (config.type === 'post') {
    validatePosts(config.posts)
  }
}
