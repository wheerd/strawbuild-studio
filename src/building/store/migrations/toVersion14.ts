import type { Migration } from './shared'
import { isRecord } from './shared'

/**
 * Migration to version 14: Initialize building constraints state
 *
 * Major changes:
 * - Initializes the buildingConstraints record if it doesn't exist
 * - Initializes the _constraintsByEntity reverse index if it doesn't exist
 */
export const migrateToVersion14: Migration = state => {
  if (!isRecord(state)) return

  if (!isRecord(state.buildingConstraints)) {
    ;(state as { buildingConstraints: Record<string, unknown> }).buildingConstraints = {}
  }

  if (!isRecord(state._constraintsByEntity)) {
    ;(state as { _constraintsByEntity: Record<string, unknown[]> })._constraintsByEntity = {}
  }
}
