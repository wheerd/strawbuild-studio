import type { LayerSetId } from '@/building/model/ids'
import { DEFAULT_LAYER_SETS } from '@/construction/config/store/slices/layers.defaults'

import type { MigrationState } from './shared'

type LayerSetUse = 'wall' | 'floor' | 'ceiling' | 'roof'

interface LayerConfig {
  type: 'monolithic' | 'striped'
  name: string
  thickness: number
  material?: string
  overlap?: boolean
}

interface OldLayersConfig {
  insideThickness?: number
  insideLayers?: LayerConfig[]
  outsideThickness?: number
  outsideLayers?: LayerConfig[]
  topThickness?: number
  topLayers?: LayerConfig[]
  bottomThickness?: number
  bottomLayers?: LayerConfig[]
  overhangThickness?: number
  overhangLayers?: LayerConfig[]
}

export function migrateToVersion15(state: MigrationState): void {
  if ('layerSetConfigs' in state) {
    return
  }

  const sumThickness = (layers: LayerConfig[] | undefined): number =>
    (layers ?? []).reduce((total, layer) => total + (layer.overlap ? 0 : layer.thickness), 0)

  const getLayersKey = (layers: LayerConfig[] | undefined): string => {
    if (!layers || layers.length === 0) return 'empty'
    return JSON.stringify(
      layers.map(l => ({
        type: l.type,
        name: l.name,
        thickness: l.thickness,
        material: l.material,
        overlap: l.overlap,
        direction: (l as { direction?: string }).direction,
        stripeMaterial: (l as { stripeMaterial?: string }).stripeMaterial,
        stripeWidth: (l as { stripeWidth?: number }).stripeWidth,
        gapMaterial: (l as { gapMaterial?: string }).gapMaterial,
        gapWidth: (l as { gapWidth?: number }).gapWidth
      }))
    )
  }

  const matchesDefaultLayerSet = (
    layers: LayerConfig[] | undefined,
    defaultLayers: { layers: LayerConfig[] }
  ): boolean => {
    if (!layers) return defaultLayers.layers.length === 0
    if (layers.length !== defaultLayers.layers.length) return false
    return getLayersKey(layers) === getLayersKey(defaultLayers.layers)
  }

  const configToIdMap = new Map<string, string>()
  let layerSetCounter = 1

  const createLayerSetId = (): LayerSetId => `ls_migrated_${layerSetCounter++}` as LayerSetId

  const getOrCreateLayerSet = (layers: LayerConfig[] | undefined, use: LayerSetUse): LayerSetId | undefined => {
    if (!layers || layers.length === 0) {
      return undefined
    }

    const matchingDefault = DEFAULT_LAYER_SETS.find(
      d => d.use === use && matchesDefaultLayerSet(layers, { layers: d.layers as LayerConfig[] })
    )
    if (matchingDefault) {
      return matchingDefault.id
    }

    const key = `${use}:${getLayersKey(layers)}`
    const existingId = configToIdMap.get(key)
    if (existingId) {
      return existingId as LayerSetId
    }

    const newId = createLayerSetId()
    const totalThickness = sumThickness(layers)

    const newLayerSet = {
      id: newId,
      name: `Migrated ${use} layers ${layerSetCounter - 1}`,
      layers,
      totalThickness,
      use
    }

    state.layerSetConfigs ??= {}
    ;(state.layerSetConfigs as Record<string, unknown>)[newId] = newLayerSet
    configToIdMap.set(key, newId)

    return newId
  }

  state.layerSetConfigs = Object.fromEntries(DEFAULT_LAYER_SETS.map(ls => [ls.id, ls]))

  const wallAssemblies = state.wallAssemblyConfigs
  if (wallAssemblies && typeof wallAssemblies === 'object') {
    for (const assembly of Object.values(wallAssemblies)) {
      const config = assembly as Record<string, unknown>
      const layers = config.layers as OldLayersConfig | undefined

      if (layers) {
        config.insideLayerSetId = getOrCreateLayerSet(layers.insideLayers, 'wall')
        config.outsideLayerSetId = getOrCreateLayerSet(layers.outsideLayers, 'wall')
        delete config.layers
      }
    }
  }

  const floorAssemblies = state.floorAssemblyConfigs
  if (floorAssemblies && typeof floorAssemblies === 'object') {
    for (const assembly of Object.values(floorAssemblies)) {
      const config = assembly as Record<string, unknown>
      const layers = config.layers as OldLayersConfig | undefined

      if (layers) {
        config.topLayerSetId = getOrCreateLayerSet(layers.topLayers, 'floor')
        config.bottomLayerSetId = getOrCreateLayerSet(layers.bottomLayers, 'ceiling')
        delete config.layers
      }
    }
  }

  const roofAssemblies = state.roofAssemblyConfigs
  if (roofAssemblies && typeof roofAssemblies === 'object') {
    for (const assembly of Object.values(roofAssemblies)) {
      const config = assembly as Record<string, unknown>
      const layers = config.layers as OldLayersConfig | undefined

      if (layers) {
        config.insideLayerSetId = getOrCreateLayerSet(layers.insideLayers, 'ceiling')
        config.topLayerSetId = getOrCreateLayerSet(layers.topLayers, 'roof')
        config.overhangLayerSetId = getOrCreateLayerSet(layers.overhangLayers, 'roof')
        delete config.layers
      }
    }
  }
}
