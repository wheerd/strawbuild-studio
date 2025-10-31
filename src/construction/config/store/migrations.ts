import {
  createDefaultFloorBottomLayers,
  createDefaultFloorTopLayers,
  createDefaultInsideLayers,
  createDefaultOutsideLayers
} from '@/construction/layers/defaults'
import { strawbale, wood120x60, woodwool } from '@/construction/materials/material'

export const CURRENT_VERSION = 5

export function applyMigrations(state: unknown): unknown {
  if (!state || typeof state !== 'object') {
    throw new Error('State is null or undefined')
  }

  const oldState = state as Record<string, unknown>
  const newState: Record<string, unknown> = { ...oldState }

  // Migrate ring beam assemblies from wrapper format to flat format
  if ('ringBeamAssemblies' in oldState && oldState.ringBeamAssemblies) {
    const newRingBeamConfigs: Record<string, unknown> = {}

    for (const [id, assembly] of Object.entries(oldState.ringBeamAssemblies as Record<string, unknown>)) {
      if (!assembly || typeof assembly !== 'object') {
        throw new Error(`Invalid ring beam assembly with id ${id}`)
      }

      const assemblyObj = assembly as Record<string, unknown>
      const config = assemblyObj.config as Record<string, unknown> | undefined
      const name = assemblyObj.name

      if (!config || typeof config !== 'object') {
        throw new Error(`Ring beam assembly ${id} missing config`)
      }

      if (!config.type) {
        throw new Error(`Ring beam assembly ${id} missing type`)
      }

      newRingBeamConfigs[id] = {
        id,
        name,
        ...config
      }
    }

    newState.ringBeamAssemblyConfigs = newRingBeamConfigs
    delete newState.ringBeamAssemblies
  }

  // Migrate wall assemblies from wrapper format to flat format
  if ('wallAssemblies' in oldState && oldState.wallAssemblies) {
    const newWallConfigs: Record<string, unknown> = {}

    for (const [id, assembly] of Object.entries(oldState.wallAssemblies as Record<string, unknown>)) {
      if (!assembly || typeof assembly !== 'object') {
        throw new Error(`Invalid wall assembly with id ${id}`)
      }

      const assemblyObj = assembly as Record<string, unknown>
      const config = assemblyObj.config as Record<string, unknown> | undefined
      const layers = assemblyObj.layers
      const name = assemblyObj.name

      if (!config || typeof config !== 'object') {
        throw new Error(`Wall assembly ${id} missing config`)
      }

      if (!config.type) {
        throw new Error(`Wall assembly ${id} missing type`)
      }

      if (!layers) {
        throw new Error(`Wall assembly ${id} missing layers`)
      }

      newWallConfigs[id] = {
        id,
        name,
        layers,
        ...config
      }
    }

    newState.wallAssemblyConfigs = newWallConfigs
    delete newState.wallAssemblies
  }

  const ensureDoubleModuleDefaults = (module: unknown) => {
    if (!module || typeof module !== 'object') {
      return
    }

    const moduleConfig = module as Record<string, unknown>
    if (moduleConfig.type !== 'double') {
      return
    }

    const parsedSpacerSize =
      typeof moduleConfig.spacerSize === 'number'
        ? moduleConfig.spacerSize
        : Number(moduleConfig.spacerSize ?? Number.NaN)
    moduleConfig.spacerSize = Number.isFinite(parsedSpacerSize) && parsedSpacerSize > 0 ? parsedSpacerSize : 120

    const parsedSpacerCount =
      typeof moduleConfig.spacerCount === 'number'
        ? moduleConfig.spacerCount
        : Number.parseInt(String(moduleConfig.spacerCount ?? ''), 10)
    moduleConfig.spacerCount = Number.isFinite(parsedSpacerCount) && parsedSpacerCount >= 2 ? parsedSpacerCount : 3

    if (moduleConfig.spacerMaterial == null) {
      moduleConfig.spacerMaterial = wood120x60.id
    }

    if (moduleConfig.infillMaterial == null) {
      moduleConfig.infillMaterial = woodwool.id
    }
  }

  const updateDoubleModules = (assemblies: unknown) => {
    if (!assemblies || typeof assemblies !== 'object') {
      return
    }

    for (const assembly of Object.values(assemblies as Record<string, unknown>)) {
      if (!assembly || typeof assembly !== 'object') {
        continue
      }

      const assemblyConfig = assembly as Record<string, unknown>
      if ('module' in assemblyConfig) {
        ensureDoubleModuleDefaults(assemblyConfig.module)
      }
    }
  }

  updateDoubleModules(newState.wallAssemblyConfigs)
  const ensureWallLayerArrays = (assemblies: unknown) => {
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

      const ensureLayerArray = (
        key: 'insideLayers' | 'outsideLayers',
        thicknessKey: 'insideThickness' | 'outsideThickness',
        factory: (thickness: number) => unknown
      ) => {
        const existing = layerConfig[key]
        if (Array.isArray(existing) && existing.length > 0) {
          return
        }

        const thickness = Number(layerConfig[thicknessKey] ?? 0)
        layerConfig[key] = factory(Number.isFinite(thickness) ? thickness : 0)
      }

      ensureLayerArray('insideLayers', 'insideThickness', createDefaultInsideLayers)
      ensureLayerArray('outsideLayers', 'outsideThickness', createDefaultOutsideLayers)
    }
  }

  const ensureFloorLayerArrays = (assemblies: unknown) => {
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

      const ensureLayerArray = (
        key: 'topLayers' | 'bottomLayers',
        thicknessKey: 'topThickness' | 'bottomThickness',
        factory: (thickness: number) => unknown
      ) => {
        const existing = layerConfig[key]
        if (Array.isArray(existing) && existing.length > 0) {
          return
        }

        const thickness = Number(layerConfig[thicknessKey] ?? 0)
        layerConfig[key] = factory(Number.isFinite(thickness) ? thickness : 0)
      }

      ensureLayerArray('topLayers', 'topThickness', createDefaultFloorTopLayers)
      ensureLayerArray('bottomLayers', 'bottomThickness', createDefaultFloorBottomLayers)
    }
  }

  ensureWallLayerArrays(newState.wallAssemblyConfigs)
  ensureFloorLayerArrays(newState.floorAssemblyConfigs)

  if (!('straw' in newState) || newState.straw == null) {
    newState.straw = defaultStrawConfig
  }

  const wallAssemblies = newState.wallAssemblyConfigs
  if (wallAssemblies && typeof wallAssemblies === 'object') {
    let migratedStrawConfig: Record<string, unknown> | null = null

    for (const assembly of Object.values(wallAssemblies as Record<string, unknown>)) {
      if (!assembly || typeof assembly !== 'object') {
        continue
      }

      const assemblyConfig = assembly as Record<string, unknown>
      if ('straw' in assemblyConfig) {
        if (migratedStrawConfig == null && assemblyConfig.straw && typeof assemblyConfig.straw === 'object') {
          migratedStrawConfig = assemblyConfig.straw as Record<string, unknown>
        }
        delete assemblyConfig.straw
      }
    }

    if (migratedStrawConfig) {
      const parsed = {
        baleMinLength: Number(migratedStrawConfig.baleMinLength ?? defaultStrawConfig.baleMinLength),
        baleMaxLength: Number(
          migratedStrawConfig.baleMaxLength ?? migratedStrawConfig.baleMinLength ?? defaultStrawConfig.baleMaxLength
        ),
        baleHeight: Number(migratedStrawConfig.baleHeight ?? defaultStrawConfig.baleHeight),
        baleWidth: Number(migratedStrawConfig.baleWidth ?? defaultStrawConfig.baleWidth),
        material:
          typeof migratedStrawConfig.material === 'string' ? migratedStrawConfig.material : defaultStrawConfig.material
      }

      const sanitizedMin =
        Number.isFinite(parsed.baleMinLength) && parsed.baleMinLength > 0
          ? parsed.baleMinLength
          : defaultStrawConfig.baleMinLength

      const sanitizedMaxCandidate =
        Number.isFinite(parsed.baleMaxLength) && parsed.baleMaxLength > 0 ? parsed.baleMaxLength : sanitizedMin
      const sanitizedMax = sanitizedMaxCandidate >= sanitizedMin ? sanitizedMaxCandidate : sanitizedMin

      newState.straw = {
        baleMinLength: sanitizedMin,
        baleMaxLength: sanitizedMax,
        baleHeight:
          Number.isFinite(parsed.baleHeight) && parsed.baleHeight > 0
            ? parsed.baleHeight
            : defaultStrawConfig.baleHeight,
        baleWidth:
          Number.isFinite(parsed.baleWidth) && parsed.baleWidth > 0 ? parsed.baleWidth : defaultStrawConfig.baleWidth,
        material: parsed.material
      }
    }
  }

  const ensureStrawDefaults = () => {
    const strawConfig = newState.straw
    if (!strawConfig || typeof strawConfig !== 'object') {
      newState.straw = { ...defaultStrawConfig }
      return
    }

    const config = strawConfig as Record<string, unknown>
    const sanitized = {
      ...defaultStrawConfig,
      ...config
    } as Record<string, unknown>

    const tolerance = Number(config.tolerance)
    sanitized.tolerance = Number.isFinite(tolerance) && tolerance >= 0 ? tolerance : defaultStrawConfig.tolerance

    const topCutoffLimit = Number(config.topCutoffLimit)
    sanitized.topCutoffLimit =
      Number.isFinite(topCutoffLimit) && topCutoffLimit > 0 ? topCutoffLimit : defaultStrawConfig.topCutoffLimit

    const flakeSize = Number(config.flakeSize)
    sanitized.flakeSize = Number.isFinite(flakeSize) && flakeSize > 0 ? flakeSize : defaultStrawConfig.flakeSize

    newState.straw = sanitized
  }

  ensureStrawDefaults()

  return newState
}
const defaultStrawConfig = {
  baleMinLength: 800,
  baleMaxLength: 900,
  baleHeight: 500,
  baleWidth: 360,
  material: strawbale.id,
  tolerance: 2,
  topCutoffLimit: 50,
  flakeSize: 70
}
