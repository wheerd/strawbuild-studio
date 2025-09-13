import { type Length, type Vec3 } from '@/types/geometry'
import type { MaterialId, Material, ResolveMaterialFunction } from './material'
import { createConstructionElementId, type ConstructionElement, type WithIssues, type ConstructionIssue } from './base'

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
  position: Vec3,
  size: Vec3,
  config: FullPostConfig,
  resolveMaterial: ResolveMaterialFunction
): WithIssues<ConstructionElement[]> => {
  const warnings: ConstructionIssue[] = []

  const postElement: ConstructionElement = {
    id: createConstructionElementId(),
    material: config.material,
    position,
    size: [config.width, size[1], size[2]],
    type: 'post'
  }

  // Check if material is dimensional and dimensions match
  const material = resolveMaterial(config.material)
  if (material && material.type === 'dimensional') {
    const dimensionalMaterial = material as Material & { type: 'dimensional' }
    if (dimensionalMaterial.width !== config.width || dimensionalMaterial.thickness !== size[1]) {
      warnings.push({
        description: `Post dimensions (${config.width}x${size[1]}mm) don't match material dimensions (${dimensionalMaterial.width}x${dimensionalMaterial.thickness}mm)`,
        elements: [postElement.id]
      })
    }
  }

  return {
    it: [postElement],
    errors: [],
    warnings
  }
}

const constructDoublePost = (
  position: Vec3,
  size: Vec3,
  config: DoublePostConfig,
  resolveMaterial: ResolveMaterialFunction
): WithIssues<ConstructionElement[]> => {
  const errors: ConstructionIssue[] = []
  const warnings: ConstructionIssue[] = []

  // Check if wall is wide enough for two posts
  const minimumWallThickness = 2 * config.thickness
  if (size[1] < minimumWallThickness) {
    const errorElement: ConstructionElement = {
      id: createConstructionElementId(),
      material: config.material,
      position,
      size: [config.width, size[1], size[2]],
      type: 'post'
    }

    errors.push({
      description: `Wall thickness (${size[1]}mm) is not wide enough for double posts requiring ${minimumWallThickness}mm minimum`,
      elements: [errorElement.id]
    })

    return {
      it: [errorElement],
      errors,
      warnings
    }
  }

  const post1: ConstructionElement = {
    id: createConstructionElementId(),
    material: config.material,
    position,
    size: [config.width, config.thickness, size[2]],
    type: 'post'
  }

  const post2: ConstructionElement = {
    id: createConstructionElementId(),
    material: config.material,
    position: [position[0], position[1] + size[1] - config.thickness, position[2]],
    size: [config.width, config.thickness, size[2]],
    type: 'post'
  }

  const elements = [post1, post2]

  // Only add infill if there's space for it
  const infillThickness = size[1] - 2 * config.thickness
  if (infillThickness > 0) {
    const infill: ConstructionElement = {
      id: createConstructionElementId(),
      material: config.infillMaterial,
      position: [position[0], position[1] + config.thickness, position[2]],
      size: [config.width, infillThickness, size[2]],
      type: 'infill'
    }
    elements.push(infill)
  }

  // Check if post material is dimensional and dimensions match
  const postMaterial = resolveMaterial(config.material)
  if (postMaterial && postMaterial.type === 'dimensional') {
    const dimensionalMaterial = postMaterial as Material & { type: 'dimensional' }
    if (dimensionalMaterial.width !== config.width || dimensionalMaterial.thickness !== config.thickness) {
      warnings.push({
        description: `Post dimensions (${config.width}x${config.thickness}mm) don't match material dimensions (${dimensionalMaterial.width}x${dimensionalMaterial.thickness}mm)`,
        elements: [post1.id, post2.id]
      })
    }
  }

  return {
    it: elements,
    errors,
    warnings
  }
}

export const constructPost = (
  position: Vec3,
  size: Vec3,
  config: PostConfig,
  resolveMaterial: ResolveMaterialFunction
): WithIssues<ConstructionElement[]> => {
  if (config.type === 'full') {
    return constructFullPost(position, size, config, resolveMaterial)
  } else if (config.type === 'double') {
    return constructDoublePost(position, size, config, resolveMaterial)
  } else {
    throw new Error('Invalid post type')
  }
}
