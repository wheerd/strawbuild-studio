import type { RingBeamAssembly, WallAssembly } from '@/construction/config/types'

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
  ringBeamAssemblies: RingBeamAssembly[],
  wallAssemblies: WallAssembly[]
): MaterialUsage {
  const usedByConfigs: string[] = []

  // Check ring beam assemblies

  ringBeamAssemblies.forEach(assembly => {
    if (assembly.config.material === materialId) {
      usedByConfigs.push(`Ring Beam: ${assembly.name}`)
    }
  })

  // Check wall assemblies
  wallAssemblies.forEach(assembly => {
    const configUsages: string[] = []

    // Check different parts of perimeter config based on type
    switch (assembly.config.type) {
      case 'infill':
        // Posts material
        if (assembly.config.posts.material === materialId) {
          configUsages.push('posts')
        }
        // Infill material (for double posts)
        if ('infillMaterial' in assembly.config.posts && assembly.config.posts.infillMaterial === materialId) {
          configUsages.push('post infill')
        }
        // Opening materials
        if (assembly.config.openings.headerMaterial === materialId) {
          configUsages.push('opening headers')
        }
        if (assembly.config.openings.sillMaterial === materialId) {
          configUsages.push('opening sills')
        }
        // Straw material
        if (assembly.config.straw.material === materialId) {
          configUsages.push('straw')
        }
        break

      case 'strawhenge':
        // Module frame material
        if (assembly.config.module.frameMaterial === materialId) {
          configUsages.push('module frame')
        }
        // Module straw material
        if (assembly.config.module.strawMaterial === materialId) {
          configUsages.push('module straw')
        }
        // Infill posts material
        if (assembly.config.infill.posts.material === materialId) {
          configUsages.push('infill posts')
        }
        // Opening materials
        if (assembly.config.openings.headerMaterial === materialId) {
          configUsages.push('opening headers')
        }
        if (assembly.config.openings.sillMaterial === materialId) {
          configUsages.push('opening sills')
        }
        // Straw material
        if (assembly.config.straw.material === materialId) {
          configUsages.push('straw')
        }
        break

      case 'modules':
        // Module frame material
        if (assembly.config.module.frameMaterial === materialId) {
          configUsages.push('module frame')
        }
        // Module straw material
        if (assembly.config.module.strawMaterial === materialId) {
          configUsages.push('module straw')
        }
        // Infill posts material
        if (assembly.config.infill.posts.material === materialId) {
          configUsages.push('infill posts')
        }
        // Opening materials
        if (assembly.config.openings.headerMaterial === materialId) {
          configUsages.push('opening headers')
        }
        if (assembly.config.openings.sillMaterial === materialId) {
          configUsages.push('opening sills')
        }
        // Straw material
        if (assembly.config.straw.material === materialId) {
          configUsages.push('straw')
        }
        break

      case 'non-strawbale':
        // Wall material
        if (assembly.config.material === materialId) {
          configUsages.push('wall')
        }
        // Opening materials
        if (assembly.config.openings.headerMaterial === materialId) {
          configUsages.push('opening headers')
        }
        if (assembly.config.openings.sillMaterial === materialId) {
          configUsages.push('opening sills')
        }
        // Straw material
        if (assembly.config.straw.material === materialId) {
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
