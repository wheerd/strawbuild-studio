import { wood120x60, woodwool } from '@/construction/materials/material'

import type { MigrationState } from './shared'

export function migrateToVersion2(state: MigrationState): void {
  updateDoubleModules(state.wallAssemblyConfigs)
}

function updateDoubleModules(assemblies: unknown): void {
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

function ensureDoubleModuleDefaults(module: unknown): void {
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
