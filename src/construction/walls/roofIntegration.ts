import type { StoreyId } from '@/building/model/ids'
import { getModelActions } from '@/building/store'
import { getConfigActions } from '@/construction/config'
import { WallConstructionArea } from '@/construction/geometry'
import { type PerimeterConstructionContext } from '@/construction/perimeters/context'
import { resolveRoofAssembly } from '@/construction/roofs'
import type { HeightItem, HeightJumpItem, HeightLine } from '@/construction/roofs/types'
import { VerticalOffsetMap } from '@/construction/storeys/offsets'
import { type Length, type LineSegment2D, type Vec2, newVec2 } from '@/shared/geometry'

// Use smaller epsilon for position comparisons
const POSITION_EPSILON = 0.0001

/**
 * Result of converting height line to wall offsets
 */
export type WallTopOffsets = readonly Vec2[] | undefined

export function getRoofHeightLineForLines(
  storeyId: StoreyId,
  lines: LineSegment2D[],
  ceilingBottomOffset: Length,
  perimeterContexts: PerimeterConstructionContext[]
): HeightLine {
  const { getRoofsByStorey } = getModelActions()
  const { getRoofAssemblyById } = getConfigActions()

  const offsetMap = new VerticalOffsetMap(ceilingBottomOffset, true)
  const roofs = getRoofsByStorey(storeyId)

  for (const roof of roofs) {
    const roofAssembly = getRoofAssemblyById(roof.assemblyId)
    if (!roofAssembly) continue

    const roofImpl = resolveRoofAssembly(roofAssembly)
    roofImpl.getBottomOffsets(roof, offsetMap, perimeterContexts)
  }

  return mergeHeightLines(...lines.map(l => offsetMap.getOffsets(l)))
}

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

function mergeHeightLines(...lines: HeightLine[]): HeightLine {
  if (lines.length === 0 || lines.every(l => l.length === 0)) {
    return []
  }
  const allPositions = lines.flatMap(l => l.map(x => x.position))
  const uniquePositions = new Set(allPositions)
  const sortedPositions = Array.from(uniquePositions).sort((a, b) => a - b)

  const merged: HeightLine = []
  for (const pos of sortedPositions) {
    const offsets = lines.map(l => getOffsetAt(l, pos))
    const beforeOffsets = offsets.map(o => o[0])
    const afterOffsets = offsets.map(o => o[1])

    const beforeOffset = Math.min(...beforeOffsets)
    const afterOffset = Math.min(...afterOffsets)

    if (beforeOffset !== afterOffset) {
      merged.push({
        position: pos,
        offsetBefore: beforeOffset,
        offsetAfter: afterOffset
      } as HeightJumpItem)
    } else {
      merged.push({
        position: pos,
        offset: beforeOffset,
        nullAfter: false
      })
    }
  }

  return merged
}

/**
 * Get offset before/after at position by interpolation
 */
function getOffsetAt(heightLine: HeightLine, position: number): [Length, Length] {
  // Clamp position
  position = Math.max(0, Math.min(1, position))

  // Find surrounding items
  let before: HeightItem | HeightJumpItem | null = null
  let after: HeightItem | HeightJumpItem | null = null

  for (const item of heightLine) {
    if (item.position <= position) {
      before = item
    }
    if (item.position >= position) {
      after = item
      break
    }
  }

  if (!before || !after) {
    throw new Error('inconsistent height line (not filled?)')
  }

  // Exact match
  if (Math.abs(before.position - position) < POSITION_EPSILON) {
    return isHeightItem(before) ? [before.offset, before.offset] : [before.offsetBefore, before.offsetAfter]
  }
  if (Math.abs(after.position - position) < POSITION_EPSILON) {
    return isHeightItem(after) ? [after.offset, after.offset] : [after.offsetBefore, after.offsetAfter]
  }

  // Interpolate
  const beforeOffset = isHeightItem(before) ? before.offset : before.offsetAfter
  const afterOffset = isHeightItem(after) ? after.offset : after.offsetBefore

  const ratio = (position - before.position) / (after.position - before.position)
  const interpolated = beforeOffset + ratio * (afterOffset - beforeOffset)
  return [interpolated, interpolated]
}

function isHeightJumpItem(item: HeightJumpItem | HeightItem): item is HeightJumpItem {
  return 'offsetBefore' in item && 'offsetAfter' in item
}

function isHeightItem(item: HeightJumpItem | HeightItem): item is HeightItem {
  return 'offset' in item && 'nullAfter' in item
}

/**
 * Split a WallConstructionArea at height jumps (discontinuities)
 * Returns array of continuous segments
 */
export function splitAtHeightJumps(area: WallConstructionArea): WallConstructionArea[] {
  if (!area.topOffsets || area.topOffsets.length === 0) {
    return [area]
  }

  const segments: WallConstructionArea[] = []
  let start = 0

  // Find positions where jumps occur (same X position, different offsets)
  for (let i = 0; i < area.topOffsets.length - 1; i++) {
    const current = area.topOffsets[i]
    const next = area.topOffsets[i + 1]
    if (Math.abs(current[0] - next[0]) < POSITION_EPSILON) {
      const end = current[0]
      const subArea = area.withXAdjustment(start, end - start)
      if (!subArea.isEmpty) segments.push(subArea)
      start = end
    }
  }

  if (segments.length === 0) {
    return [area]
  }

  const subArea = area.withXAdjustment(start)
  if (!subArea.isEmpty) segments.push(subArea)

  return segments
}
