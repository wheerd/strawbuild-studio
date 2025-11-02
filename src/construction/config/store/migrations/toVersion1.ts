import type { MigrationState } from './shared'

export function migrateToVersion1(state: MigrationState): void {
  if ('ringBeamAssemblies' in state && state.ringBeamAssemblies) {
    const newRingBeamConfigs: Record<string, unknown> = {}

    for (const [id, assembly] of Object.entries(state.ringBeamAssemblies as Record<string, unknown>)) {
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

    state.ringBeamAssemblyConfigs = newRingBeamConfigs
    delete state.ringBeamAssemblies
  }

  if ('wallAssemblies' in state && state.wallAssemblies) {
    const newWallConfigs: Record<string, unknown> = {}

    for (const [id, assembly] of Object.entries(state.wallAssemblies as Record<string, unknown>)) {
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

    state.wallAssemblyConfigs = newWallConfigs
    delete state.wallAssemblies
  }
}
