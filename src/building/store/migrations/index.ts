import type { Migration, MigrationState } from './shared'
import { migrateToVersion2 } from './toVersion2'
import { migrateToVersion3 } from './toVersion3'
import { migrateToVersion4 } from './toVersion4'
import { migrateToVersion5 } from './toVersion5'
import { migrateToVersion6 } from './toVersion6'
import { migrateToVersion7 } from './toVersion7'

export const CURRENT_VERSION = 7

const migrations: Migration[] = [
  migrateToVersion2,
  migrateToVersion3,
  migrateToVersion4,
  migrateToVersion5,
  migrateToVersion6,
  migrateToVersion7
]

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
