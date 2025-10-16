export const CURRENT_VERSION = 1

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

  return newState
}
