import type { Migration, MigrationState } from './shared'
import { migrateToVersion9 } from './toVersion9'
import { migrateToVersion10 } from './toVersion10'
import { migrateToVersion11 } from './toVersion11'
import { migrateToVersion12 } from './toVersion12'
import { migrateToVersion13 } from './toVersion13'
import { migrateToVersion14 } from './toVersion14'

export const CURRENT_VERSION = 14

const migrations: Migration[] = [
  migrateToVersion9,
  migrateToVersion10,
  migrateToVersion11,
  migrateToVersion12,
  migrateToVersion13,
  migrateToVersion14
]

export function applyMigrations(state: unknown, version: number): unknown {
  if (version < 8) return null

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
