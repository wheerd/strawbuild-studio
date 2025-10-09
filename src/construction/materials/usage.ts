import { getConfigState } from '@/construction/config/store'

import type { MaterialId } from './material'

export interface MaterialUsage {
  isUsed: boolean
  usedByConfigs: string[]
}

/**
 * Checks if a material is currently in use by any construction configurations
 */
export function getMaterialUsage(materialId: MaterialId): MaterialUsage {
  const configState = getConfigState()
  const usedByConfigs: string[] = []

  // Check ring beam construction methods
  Object.values(configState.ringBeamConstructionMethods).forEach(method => {
    if (method.config.material === materialId) {
      usedByConfigs.push(`Ring Beam: ${method.name}`)
    }
  })

  // Check perimeter construction methods
  Object.values(configState.perimeterConstructionMethods).forEach(method => {
    const configUsages: string[] = []

    // Check different parts of perimeter config based on type
    switch (method.config.type) {
      case 'infill':
        // Posts material
        if (method.config.posts.material === materialId) {
          configUsages.push('posts')
        }
        // Infill material (for double posts)
        if ('infillMaterial' in method.config.posts && method.config.posts.infillMaterial === materialId) {
          configUsages.push('post infill')
        }
        // Opening materials
        if (method.config.openings.headerMaterial === materialId) {
          configUsages.push('opening headers')
        }
        if (method.config.openings.sillMaterial === materialId) {
          configUsages.push('opening sills')
        }
        // Straw material
        if (method.config.straw.material === materialId) {
          configUsages.push('straw')
        }
        break

      case 'strawhenge':
        // Module frame material
        if (method.config.module.frameMaterial === materialId) {
          configUsages.push('module frame')
        }
        // Module straw material
        if (method.config.module.strawMaterial === materialId) {
          configUsages.push('module straw')
        }
        // Infill posts material
        if (method.config.infill.posts.material === materialId) {
          configUsages.push('infill posts')
        }
        // Opening materials
        if (method.config.openings.headerMaterial === materialId) {
          configUsages.push('opening headers')
        }
        if (method.config.openings.sillMaterial === materialId) {
          configUsages.push('opening sills')
        }
        // Straw material
        if (method.config.straw.material === materialId) {
          configUsages.push('straw')
        }
        break

      case 'modules':
        // Module frame material
        if (method.config.module.frameMaterial === materialId) {
          configUsages.push('module frame')
        }
        // Module straw material
        if (method.config.module.strawMaterial === materialId) {
          configUsages.push('module straw')
        }
        // Infill posts material
        if (method.config.infill.posts.material === materialId) {
          configUsages.push('infill posts')
        }
        // Opening materials
        if (method.config.openings.headerMaterial === materialId) {
          configUsages.push('opening headers')
        }
        if (method.config.openings.sillMaterial === materialId) {
          configUsages.push('opening sills')
        }
        // Straw material
        if (method.config.straw.material === materialId) {
          configUsages.push('straw')
        }
        break

      case 'non-strawbale':
        // Wall material
        if (method.config.material === materialId) {
          configUsages.push('wall')
        }
        // Opening materials
        if (method.config.openings.headerMaterial === materialId) {
          configUsages.push('opening headers')
        }
        if (method.config.openings.sillMaterial === materialId) {
          configUsages.push('opening sills')
        }
        // Straw material
        if (method.config.straw.material === materialId) {
          configUsages.push('straw')
        }
        break
    }

    // Add to results if material is used in this config
    if (configUsages.length > 0) {
      usedByConfigs.push(`Perimeter: ${method.name} (${configUsages.join(', ')})`)
    }
  })

  return {
    isUsed: usedByConfigs.length > 0,
    usedByConfigs
  }
}

/**
 * React hook to get material usage information
 */
export function useMaterialUsage(materialId: MaterialId): MaterialUsage {
  return getMaterialUsage(materialId)
}
