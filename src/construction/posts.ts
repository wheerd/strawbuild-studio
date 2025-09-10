import { type Length } from '@/types/geometry'
import type { MaterialId } from './material'
import { createConstructionElementId, type ConstructionElement } from './base'

export interface BasePostConfig {
  type: 'full' | 'double'
  width: Length // Default: 60mm
  material: MaterialId
}

export interface FullPostConfig extends BasePostConfig {
  type: 'full'
  // Default material: 36x6 wood
}

export interface DoublePostConfig extends BasePostConfig {
  type: 'double'
  thickness: Length // Default: 120mm
  // Default material: 12x6 wood
  infillMaterial: MaterialId // Default: straw
}

export type PostConfig = FullPostConfig | DoublePostConfig

const constructFullPost = (
  offset: Length,
  wallThickness: Length,
  wallHeight: Length,
  config: FullPostConfig
): ConstructionElement[] => {
  return [
    {
      id: createConstructionElementId(),
      material: config.material,
      position: [offset, 0, 0],
      size: [config.width, wallThickness, wallHeight],
      type: 'post'
    }
  ]
}

const constructDoublePost = (
  offset: Length,
  wallThickness: Length,
  wallHeight: Length,
  config: DoublePostConfig
): ConstructionElement[] => {
  return [
    {
      id: createConstructionElementId(),
      material: config.material,
      position: [offset, 0, 0],
      size: [config.width, config.thickness, wallHeight],
      type: 'post'
    },
    {
      id: createConstructionElementId(),
      material: config.material,
      position: [offset, wallThickness - config.thickness, 0],
      size: [config.width, config.thickness, wallHeight],
      type: 'post'
    },
    {
      id: createConstructionElementId(),
      material: config.infillMaterial,
      position: [offset, config.thickness, 0],
      size: [config.width, wallThickness - 2 * config.thickness, wallHeight],
      type: 'infill'
    }
  ]
}

export const constructPost = (
  offset: Length,
  wallThickness: Length,
  wallHeight: Length,
  config: PostConfig
): ConstructionElement[] => {
  if (config.type === 'full') {
    return constructFullPost(offset, wallThickness, wallHeight, config)
  } else if (config.type === 'double') {
    return constructDoublePost(offset, wallThickness, wallHeight, config)
  } else {
    throw new Error('Invalid post type')
  }
}
