import { type Length } from '@/types/geometry'
import type { MaterialId } from './material'
import type { ConstructionElement } from './base'

export interface BasePostConfig {
  type: 'full' | 'double'
  width: Length // Default: 60mm
  material: MaterialId
}

export interface FullPostConfig extends BasePostConfig {
  type: 'full'
}

export interface DoublePostConfig extends BasePostConfig {
  type: 'double'
  thickness: Length // Default: 120mm
}

export type PostConfig = FullPostConfig | DoublePostConfig

const constructFullPost = (_offset: Length, _config: FullPostConfig): ConstructionElement[] => {
  throw new Error('TODO: Implementation')
}

const constructDoublePost = (_offset: Length, _config: DoublePostConfig): ConstructionElement[] => {
  throw new Error('TODO: Implementation')
}

export const constructPost = (offset: Length, config: PostConfig): ConstructionElement[] => {
  if (config.type === 'full') {
    return constructFullPost(offset, config)
  } else if (config.type === 'double') {
    return constructDoublePost(offset, config)
  } else {
    throw new Error('Invalid post type')
  }
}
