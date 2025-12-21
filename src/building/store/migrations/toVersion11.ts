import type { Migration } from './shared'
import { isRecord } from './shared'

/**
 * Migration to version 11: Add posts array to PerimeterWall
 *
 * Changes:
 * - Add empty posts[] array to all PerimeterWall objects that don't have one
 */
export const migrateToVersion11: Migration = state => {
  if (!isRecord(state)) return

  if (isRecord(state.perimeters)) {
    for (const perimeter of Object.values(state.perimeters)) {
      if (!isRecord(perimeter)) continue

      // Add posts array to all walls if missing
      if (Array.isArray(perimeter.walls)) {
        perimeter.walls.forEach(wall => {
          if (isRecord(wall)) {
            // Only add if posts array doesn't exist
            if (!Array.isArray(wall.posts)) {
              wall.posts = []
            }
          }
        })
      }
    }
  }
}
