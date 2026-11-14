import type { HeightItem, HeightJumpItem, HeightLine } from '@/construction/assemblies/roofs/types'
import { WallConstructionArea } from '@/construction/assemblies/utils/WallConstructionArea'
import type { Vec2 } from '@/shared/geometry'
import { newVec2 } from '@/shared/geometry'

// Use smaller epsilon for position comparisons
/**
 * Result of converting height line to wall offsets
 */
export type WallTopOffsets = readonly Vec2[] | undefined

/**
 * Convert a HeightLine (from roof) to wall top offsets array
 * @param heightLine - Height line from roof (should be fully filled, no null regions)
 * @param wallLength - Length of the wall
 * @returns Wall top offsets with coverage information
 */
export function convertHeightLineToWallOffsets(heightLine: HeightLine, wallLength: number): WallTopOffsets {
  if (heightLine.length === 0) {
    return undefined
  }

  const offsets: Vec2[] = []

  // Convert each height line item to offset
  for (const item of heightLine) {
    const absoluteX = Number((item.position * wallLength).toFixed(2))

    if (isHeightJumpItem(item)) {
      // HeightJumpItem - add both offsets at same position
      offsets.push(newVec2(absoluteX, item.offsetBefore))
      offsets.push(newVec2(absoluteX, item.offsetAfter))
    } else {
      // HeightItem
      offsets.push(newVec2(absoluteX, item.offset))
    }
  }

  return offsets.length > 0 ? offsets : undefined
}

function isHeightJumpItem(item: HeightJumpItem | HeightItem): item is HeightJumpItem {
  return 'offsetBefore' in item && 'offsetAfter' in item
}

/**
 * Split a WallConstructionArea at height jumps (discontinuities)
 * Returns array of continuous segments
 */
export function splitAtHeightJumps(area: WallConstructionArea): WallConstructionArea[] {
  return area.splitAtHeightJumps()
}
