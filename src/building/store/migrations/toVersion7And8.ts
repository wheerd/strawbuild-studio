import type { Opening, OpeningAssemblyId, PerimeterWall, WallAssemblyId } from '@/building/model'
import type { OpeningAssemblyConfig, WallAssemblyConfig } from '@/construction/config'

import type { Migration } from './shared'
import { getPersistedConfigStoreState, isRecord } from './shared'

/**
 * Migration to version 7: Convert opening positions from edge-based to center-based
 * Migration to version 8: Convert opening dimensions from finished to fitted
 *
 * Changes:
 * - Replace `offsetFromStart` (left edge) with `centerOffsetFromWallStart` (center)
 * - Center position is padding-independent and enables simpler collision detection
 * - Opening width/height now include padding (fitted dimensions)
 * - Opening sillHeight now EXCLUDES padding (fitted dimension - starts lower)
 *
 * Conversion formulas:
 * - centerOffsetFromWallStart = offsetFromStart + width / 2
 * - fitted width = finished width + 2 × padding
 * - fitted height = finished height + 2 × padding
 * - fitted sillHeight = max(0, finished sillHeight - padding)
 */
export const migrateToVersion7And8: Migration = state => {
  if (!isRecord(state)) return

  const configState = getPersistedConfigStoreState()
  const wallAssemblyConfigs = configState?.wallAssemblyConfigs
  const openingAssemblyConfigs = configState?.openingAssemblyConfigs

  if (isRecord(state.perimeters)) {
    for (const perimeter of Object.values(state.perimeters)) {
      if (isRecord(perimeter) && Array.isArray(perimeter.walls)) {
        for (const wall of perimeter.walls) {
          if (isRecord(wall) && Array.isArray(wall.openings)) {
            for (const opening of wall.openings) {
              if (isRecord(opening) && typeof opening.offsetFromStart === 'number') {
                // Convert from left edge to center
                opening.centerOffsetFromWallStart = opening.offsetFromStart + opening.width / 2
                // Remove old property
                delete opening.offsetFromStart

                const padding = resolvePaddingForOpening(opening, wall, wallAssemblyConfigs, openingAssemblyConfigs)

                // Convert dimensions: add padding to width/height
                opening.width = opening.width + 2 * padding
                opening.height = opening.height + 2 * padding

                // Convert sill: subtract padding and clamp to 0
                if (typeof opening.sillHeight === 'number') {
                  opening.sillHeight = Math.max(0, opening.sillHeight - padding)
                }
              }
            }
          }
        }
      }
    }
  }
}

/**
 * Resolve padding for an opening using inheritance chain:
 * 1. Opening's openingAssemblyId
 * 2. Wall's wallAssemblyId → openingAssemblyId
 * 3. Fallback: 0mm (no conversion)
 */
function resolvePaddingForOpening(
  opening: Opening,
  wall: PerimeterWall,
  wallAssemblyConfigs: Record<WallAssemblyId, WallAssemblyConfig> | undefined,
  openingAssemblyConfigs: Record<OpeningAssemblyId, OpeningAssemblyConfig> | undefined
): number {
  // Try opening-specific assembly
  if (opening.openingAssemblyId && openingAssemblyConfigs) {
    const assembly = openingAssemblyConfigs[opening.openingAssemblyId as OpeningAssemblyId]
    if (assembly && typeof assembly.padding === 'number') {
      return assembly.padding
    }
  }

  // Try wall's assembly → opening assembly
  if (wall.wallAssemblyId && wallAssemblyConfigs && openingAssemblyConfigs) {
    const wallAssembly = wallAssemblyConfigs[wall.wallAssemblyId as WallAssemblyId]
    if (wallAssembly && wallAssembly.openingAssemblyId) {
      const assembly = openingAssemblyConfigs[wallAssembly.openingAssemblyId]
      if (assembly && typeof assembly.padding === 'number') {
        return assembly.padding
      }
    }
  }

  // Fallback: 0mm padding (no conversion)
  // This makes missing configs obvious - dimensions stay as-is
  return 0
}
