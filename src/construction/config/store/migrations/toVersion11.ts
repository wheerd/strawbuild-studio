import type { MigrationState } from './shared'

/**
 * Migration to version 11: Rename roof and floor config fields
 *
 * Changes:
 * - PurlinRoofConfig:
 *   - Rename `insideCladdingMaterial` → `ceilingSheathingMaterial`
 *   - Rename `insideCladdingThickness` → `ceilingSheathingThickness`
 *   - Rename `topCladdingMaterial` → `deckingMaterial`
 *   - Rename `topCladdingThickness` → `deckingThickness`
 *   - Remove `rafterSpacingMax` (unused field)
 * - FilledFloorConfig:
 *   - Rename `bottomCladdingMaterial` → `ceilingSheathingMaterial`
 *   - Rename `bottomCladdingThickness` → `ceilingSheathingThickness`
 */
export function migrateToVersion11(state: MigrationState): void {
  // Migrate roof assemblies
  const roofAssemblies = state.roofAssemblyConfigs
  if (roofAssemblies && typeof roofAssemblies === 'object') {
    for (const assembly of Object.values(roofAssemblies as Record<string, unknown>)) {
      if (!assembly || typeof assembly !== 'object') {
        continue
      }

      const roofConfig = assembly as Record<string, unknown>

      // Only migrate purlin type roof configs
      if (roofConfig.type !== 'purlin') {
        continue
      }

      // Rename insideCladdingMaterial → ceilingSheathingMaterial
      if ('insideCladdingMaterial' in roofConfig && !('ceilingSheathingMaterial' in roofConfig)) {
        roofConfig.ceilingSheathingMaterial = roofConfig.insideCladdingMaterial
        delete roofConfig.insideCladdingMaterial
      }

      // Rename insideCladdingThickness → ceilingSheathingThickness
      if ('insideCladdingThickness' in roofConfig && !('ceilingSheathingThickness' in roofConfig)) {
        roofConfig.ceilingSheathingThickness = roofConfig.insideCladdingThickness
        delete roofConfig.insideCladdingThickness
      }

      // Rename topCladdingMaterial → deckingMaterial
      if ('topCladdingMaterial' in roofConfig && !('deckingMaterial' in roofConfig)) {
        roofConfig.deckingMaterial = roofConfig.topCladdingMaterial
        delete roofConfig.topCladdingMaterial
      }

      // Rename topCladdingThickness → deckingThickness
      if ('topCladdingThickness' in roofConfig && !('deckingThickness' in roofConfig)) {
        roofConfig.deckingThickness = roofConfig.topCladdingThickness
        delete roofConfig.topCladdingThickness
      }

      // Remove unused rafterSpacingMax field
      if ('rafterSpacingMax' in roofConfig) {
        delete roofConfig.rafterSpacingMax
      }
    }
  }

  // Migrate floor assemblies
  const floorAssemblies = state.floorAssemblyConfigs
  if (floorAssemblies && typeof floorAssemblies === 'object') {
    for (const assembly of Object.values(floorAssemblies as Record<string, unknown>)) {
      if (!assembly || typeof assembly !== 'object') {
        continue
      }

      const floorConfig = assembly as Record<string, unknown>

      // Only migrate filled type floor configs
      if (floorConfig.type !== 'filled') {
        continue
      }

      // Rename bottomCladdingMaterial → ceilingSheathingMaterial
      if ('bottomCladdingMaterial' in floorConfig && !('ceilingSheathingMaterial' in floorConfig)) {
        floorConfig.ceilingSheathingMaterial = floorConfig.bottomCladdingMaterial
        delete floorConfig.bottomCladdingMaterial
      }

      // Rename bottomCladdingThickness → ceilingSheathingThickness
      if ('bottomCladdingThickness' in floorConfig && !('ceilingSheathingThickness' in floorConfig)) {
        floorConfig.ceilingSheathingThickness = floorConfig.bottomCladdingThickness
        delete floorConfig.bottomCladdingThickness
      }
    }
  }
}
