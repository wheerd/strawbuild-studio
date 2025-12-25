import { useMemo } from 'react'

import { usePerimeters } from '@/building/store'
import {
  useDefaultStrawMaterialId,
  useFloorAssemblies,
  useOpeningAssemblies,
  useRingBeamAssemblies,
  useRoofAssemblies,
  useWallAssemblies
} from '@/construction/config/store'
import type {
  FloorAssemblyConfig,
  OpeningAssemblyConfig,
  RingBeamAssemblyConfig,
  RoofAssemblyConfig,
  WallAssemblyConfig
} from '@/construction/config/types'
import type { LayerConfig } from '@/construction/layers/types'

import type { MaterialId } from './material'

export interface MaterialUsage {
  isUsed: boolean
  usedByConfigs: string[]
}

/**
 * React hook that checks if a material is currently in use by any construction configurations
 */
export function useMaterialUsage(materialId: MaterialId): MaterialUsage {
  // Get all data from stores
  const ringBeamAssemblies = useRingBeamAssemblies()
  const wallAssemblies = useWallAssemblies()
  const floorAssemblies = useFloorAssemblies()
  const roofAssemblies = useRoofAssemblies()
  const openingAssemblies = useOpeningAssemblies()
  const defaultStrawMaterialId = useDefaultStrawMaterialId()
  const perimeters = usePerimeters()

  return useMemo(() => {
    const usedByConfigs: string[] = []

    // Check ring beam assemblies
    checkRingBeamAssemblies(materialId, ringBeamAssemblies, usedByConfigs)

    // Check wall assemblies
    checkWallAssemblies(materialId, wallAssemblies, usedByConfigs)

    // Check floor assemblies
    checkFloorAssemblies(materialId, floorAssemblies, usedByConfigs)

    // Check roof assemblies
    checkRoofAssemblies(materialId, roofAssemblies, usedByConfigs)

    // Check opening assemblies
    checkOpeningAssemblies(materialId, openingAssemblies, usedByConfigs)

    // Check wall posts from building model
    checkWallPosts(materialId, perimeters, usedByConfigs)

    // Check default straw material
    if (defaultStrawMaterialId === materialId) {
      usedByConfigs.push('Default Straw Material')
    }

    return {
      isUsed: usedByConfigs.length > 0,
      usedByConfigs
    }
  }, [
    materialId,
    ringBeamAssemblies,
    wallAssemblies,
    floorAssemblies,
    roofAssemblies,
    openingAssemblies,
    defaultStrawMaterialId,
    perimeters
  ])
}

// Helper functions for checking different assembly types

function checkRingBeamAssemblies(
  materialId: MaterialId,
  ringBeamAssemblies: RingBeamAssemblyConfig[],
  usedByConfigs: string[]
): void {
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
}

function checkWallAssemblies(
  materialId: MaterialId,
  wallAssemblies: WallAssemblyConfig[],
  usedByConfigs: string[]
): void {
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
        // Optional straw material
        if (assembly.strawMaterial === materialId) {
          configUsages.push('straw')
        }
        // Optional infill material
        if (assembly.infillMaterial === materialId) {
          configUsages.push('infill')
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
        // Optional infill straw material
        if (assembly.infill.strawMaterial === materialId) {
          configUsages.push('infill straw')
        }
        // Optional infill infill material
        if (assembly.infill.infillMaterial === materialId) {
          configUsages.push('infill material')
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
        // Optional infill straw material
        if (assembly.infill.strawMaterial === materialId) {
          configUsages.push('infill straw')
        }
        // Optional infill infill material
        if (assembly.infill.infillMaterial === materialId) {
          configUsages.push('infill material')
        }
        break

      case 'non-strawbale':
        // Wall material
        if (assembly.material === materialId) {
          configUsages.push('wall')
        }
        break
    }

    // Check layers
    checkLayers(assembly.layers.insideLayers, materialId, configUsages, 'inside layers')
    checkLayers(assembly.layers.outsideLayers, materialId, configUsages, 'outside layers')

    // Add to results if material is used in this config
    if (configUsages.length > 0) {
      usedByConfigs.push(`Wall: ${assembly.name} (${configUsages.join(', ')})`)
    }
  })
}

function checkFloorAssemblies(
  materialId: MaterialId,
  floorAssemblies: FloorAssemblyConfig[],
  usedByConfigs: string[]
): void {
  floorAssemblies.forEach(assembly => {
    const configUsages: string[] = []

    switch (assembly.type) {
      case 'monolithic':
        if (assembly.material === materialId) {
          configUsages.push('material')
        }
        break

      case 'joist':
        if (assembly.joistMaterial === materialId) {
          configUsages.push('joists')
        }
        if (assembly.wallBeamMaterial === materialId) {
          configUsages.push('wall beams')
        }
        if (assembly.wallInfillMaterial === materialId) {
          configUsages.push('wall infill')
        }
        if (assembly.subfloorMaterial === materialId) {
          configUsages.push('subfloor')
        }
        if (assembly.openingSideMaterial === materialId) {
          configUsages.push('opening sides')
        }
        break

      case 'filled':
        if (assembly.joistMaterial === materialId) {
          configUsages.push('joists')
        }
        if (assembly.frameMaterial === materialId) {
          configUsages.push('frame')
        }
        if (assembly.subfloorMaterial === materialId) {
          configUsages.push('subfloor')
        }
        if (assembly.ceilingSheathingMaterial === materialId) {
          configUsages.push('ceiling sheathing')
        }
        if (assembly.openingFrameMaterial === materialId) {
          configUsages.push('opening frame')
        }
        // Optional straw material
        if (assembly.strawMaterial === materialId) {
          configUsages.push('straw')
        }
        break
    }

    // Check layers
    checkLayers(assembly.layers.topLayers, materialId, configUsages, 'top layers')
    checkLayers(assembly.layers.bottomLayers, materialId, configUsages, 'bottom layers')

    if (configUsages.length > 0) {
      usedByConfigs.push(`Floor: ${assembly.name} (${configUsages.join(', ')})`)
    }
  })
}

