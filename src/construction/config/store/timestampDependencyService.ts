import type {
  FloorAssemblyId,
  OpeningAssemblyId,
  RingBeamAssemblyId,
  RoofAssemblyId,
  WallAssemblyId
} from '@/building/model/ids'
import { getConfigActions } from '@/construction/config/store'
import type {
  FloorAssemblyConfig,
  OpeningAssemblyConfig,
  RingBeamAssemblyConfig,
  RoofAssemblyConfig,
  WallAssemblyConfig
} from '@/construction/config/types'
import type { LayerConfig } from '@/construction/layers/types'
import type { MaterialId } from '@/construction/materials/material'
import { getMaterialsActions } from '@/construction/materials/store'

export class ConfigTimestampDependencyService {
  private extractMaterialsFromLayers(layers: LayerConfig[]): MaterialId[] {
    const materials: MaterialId[] = []
    for (const layer of layers) {
      if (layer.type === 'monolithic') {
        materials.push(layer.material)
      } else {
        materials.push(layer.stripeMaterial)
        if (layer.gapMaterial) materials.push(layer.gapMaterial)
      }
    }
    return materials
  }

  private extractMaterialsFromWallAssembly(assembly: WallAssemblyConfig): MaterialId[] {
    const materials: MaterialId[] = []

    if (assembly.type === 'infill') {
      if (assembly.posts.type === 'full') {
        materials.push(assembly.posts.material)
      } else {
        materials.push(assembly.posts.material)
        materials.push(assembly.posts.infillMaterial)
      }
      materials.push(assembly.triangularBattens.material)
      if (assembly.strawMaterial) materials.push(assembly.strawMaterial)
      if (assembly.infillMaterial) materials.push(assembly.infillMaterial)
    } else if (assembly.type === 'modules' || assembly.type === 'strawhenge') {
      materials.push(assembly.module.frameMaterial)
      if (assembly.module.strawMaterial) materials.push(assembly.module.strawMaterial)
      materials.push(assembly.infill.triangularBattens.material)

      const infillPosts = assembly.infill.posts
      if (infillPosts.type === 'full') {
        materials.push(infillPosts.material)
      } else {
        materials.push(infillPosts.material)
        materials.push(infillPosts.infillMaterial)
      }
      if (assembly.infill.strawMaterial) materials.push(assembly.infill.strawMaterial)
      if (assembly.infill.infillMaterial) materials.push(assembly.infill.infillMaterial)

      if (assembly.module.type === 'double') {
        materials.push(assembly.module.spacerMaterial)
        materials.push(assembly.module.infillMaterial)
      }
    } else if (assembly.type === 'non-strawbale') {
      materials.push(assembly.material)
    } else {
      materials.push(assembly.defaultMaterial)
      materials.push(assembly.fallbackMaterial)
      materials.push(assembly.inclinedMaterial)
      if (assembly.lintelMaterial) materials.push(assembly.lintelMaterial)
      if (assembly.sillMaterial) materials.push(assembly.sillMaterial)
      materials.push(assembly.tallReinforceMaterial)
    }

    materials.push(...this.extractMaterialsFromLayers(assembly.layers.insideLayers))
    materials.push(...this.extractMaterialsFromLayers(assembly.layers.outsideLayers))

    return materials
  }

  private extractMaterialsFromRingBeamAssembly(assembly: RingBeamAssemblyConfig): MaterialId[] {
    if (assembly.type === 'full') {
      return [assembly.material]
    } else if (assembly.type === 'double') {
      return [assembly.material, assembly.infillMaterial]
    } else {
      return [assembly.wallMaterial, assembly.beamMaterial, assembly.waterproofingMaterial, assembly.insulationMaterial]
    }
  }

  private extractMaterialsFromFloorAssembly(assembly: FloorAssemblyConfig): MaterialId[] {
    const materials: MaterialId[] = []

    if (assembly.type === 'monolithic') {
      materials.push(assembly.material)
    } else if (assembly.type === 'joist') {
      materials.push(
        assembly.joistMaterial,
        assembly.wallBeamMaterial,
        assembly.wallInfillMaterial,
        assembly.subfloorMaterial,
        assembly.openingSideMaterial
      )
    } else if (assembly.type === 'filled') {
      materials.push(
        assembly.joistMaterial,
        assembly.frameMaterial,
        assembly.subfloorMaterial,
        assembly.ceilingSheathingMaterial
      )
    } else {
      materials.push(assembly.joistMaterial, assembly.subfloorMaterial, assembly.openingSideMaterial)
    }

    materials.push(...this.extractMaterialsFromLayers(assembly.layers.bottomLayers))
    materials.push(...this.extractMaterialsFromLayers(assembly.layers.topLayers))

    return materials
  }

