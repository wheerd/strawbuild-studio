import type { Migration } from './shared'
import { isRecord } from './shared'

/**
 * Migration to version 7: Convert opening positions from edge-based to center-based
 *
 * Changes:
 * - Replace `offsetFromStart` (left edge) with `centerOffsetFromWallStart` (center)
 * - Center position is padding-independent and enables simpler collision detection
 *
 * Conversion: centerOffsetFromWallStart = offsetFromStart + width / 2
 */
export const migrateToVersion7: Migration = state => {
  if (!isRecord(state)) return

  if (isRecord(state.perimeters)) {
    for (const perimeter of Object.values(state.perimeters)) {
      if (isRecord(perimeter) && Array.isArray(perimeter.walls)) {
        for (const wall of perimeter.walls) {
          if (isRecord(wall) && Array.isArray(wall.openings)) {
            for (const opening of wall.openings) {
              if (
                isRecord(opening) &&
                typeof opening.offsetFromStart === 'number' &&
                typeof opening.width === 'number'
              ) {
                // Convert from left edge to center
                opening.centerOffsetFromWallStart = opening.offsetFromStart + opening.width / 2
                // Remove old property
                delete opening.offsetFromStart
              }
            }
          }
        }
      }
    }
  }
}