function checkRoofAssemblies(
  materialId: MaterialId,
  roofAssemblies: RoofAssemblyConfig[],
  usedByConfigs: string[]
): void {
  roofAssemblies.forEach(assembly => {
    const configUsages: string[] = []

    switch (assembly.type) {
      case 'monolithic':
        if (assembly.material === materialId) {
          configUsages.push('material')
        }
        if (assembly.infillMaterial === materialId) {
          configUsages.push('infill')
        }
        break

      case 'purlin':
        if (assembly.purlinMaterial === materialId) {
          configUsages.push('purlins')
        }
        if (assembly.infillMaterial === materialId) {
          configUsages.push('infill')
        }
        if (assembly.rafterMaterial === materialId) {
          configUsages.push('rafters')
        }
        if (assembly.ceilingSheathingMaterial === materialId) {
          configUsages.push('ceiling sheathing')
        }
        if (assembly.deckingMaterial === materialId) {
          configUsages.push('decking')
        }
        // Optional straw material
        if (assembly.strawMaterial === materialId) {
          configUsages.push('straw')
        }
        break
    }

    // Check layers
    checkLayers(assembly.layers.insideLayers, materialId, configUsages, 'inside layers')
    checkLayers(assembly.layers.topLayers, materialId, configUsages, 'top layers')
    checkLayers(assembly.layers.overhangLayers, materialId, configUsages, 'overhang layers')

    if (configUsages.length > 0) {
      usedByConfigs.push(`Roof: ${assembly.name} (${configUsages.join(', ')})`)
    }
  })
}

function checkOpeningAssemblies(
  materialId: MaterialId,
  openingAssemblies: OpeningAssemblyConfig[],
  usedByConfigs: string[]
): void {
  openingAssemblies.forEach(assembly => {
    const configUsages: string[] = []

    if (assembly.type === 'simple' || assembly.type === 'post') {
      if (assembly.headerMaterial === materialId) {
        configUsages.push('headers')
      }
      if (assembly.sillMaterial === materialId) {
        configUsages.push('sills')
      }
    }

    if (assembly.type === 'post') {
      if (assembly.posts.material === materialId) {
        configUsages.push('posts')
      }
      if (assembly.posts.type === 'double' && assembly.posts.infillMaterial === materialId) {
        configUsages.push('post infill')
      }
    }

    // 'empty' type has no materials

    if (configUsages.length > 0) {
      usedByConfigs.push(`Opening: ${assembly.name} (${configUsages.join(', ')})`)
    }
  })
}

function checkWallPosts(
  materialId: MaterialId,
  perimeters: ReturnType<typeof usePerimeters>,
  usedByConfigs: string[]
): void {
  let foundMaterial = false
  let foundInfill = false

  // Collect all posts from all perimeters and walls
  for (const perimeter of perimeters) {
    for (const wall of perimeter.walls) {
      for (const post of wall.posts) {
        if (post.material === materialId) {
          foundMaterial = true
        }
        if (post.infillMaterial === materialId) {
          foundInfill = true
        }
        // Early exit if we found both
        if (foundMaterial && foundInfill) {
          break
        }
      }
      if (foundMaterial && foundInfill) {
        break
      }
    }
    if (foundMaterial && foundInfill) {
      break
    }
  }

  // Report grouped usage
  if (foundMaterial || foundInfill) {
    const usages: string[] = []
    if (foundMaterial) usages.push('material')
    if (foundInfill) usages.push('infill')
    usedByConfigs.push(`Wall Posts (${usages.join(', ')})`)
  }
}

function checkLayers(
  layers: LayerConfig[],
  materialId: MaterialId,
  configUsages: string[],
  layerLocation: string
): void {
  const layerMaterials: string[] = []

  for (const layer of layers) {
    if (layer.type === 'monolithic') {
      if (layer.material === materialId) {
        layerMaterials.push(layer.name)
      }
    } else if (layer.type === 'striped') {
      if (layer.stripeMaterial === materialId) {
        layerMaterials.push(`${layer.name} stripes`)
      }
      if (layer.gapMaterial === materialId) {
        layerMaterials.push(`${layer.name} gaps`)
      }
    }
  }

  if (layerMaterials.length > 0) {
    configUsages.push(`${layerLocation}: ${layerMaterials.join(', ')}`)
  }
}
