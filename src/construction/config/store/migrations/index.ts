import type { Migration, MigrationState } from './shared'
import { migrateToVersion1 } from './toVersion1'
import { migrateToVersion2 } from './toVersion2'
import { migrateToVersion3 } from './toVersion3'
import { migrateToVersion4 } from './toVersion4'
import { migrateToVersion5 } from './toVersion5'
import { migrateToVersion6 } from './toVersion6'
import { migrateToVersion7 } from './toVersion7'
import { migrateToVersion8 } from './toVersion8'
import { migrateToVersion9 } from './toVersion9'
import { migrateToVersion10 } from './toVersion10'
import { migrateToVersion11 } from './toVersion11'
import { migrateToVersion12 } from './toVersion12'
import { migrateToVersion13 } from './toVersion13'
import { migrateToVersion14 } from './toVersion14'

export const CURRENT_VERSION = 14

const migrations: Migration[] = [
  migrateToVersion1,
  migrateToVersion2,
  migrateToVersion3,
  migrateToVersion4,
  migrateToVersion5,
  migrateToVersion6,
  migrateToVersion7,
  migrateToVersion8,
  migrateToVersion9,
  migrateToVersion10,
  migrateToVersion11,
  migrateToVersion12,
  migrateToVersion13,
  migrateToVersion14
]

export function applyMigrations(state: unknown): unknown {
  if (!state || typeof state !== 'object') {
    throw new Error('State is null or undefined')
  }

  const newState: MigrationState = { ...(state as MigrationState) }

  for (const migrate of migrations) {
    migrate(newState)
  }

  return newState
}

export type { Migration, MigrationState } from './shared'
