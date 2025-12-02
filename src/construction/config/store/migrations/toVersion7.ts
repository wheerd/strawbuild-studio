import { DEFAULT_ROOF_ASSEMBLIES, DEFAULT_ROOF_ASSEMBLY_ID } from '@/construction/config/store/slices/roofs.defaults'
import { type MaterialId } from '@/construction/materials/material'

import type { MigrationState } from './shared'

export function migrateToVersion7(state: MigrationState): void {
  // Add default roof assembly configs if not present
  if (!('roofAssemblyConfigs' in state)) {
    state.roofAssemblyConfigs = Object.fromEntries(DEFAULT_ROOF_ASSEMBLIES.map(config => [config.id, config]))
  }

  // Add default roof assembly ID if not present
  if (!('defaultRoofAssemblyId' in state)) {
    state.defaultRoofAssemblyId = DEFAULT_ROOF_ASSEMBLY_ID
  }

  // Ensure layer arrays exist for all roof assemblies (similar to toVersion5)
  ensureRoofLayerArrays(state.roofAssemblyConfigs)
}

function ensureRoofLayerArrays(assemblies: unknown): void {
  if (!assemblies || typeof assemblies !== 'object') {
    return
  }

  for (const assembly of Object.values(assemblies as Record<string, unknown>)) {
    if (!assembly || typeof assembly !== 'object') {
      continue
    }

    const assemblyConfig = assembly as Record<string, unknown>
    const layers = assemblyConfig.layers
    if (!layers || typeof layers !== 'object') {
      continue
    }

    const layerConfig = layers as Record<string, unknown>

    ensureLayerArray(layerConfig, 'insideLayers', 'insideThickness')
    ensureLayerArray(layerConfig, 'topLayers', 'topThickness')
    ensureLayerArray(layerConfig, 'overhangLayers', 'overhangThickness')
    ensureLayerNames(layerConfig, 'insideLayers', 'Inside Layer')
    ensureLayerNames(layerConfig, 'topLayers', 'Top Layer')
    ensureLayerNames(layerConfig, 'overhangLayers', 'Overhang Layer')
  }
}

function ensureLayerArray(
  layerConfig: Record<string, unknown>,
  key: 'insideLayers' | 'topLayers' | 'overhangLayers',
  thicknessKey: 'insideThickness' | 'topThickness' | 'overhangThickness'
): void {
  const existing = layerConfig[key]
  if (Array.isArray(existing)) {
    return
  }

  const thickness = Number(layerConfig[thicknessKey] ?? 0)
  layerConfig[key] = [
    {
      type: 'monolithic',
      name: 'Default Layer',
      material: 'material_invalid' as MaterialId,
      thickness: Number.isFinite(thickness) ? Math.max(thickness, 0) : 0
    }
  ]
}

function ensureLayerNames(
  layerConfig: Record<string, unknown>,
  key: 'insideLayers' | 'topLayers' | 'overhangLayers',
  prefix: string
): void {
  const layers = layerConfig[key]
  if (!Array.isArray(layers)) {
    return
  }

  layers.forEach((layer, index) => {
    if (!layer || typeof layer !== 'object') {
      return
    }
    const layerObject = layer as Record<string, unknown>
    const existingName = typeof layerObject.name === 'string' ? layerObject.name.trim() : ''
    layerObject.name = existingName.length > 0 ? existingName : `${prefix} ${index + 1}`
  })
}
