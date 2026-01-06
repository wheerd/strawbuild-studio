import { battens } from '@/construction/materials/material'

import type { MigrationState } from './shared'

/**
 * Migration to version 13: Add triangular batten configuration
 *
 * Changes:
 * - InfillWallSegmentConfig:
 *   - Add `triangularBattens` field with default values (disabled by default)
 * - ModuleConfig:
 *   - Add `triangularBattens` field with default values (disabled by default)
 */
export function migrateToVersion13(state: MigrationState): void {
  const wallAssemblies = state.wallAssemblyConfigs
  if (!wallAssemblies || typeof wallAssemblies !== 'object') {
    return
  }

  const defaultTriangularBattens = {
    size: 30,
    material: battens.id,
    inside: false,
    outside: false,
    minLength: 100
  }

  for (const assembly of Object.values(wallAssemblies)) {
    const wallConfig = assembly as Record<string, unknown>

    // Add to direct infill configs
    if (wallConfig.type === 'infill' && !('triangularBattens' in wallConfig)) {
      wallConfig.triangularBattens = defaultTriangularBattens
    }

    // Add to module configs (for modules and strawhenge)
    if (
      (wallConfig.type === 'modules' || wallConfig.type === 'strawhenge') &&
      'module' in wallConfig &&
      typeof wallConfig.module === 'object'
    ) {
      const moduleConfig = wallConfig.module as Record<string, unknown>
      if (!('triangularBattens' in moduleConfig)) {
        moduleConfig.triangularBattens = defaultTriangularBattens
      }
    }

    // Add to infill segment in modules/strawhenge configs
    if (
      (wallConfig.type === 'modules' || wallConfig.type === 'strawhenge') &&
      'infill' in wallConfig &&
      typeof wallConfig.infill === 'object'
    ) {
      const infillConfig = wallConfig.infill as Record<string, unknown>
      if (!('triangularBattens' in infillConfig)) {
        infillConfig.triangularBattens = defaultTriangularBattens
      }
    }
  }
}
