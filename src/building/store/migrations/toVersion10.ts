import type { RingBeamAssemblyId } from '@/building/model'

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

      const baseRingBeam = perimeter.baseRingBeamAssemblyId as RingBeamAssemblyId | undefined
      const topRingBeam = perimeter.topRingBeamAssemblyId as RingBeamAssemblyId | undefined

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
      delete perimeter.baseRingBeamAssemblyId
      delete perimeter.topRingBeamAssemblyId
    }
  }
}
