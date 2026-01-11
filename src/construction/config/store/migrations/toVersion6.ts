import { strawbale } from '@/construction/materials/material'

import type { MigrationState } from './shared'

export function migrateToVersion6(state: MigrationState): void {
  if ('defaultStrawMaterial' in state) {
    return
  }

  state.defaultStrawMaterial = strawbale.id
  delete state.straw
}
