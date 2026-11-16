import {
  DEFAULT_INTERIOR_WALL_ASSEMBLIES,
  DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
} from '@/config/store/slices/interiorWalls.defaults'

import type { MigrationState } from './shared'

export function migrateToVersion16(state: MigrationState): void {
  if ('wallAssemblyConfigs' in state && !('perimeterWallAssemblyConfigs' in state)) {
    state.perimeterWallAssemblyConfigs = state.wallAssemblyConfigs
  }
  if ('defaultWallAssemblyId' in state && !('defaultPerimeterWallAssemblyId' in state)) {
    state.defaultPerimeterWallAssemblyId = state.defaultWallAssemblyId
  }

  delete state.wallAssemblyConfigs
  delete state.defaultWallAssemblyId

  if (!state.interiorWallAssemblyConfigs || typeof state.interiorWallAssemblyConfigs !== 'object') {
    state.interiorWallAssemblyConfigs = {}
  }
  const interiorWallAssemblyConfigs = state.interiorWallAssemblyConfigs as Record<string, unknown>
  for (const assembly of DEFAULT_INTERIOR_WALL_ASSEMBLIES) {
    interiorWallAssemblyConfigs[assembly.id] ??= assembly
  }
  if (typeof state.defaultInteriorWallAssemblyId !== 'string') {
    state.defaultInteriorWallAssemblyId = DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
  }
}
