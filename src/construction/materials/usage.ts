import type { OpeningAssemblyConfig, RingBeamAssemblyConfig, WallAssemblyConfig } from '@/construction/config/types'

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
  wallAssemblies: WallAssemblyConfig[],
  openingAssemblies: OpeningAssemblyConfig[],
  defaultStrawMaterialId?: MaterialId
): MaterialUsage {
  const usedByConfigs: string[] = []

  // Check ring beam assemblies

  ringBeamAssemblies.forEach(assembly => {
    const configUsages: string[] = []

    switch (assembly.type) {
      case 'full':
      case 'double':
        if (assembly.material === materialId) {
          configUsages.push('beam')
        }
        if (assembly.type === 'double' && assembly.infillMaterial === materialId) {
          configUsages.push('infill')
        }
        break

      case 'brick':
        if (assembly.wallMaterial === materialId) {
          configUsages.push('wall')
        }
        if (assembly.beamMaterial === materialId) {
          configUsages.push('beam')
        }
        if (assembly.waterproofingMaterial === materialId) {
          configUsages.push('waterproofing')
        }
        if (assembly.insulationMaterial === materialId) {
          configUsages.push('insulation')
        }
        break
    }

    if (configUsages.length > 0) {
      usedByConfigs.push(`Ring Beam: ${assembly.name} (${configUsages.join(', ')})`)
    }
  })

  if (defaultStrawMaterialId === materialId) {
    usedByConfigs.push('Default Straw Material')
  }

  // Check wall assemblies
  wallAssemblies.forEach(assembly => {
    const configUsages: string[] = []

    // Check different parts of wall assembly based on type
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
        if (assembly.module.type === 'double') {
          if (assembly.module.spacerMaterial === materialId) {
            configUsages.push('module spacers')
          }
          if (assembly.module.infillMaterial === materialId) {
            configUsages.push('module infill')
          }
        }
        // Infill posts material
        if (assembly.infill.posts.material === materialId) {
          configUsages.push('infill posts')
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
        if (assembly.module.type === 'double') {
          if (assembly.module.spacerMaterial === materialId) {
            configUsages.push('module spacers')
          }
          if (assembly.module.infillMaterial === materialId) {
            configUsages.push('module infill')
          }
        }
        // Infill posts material
        if (assembly.infill.posts.material === materialId) {
          configUsages.push('infill posts')
        }
        break

      case 'non-strawbale':
        // Wall material
        if (assembly.material === materialId) {
          configUsages.push('wall')
        }
        break
    }

    // Add to results if material is used in this config
    if (configUsages.length > 0) {
      usedByConfigs.push(`Wall: ${assembly.name} (${configUsages.join(', ')})`)
    }
  })

  // Check opening assemblies
  openingAssemblies.forEach(assembly => {
    const configUsages: string[] = []

    if (assembly.type === 'simple') {
      if (assembly.headerMaterial === materialId) {
        configUsages.push('headers')
      }
      if (assembly.sillMaterial === materialId) {
        configUsages.push('sills')
      }
    }
    // 'empty' type has no materials

    if (configUsages.length > 0) {
      usedByConfigs.push(`Opening: ${assembly.name} (${configUsages.join(', ')})`)
    }
  })

  return {
    isUsed: usedByConfigs.length > 0,
    usedByConfigs
  }
}
