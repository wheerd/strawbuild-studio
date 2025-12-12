import { strawbale, wood } from '@/construction/materials/material'

import type { MigrationState } from './shared'

/**
 * Migration to version 9: Update JoistFloorConfig
 *
 * Changes:
 * - Rename `joistHeight` to `constructionHeight`
 * - Add `wallBeamThickness` (default: 120mm)
 * - Add `wallBeamMaterial` (default: wood.id)
 * - Add `wallBeamInsideOffset` (default: 40mm)
 * - Add `wallInfillMaterial` (default: straw.id)
 * - Add `openingSideThickness` (default: 60mm)
 * - Add `openingSideMaterial` (default: wood.id)
 */
export function migrateToVersion9(state: MigrationState): void {
  const assemblies = state.floorAssemblyConfigs
  if (!assemblies || typeof assemblies !== 'object') {
    return
  }

  for (const assembly of Object.values(assemblies as Record<string, unknown>)) {
    if (!assembly || typeof assembly !== 'object') {
      continue
    }

    const assemblyConfig = assembly as Record<string, unknown>

    // Only migrate joist type floor configs
    if (assemblyConfig.type !== 'joist') {
      continue
    }

    // 1. Rename joistHeight to constructionHeight
    if ('joistHeight' in assemblyConfig && !('constructionHeight' in assemblyConfig)) {
      assemblyConfig.constructionHeight = assemblyConfig.joistHeight
      delete assemblyConfig.joistHeight
    }

    // 2. Add new wall beam fields with defaults matching the default joist floor config
    if (!('wallBeamThickness' in assemblyConfig)) {
      assemblyConfig.wallBeamThickness = 120
    }

    if (!('wallBeamMaterial' in assemblyConfig)) {
      assemblyConfig.wallBeamMaterial = wood.id
    }

    if (!('wallBeamInsideOffset' in assemblyConfig)) {
      assemblyConfig.wallBeamInsideOffset = 40
    }

    if (!('wallInfillMaterial' in assemblyConfig)) {
      assemblyConfig.wallInfillMaterial = strawbale.id
    }

    // 3. Add new opening side fields
    if (!('openingSideThickness' in assemblyConfig)) {
      assemblyConfig.openingSideThickness = 60
    }

    if (!('openingSideMaterial' in assemblyConfig)) {
      assemblyConfig.openingSideMaterial = wood.id
    }
  }
}