  private extractMaterialsFromRoofAssembly(assembly: RoofAssemblyConfig): MaterialId[] {
    const materials: MaterialId[] = []

    if (assembly.type === 'monolithic') {
      materials.push(assembly.material, assembly.infillMaterial)
    } else {
      materials.push(
        assembly.purlinMaterial,
        assembly.rafterMaterial,
        assembly.ceilingSheathingMaterial,
        assembly.deckingMaterial
      )
      if (assembly.strawMaterial) materials.push(assembly.strawMaterial)
    }

    materials.push(...this.extractMaterialsFromLayers(assembly.layers.insideLayers))
    materials.push(...this.extractMaterialsFromLayers(assembly.layers.topLayers))
    materials.push(...this.extractMaterialsFromLayers(assembly.layers.overhangLayers))

    return materials
  }

  private extractMaterialsFromOpeningAssembly(assembly: OpeningAssemblyConfig): MaterialId[] {
    if (assembly.type === 'simple' || assembly.type === 'post') {
      return [assembly.sillMaterial, assembly.headerMaterial]
    } else if (assembly.type === 'planked') {
      return [assembly.sillMaterial, assembly.headerMaterial, assembly.plankMaterial]
    } else {
      return []
    }
  }

  getEffectiveWallAssemblyTimestamp(assemblyId: WallAssemblyId): number | null {
    const configActions = getConfigActions()
    const materialsActions = getMaterialsActions()
    const assembly = configActions.getWallAssemblyById(assemblyId)

    if (!assembly) return null

    const timestamps: (number | null)[] = [configActions.getTimestamp(assemblyId)]

    const materialIds = this.extractMaterialsFromWallAssembly(assembly)
    for (const materialId of materialIds) {
      timestamps.push(materialsActions.getTimestamp(materialId))
    }

    if (assembly.openingAssemblyId) {
      timestamps.push(configActions.getTimestamp(assembly.openingAssemblyId))
    }

    return this.getMaxTimestamp(timestamps)
  }

  getEffectiveRingBeamAssemblyTimestamp(assemblyId: RingBeamAssemblyId): number | null {
    const configActions = getConfigActions()
    const materialsActions = getMaterialsActions()
    const assembly = configActions.getRingBeamAssemblyById(assemblyId)

    if (!assembly) return null

    const timestamps: (number | null)[] = [configActions.getTimestamp(assemblyId)]

    const materialIds = this.extractMaterialsFromRingBeamAssembly(assembly)
    for (const materialId of materialIds) {
      timestamps.push(materialsActions.getTimestamp(materialId))
    }

    return this.getMaxTimestamp(timestamps)
  }

  getEffectiveFloorAssemblyTimestamp(assemblyId: FloorAssemblyId): number | null {
    const configActions = getConfigActions()
    const materialsActions = getMaterialsActions()
    const assembly = configActions.getFloorAssemblyById(assemblyId)

    if (!assembly) return null

    const timestamps: (number | null)[] = [configActions.getTimestamp(assemblyId)]

    const materialIds = this.extractMaterialsFromFloorAssembly(assembly)
    for (const materialId of materialIds) {
      timestamps.push(materialsActions.getTimestamp(materialId))
    }

    return this.getMaxTimestamp(timestamps)
  }

  getEffectiveRoofAssemblyTimestamp(assemblyId: RoofAssemblyId): number | null {
    const configActions = getConfigActions()
    const materialsActions = getMaterialsActions()
    const assembly = configActions.getRoofAssemblyById(assemblyId)

    if (!assembly) return null

    const timestamps: (number | null)[] = [configActions.getTimestamp(assemblyId)]

    const materialIds = this.extractMaterialsFromRoofAssembly(assembly)
    for (const materialId of materialIds) {
      timestamps.push(materialsActions.getTimestamp(materialId))
    }

    return this.getMaxTimestamp(timestamps)
  }

  getEffectiveOpeningAssemblyTimestamp(assemblyId: OpeningAssemblyId): number | null {
    const configActions = getConfigActions()
    const materialsActions = getMaterialsActions()
    const assembly = configActions.getOpeningAssemblyById(assemblyId)

    if (!assembly) return null

    const timestamps: (number | null)[] = [configActions.getTimestamp(assemblyId)]

    const materialIds = this.extractMaterialsFromOpeningAssembly(assembly)
    for (const materialId of materialIds) {
      timestamps.push(materialsActions.getTimestamp(materialId))
    }

    if (assembly.type === 'threshold') {
      for (const threshold of assembly.thresholds) {
        timestamps.push(configActions.getTimestamp(threshold.assemblyId))
      }
    }

    return this.getMaxTimestamp(timestamps)
  }

  private getMaxTimestamp(timestamps: (number | null)[]): number | null {
    const validTimestamps = timestamps.filter((ts): ts is number => ts !== null)
    return validTimestamps.length > 0 ? Math.max(...validTimestamps) : null
  }
}

let serviceInstance: ConfigTimestampDependencyService | null = null

export const getConfigTimestampDependencyService = (): ConfigTimestampDependencyService => {
  serviceInstance ??= new ConfigTimestampDependencyService()
  return serviceInstance
}
