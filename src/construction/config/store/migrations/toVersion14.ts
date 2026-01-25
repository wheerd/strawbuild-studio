import type { MigrationState } from './shared'

/**
 * Migration to version 14: Initialize timestamps for all config entities
 *
 * Major changes:
 * - Initializes the timestamps record if it doesn't exist
 * - Adds timestamps for all config entities that don't already have one
 * - Uses Date.now() for all migrated entities to indicate they were "created" at migration time
 * - Preserves existing timestamps for entities that already have them
 *
 * Entity types that receive timestamps:
 * - ringBeamAssemblyConfigs
 * - wallAssemblyConfigs
 * - floorAssemblyConfigs
 * - roofAssemblyConfigs
 * - openingAssemblyConfigs
 */
export const migrateToVersion14 = (state: MigrationState): void => {
  if (state.timestamps && typeof state.timestamps === 'object') {
    return
  }

  if (!state.timestamps || typeof state.timestamps !== 'object') {
    state.timestamps = {}
  }

  const timestamp = Date.now()
  const entityCollections = [
    state.ringBeamAssemblyConfigs,
    state.wallAssemblyConfigs,
    state.floorAssemblyConfigs,
    state.roofAssemblyConfigs,
    state.openingAssemblyConfigs
  ]

  const timestamps = state.timestamps as Record<string, number>

  for (const collection of entityCollections) {
    if (!collection || typeof collection !== 'object') continue
    for (const entityId of Object.keys(collection)) {
      if (!(entityId in timestamps)) {
        timestamps[entityId] = timestamp
      }
    }
  }
}
