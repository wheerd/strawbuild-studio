import type { RingBeamAssemblyConfig, WallAssemblyConfig } from '@/construction/config/types'

import type { MaterialId } from './material'

export interface MaterialUsage {
  isUsed: boolean
  usedByConfigs: string[]
}

/**
 * Checks if a material is currently in use by any construction configurations
 */
export function getMaterialUsage(
  materialId: MaterialId,
  ringBeamAssemblies: RingBeamAssemblyConfig[],
  wallAssemblies: WallAssemblyConfig[]
): MaterialUsage {
  const usedByConfigs: string[] = []

  // Check ring beam assemblies

  ringBeamAssemblies.forEach(assembly => {
    if (assembly.material === materialId) {
      usedByConfigs.push(`Ring Beam: ${assembly.name}`)
    }
  })

  // Check wall assemblies
  wallAssemblies.forEach(assembly => {
    const configUsages: string[] = []

    // Check different parts of perimeter config based on type
    switch (assembly.type) {
      case 'infill':
        // Posts material
        if (assembly.posts.material === materialId) {
          configUsages.push('posts')
        }
        // Infill material (for double posts)
        if ('infillMaterial' in assembly.posts && assembly.posts.infillMaterial === materialId) {
          configUsages.push('post infill')
        }
        // Opening materials
        if (assembly.openings.headerMaterial === materialId) {
          configUsages.push('opening headers')
        }
        if (assembly.openings.sillMaterial === materialId) {
          configUsages.push('opening sills')
        }
        // Straw material
        if (assembly.straw.material === materialId) {
          configUsages.push('straw')
        }
        break

      case 'strawhenge':
        // Module frame material
        if (assembly.module.frameMaterial === materialId) {
          configUsages.push('module frame')
        }
        // Module straw material
        if (assembly.module.strawMaterial === materialId) {
          configUsages.push('module straw')
        }
        // Infill posts material
        if (assembly.infill.posts.material === materialId) {
          configUsages.push('infill posts')
        }
        // Opening materials
        if (assembly.openings.headerMaterial === materialId) {
          configUsages.push('opening headers')
        }
        if (assembly.openings.sillMaterial === materialId) {
          configUsages.push('opening sills')
        }
        // Straw material
        if (assembly.straw.material === materialId) {
          configUsages.push('straw')
        }
        break

      case 'modules':
        // Module frame material
        if (assembly.module.frameMaterial === materialId) {
          configUsages.push('module frame')
        }
        // Module straw material
        if (assembly.module.strawMaterial === materialId) {
          configUsages.push('module straw')
        }
        // Infill posts material
        if (assembly.infill.posts.material === materialId) {
          configUsages.push('infill posts')
        }
        // Opening materials
        if (assembly.openings.headerMaterial === materialId) {
          configUsages.push('opening headers')
        }
        if (assembly.openings.sillMaterial === materialId) {
          configUsages.push('opening sills')
        }
        // Straw material
        if (assembly.straw.material === materialId) {
          configUsages.push('straw')
        }
        break

      case 'non-strawbale':
        // Wall material
        if (assembly.material === materialId) {
          configUsages.push('wall')
        }
        // Opening materials
        if (assembly.openings.headerMaterial === materialId) {
          configUsages.push('opening headers')
        }
        if (assembly.openings.sillMaterial === materialId) {
          configUsages.push('opening sills')
        }
        // Straw material
        if (assembly.straw.material === materialId) {
          configUsages.push('straw')
        }
        break
    }

    // Add to results if material is used in this config
    if (configUsages.length > 0) {
      usedByConfigs.push(`Wall: ${assembly.name} (${configUsages.join(', ')})`)
    }
  })

  return {
    isUsed: usedByConfigs.length > 0,
    usedByConfigs
  }
}
