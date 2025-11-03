import type { Migration, MigrationState } from './shared'
import { migrateToVersion2 } from './toVersion2'
import { migrateToVersion3 } from './toVersion3'

export const CURRENT_VERSION = 3

const migrations: Migration[] = [migrateToVersion2, migrateToVersion3]

export function applyMigrations(state: unknown): unknown {
  if (!state || typeof state !== 'object') {
    return state
  }

  const mutableState: MigrationState = { ...(state as MigrationState) }

  for (const migrate of migrations) {
    migrate(mutableState)
  }

  return mutableState
}

export type { Migration, MigrationState } from './shared'
