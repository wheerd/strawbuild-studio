import type { Roof } from '@/building/model'
import { computeRoofDerivedProperties } from '@/building/store/slices/roofsSlice'

import type { Migration } from './shared'
import { isRecord } from './shared'

/**
 * Migration to version 9: Add computed roof properties
 *
 * Changes:
 * - Add slopeAngleRad (converted from slope degrees)
 * - Add ridgeDirection (normalized vector along ridge line)
 * - Add downSlopeDirection (perpendicular CW to ridge)
 * - Add span (horizontal distance from ridge projection)
 * - Add rise (vertical height based on slope and span)
 *
 * These properties are always recomputed from base properties.
 */
export const migrateToVersion9: Migration = state => {
  if (!isRecord(state)) return

  if (isRecord(state.roofs)) {
    for (const roof of Object.values(state.roofs)) {
      if (isRecord(roof)) {
        computeRoofDerivedProperties(roof as Roof)
      }
    }
  }
}
