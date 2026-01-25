import type { MaterialsState } from '@/construction/materials/store'

import { migrateToVersion3 } from './migrations/toVersion3'

export const MATERIALS_STORE_VERSION = 3

export const migrateMaterialsState = (persistedState: unknown, version: number): MaterialsState => {
  if (version < 2) {
    return { materials: {}, timestamps: {} }
  }
  if (
    typeof persistedState !== 'object' ||
    persistedState == null ||
    !('materials' in persistedState) ||
    typeof persistedState.materials !== 'object'
  ) {
    return { materials: {}, timestamps: {} }
  }

  return migrateToVersion3(persistedState as MaterialsState)
}
