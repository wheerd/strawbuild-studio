import type { Migration } from './shared'
import { isRecord } from './shared'

/**
 * Migration to version 6: Add roofs support
 *
 * Changes:
 * - Add `roofs` field to store state (empty object by default)
 */
export const migrateToVersion6: Migration = state => {
  if (!isRecord(state)) return

  // Add roofs field if it doesn't exist
  if (!('roofs' in state)) {
    state.roofs = {}
  }

  // Ensure roofs is a valid record
  if (!isRecord(state.roofs)) {
    state.roofs = {}
  }
}
