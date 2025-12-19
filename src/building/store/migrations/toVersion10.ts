import type { Migration } from './shared'
import { isRecord } from './shared'

/**
 * Migration to version 10: Move ring beam configuration from Perimeter to PerimeterWall
 *
 * Changes:
 * - Remove baseRingBeamAssemblyId and topRingBeamAssemblyId from Perimeter
 * - Add baseRingBeamAssemblyId and topRingBeamAssemblyId to each PerimeterWall
 * - Copy perimeter-level values to all walls in that perimeter
 */
export const migrateToVersion10: Migration = state => {
  if (!isRecord(state)) return

  if (isRecord(state.perimeters)) {
    for (const perimeter of Object.values(state.perimeters)) {
      if (!isRecord(perimeter)) continue

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const baseRingBeam = (perimeter as any).baseRingBeamAssemblyId
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const topRingBeam = (perimeter as any).topRingBeamAssemblyId

      // Apply to all walls
      if (Array.isArray(perimeter.walls)) {
        perimeter.walls.forEach(wall => {
          if (isRecord(wall)) {
            if (baseRingBeam) wall.baseRingBeamAssemblyId = baseRingBeam
            if (topRingBeam) wall.topRingBeamAssemblyId = topRingBeam
          }
        })
      }

      // Remove from perimeter level
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (perimeter as any).baseRingBeamAssemblyId
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (perimeter as any).topRingBeamAssemblyId
    }
  }
}
