import { type MaterialId } from '@/construction/materials/material'

import type { MigrationState } from './shared'

export function migrateToVersion5(state: MigrationState): void {
  ensureWallLayerArrays(state.wallAssemblyConfigs)
  ensureFloorLayerArrays(state.floorAssemblyConfigs)
}

function ensureWallLayerArrays(assemblies: unknown): void {
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
    ensureLayerArray(layerConfig, 'outsideLayers', 'outsideThickness')
    ensureLayerNames(layerConfig, 'insideLayers', 'Inside Layer')
    ensureLayerNames(layerConfig, 'outsideLayers', 'Outside Layer')
  }
}

function ensureFloorLayerArrays(assemblies: unknown): void {
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

    ensureLayerArray(layerConfig, 'topLayers', 'topThickness')
    ensureLayerArray(layerConfig, 'bottomLayers', 'bottomThickness')
    ensureLayerNames(layerConfig, 'topLayers', 'Top Layer')
    ensureLayerNames(layerConfig, 'bottomLayers', 'Bottom Layer')
  }
}

function ensureLayerArray(
  layerConfig: Record<string, unknown>,
  key: 'insideLayers' | 'outsideLayers' | 'topLayers' | 'bottomLayers',
  thicknessKey: 'insideThickness' | 'outsideThickness' | 'topThickness' | 'bottomThickness'
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
  key: 'insideLayers' | 'outsideLayers' | 'topLayers' | 'bottomLayers',
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
