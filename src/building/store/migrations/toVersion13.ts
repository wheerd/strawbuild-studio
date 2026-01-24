import type { Migration } from './shared'
import { isRecord } from './shared'

/**
 * Migration to version 13: Initialize timestamps for all entities
 *
 * Major changes:
 * - Initializes the timestamps record if it doesn't exist
 * - Adds timestamps for all entities that don't already have one
 * - Uses Date.now() for all migrated entities to indicate they were "created" at migration time
 * - Preserves existing timestamps for entities that already have them
 *
 * Entity types that receive timestamps:
 * - storeys
 * - perimeters
 * - perimeterWalls
 * - perimeterCorners
 * - openings
 * - wallPosts
 * - floorAreas
 * - floorOpenings
 * - roofs
 * - roofOverhangs
 */
export const migrateToVersion13: Migration = state => {
  if (!isRecord(state)) return

  if (!isRecord(state.timestamps)) {
    ;(state as { timestamps: Record<string, number> }).timestamps = {}
  }

  const timestamp = Date.now()
  const entityCollections = [
    state.storeys,
    state.perimeters,
    state.perimeterWalls,
    state.perimeterCorners,
    state.openings,
    state.wallPosts,
    state.floorAreas,
    state.floorOpenings,
    state.roofs,
    state.roofOverhangs
  ]

  const timestamps = state.timestamps as Record<string, number>

  for (const collection of entityCollections) {
    if (!isRecord(collection)) continue
    for (const entityId of Object.keys(collection)) {
      if (!(entityId in timestamps)) {
        timestamps[entityId] = timestamp
      }
    }
  }
}
