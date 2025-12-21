import type { Migration, MigrationState } from './shared'
import { migrateToVersion2 } from './toVersion2'
import { migrateToVersion3 } from './toVersion3'
import { migrateToVersion4 } from './toVersion4'
import { migrateToVersion5 } from './toVersion5'
import { migrateToVersion6 } from './toVersion6'
import { migrateToVersion7And8 } from './toVersion7And8'
import { migrateToVersion9 } from './toVersion9'
import { migrateToVersion10 } from './toVersion10'
import { migrateToVersion11 } from './toVersion11'

export const CURRENT_VERSION = 11

const migrations: Migration[] = [
  migrateToVersion2,
  migrateToVersion3,
  migrateToVersion4,
  migrateToVersion5,
  migrateToVersion6,
  migrateToVersion7And8,
  migrateToVersion9,
  migrateToVersion10,
  migrateToVersion11
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
