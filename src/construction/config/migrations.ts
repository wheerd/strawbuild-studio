import { strawbale, wood120x60, woodwool } from '@/construction/materials/material'

export const CURRENT_VERSION = 3

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

  return newState
}
const defaultStrawConfig = {
  baleMinLength: 800,
  baleMaxLength: 900,
  baleHeight: 500,
  baleWidth: 360,
  material: strawbale.id
}
