import type { StoreyId } from '@/building/model/ids'
import { getModelActions } from '@/building/store'
import { getConfigActions } from '@/construction/config'
import type { PerimeterConstructionContext } from '@/construction/context'
import { WallConstructionArea } from '@/construction/geometry'
import { resolveRoofAssembly } from '@/construction/roofs'
import type { HeightItem, HeightJumpItem, HeightLine } from '@/construction/roofs/types'
import { type Length, type LineSegment2D, type Vec2, type Vec3, copyVec2, newVec2, newVec3 } from '@/shared/geometry'

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

  const heightLines: HeightLine[] = []
  const roofs = getRoofsByStorey(storeyId)
  for (const line of lines) {
    const heightLine: HeightLine = []

    // Query each roof
    for (const roof of roofs) {
      const roofAssembly = getRoofAssemblyById(roof.assemblyId)
      if (!roofAssembly) continue

      const roofImpl = resolveRoofAssembly(roofAssembly)
      const roofLine = roofImpl.getBottomOffsets(roof, line, perimeterContexts)
      heightLine.push(...roofLine)
    }

    heightLine.sort((a, b) => a.position - b.position)

    const filled = fillNullRegions(heightLine, ceilingBottomOffset)

    heightLines.push(filled)
  }

  return mergeHeightLines(...heightLines)
}

/**
 * Query roofs for height line along any line segment
 * Generalized from getRoofHeightLineForLayer in walls/layers.ts
 *
 * @param storeyId - ID of the storey to query roofs from
 * @param line - Line segment to query along
 * @param lineLength - Length of the line segment
 * @param ceilingBottomOffset - Offset for ceiling (when no roof coverage)
 * @param perimeterContexts - Perimeter contexts for roof queries
 * @returns Wall top offsets representing the height line
 */
export function getRoofHeightLineForLine(
  storeyId: StoreyId,
  line: LineSegment2D,
  lineLength: Length,
  ceilingBottomOffset: Length,
  perimeterContexts: PerimeterConstructionContext[]
): WallTopOffsets | undefined {
  const { getRoofsByStorey } = getModelActions()
  const { getRoofAssemblyById } = getConfigActions()

  const roofs = getRoofsByStorey(storeyId)
  const heightLine: HeightLine = []

  // Query each roof
  for (const roof of roofs) {
    const roofAssembly = getRoofAssemblyById(roof.assemblyId)
    if (!roofAssembly) continue

    const roofImpl = resolveRoofAssembly(roofAssembly)
    const roofLine = roofImpl.getBottomOffsets(roof, line, perimeterContexts)
    heightLine.push(...roofLine)
  }

  if (heightLine.length === 0) {
    return [newVec2(0, -ceilingBottomOffset), newVec2(lineLength, -ceilingBottomOffset)]
  }

  // STEP 1: Merge (sort by position)
  heightLine.sort((a, b) => a.position - b.position)

  // STEP 2: Fill null regions with ceiling offset
  const filled = fillNullRegions(heightLine, ceilingBottomOffset)

  // Convert to wall offsets
  return convertHeightLineToWallOffsets(filled, lineLength)
}

/**
 * Convert a HeightLine (from roof) to wall top offsets array
 * @param heightLine - Height line from roof (should be fully filled, no null regions)
 * @param wallStartX - Absolute X position where wall starts in construction coordinates
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
    const absoluteX = item.position * wallLength

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

/**
 * Step 2: Fill null regions with ceiling offset height jumps
 * Ensures entire line (0 to 1) is covered with height values
 * Converts nullAfter flags to explicit height jumps
 */
export function fillNullRegions(heightLine: HeightLine, ceilingOffset: Length): HeightLine {
  if (heightLine.length === 0) {
    // No coverage at all - return flat line at ceiling offset
    return [
      { position: 0, offset: ceilingOffset, nullAfter: false },
      { position: 1, offset: ceilingOffset, nullAfter: false }
    ]
  }

  let beforeWasNull = false
  const result: HeightLine = []

  // Check if we need to fill before first item
  if (heightLine[0].position > 0) {
    // NULL REGION AT START: Gap from 0 to first item
    // Add ceiling offset at start
    result.push({ position: 0, offset: ceilingOffset, nullAfter: false })
    beforeWasNull = true
  }

  // Process remaining items, looking for null regions
  for (const item of heightLine) {
    const beforeOffset = 'offset' in item ? item.offset : item.offsetBefore
    const afterOffset = 'offset' in item ? item.offset : item.offsetAfter
    const isNullAfter = 'nullAfter' in item && item.nullAfter && item.position < 1

    // Check if previous item has nullAfter flag
    if (beforeWasNull) {
      result.push({
        position: item.position,
        offsetBefore: ceilingOffset,
        offsetAfter: afterOffset
      })
    } else if (isNullAfter) {
      result.push({
        position: item.position,
        offsetBefore: beforeOffset,
        offsetAfter: ceilingOffset
      })
    } else if (beforeOffset !== afterOffset) {
      result.push({
        position: item.position,
        offsetBefore: beforeOffset,
        offsetAfter: afterOffset
      })
    } else {
      result.push({
        position: item.position,
        offset: afterOffset,
        nullAfter: item.position === 1
      })
    }

    beforeWasNull = isNullAfter
  }

  // Check if we need to fill after last item
  if (heightLine[heightLine.length - 1].position < 1) {
    // NULL REGION AT END: Gap from last item to 0
    // Add ceiling offset at end
    result.push({ position: 1, offset: ceilingOffset, nullAfter: true })
  }

  return result
}

export function mergeHeightLines(...lines: HeightLine[]): HeightLine {
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
 * Step 3: Merge inside and outside height lines using minimum offset
 * Both lines should be fully filled (no null regions) before calling this
 */
export function mergeInsideOutsideHeightLines(insideHeightLine: HeightLine, outsideHeightLine: HeightLine): HeightLine {
  if (insideHeightLine.length === 0 && outsideHeightLine.length === 0) {
    return []
  }
  if (insideHeightLine.length === 0) return outsideHeightLine
  if (outsideHeightLine.length === 0) return insideHeightLine

  // Collect all unique positions from both lines
  const positions = new Set<number>()
  for (const item of insideHeightLine) {
    positions.add(item.position)
  }
  for (const item of outsideHeightLine) {
    positions.add(item.position)
  }

  const sortedPositions = Array.from(positions).sort((a, b) => a - b)
  const merged: HeightLine = []
  for (const pos of sortedPositions) {
    const [insideBefore, insideAfter] = getOffsetAt(insideHeightLine, pos)
    const [outsideBefore, outsideAfter] = getOffsetAt(outsideHeightLine, pos)

    const beforeOffset = Math.min(insideBefore, outsideBefore)
    const afterOffset = Math.min(insideAfter, outsideAfter)

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
    if (item.position >= position && after === null) {
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

/**
 * Type guard for HeightJumpItem
 */
function isHeightJumpItem(item: HeightJumpItem | HeightItem): item is HeightJumpItem {
  return 'offsetBefore' in item && 'offsetAfter' in item
}

/**
 * Type guard for HeightItem
 */
function isHeightItem(item: HeightJumpItem | HeightItem): item is HeightItem {
  return 'offset' in item && 'nullAfter' in item
}

/**
 * Merge wall segments with different roof coverage into a single WallConstructionArea
 * For segments without roof coverage, adds flat offsets (0) at boundaries
 */
export function mergeWallSegments(
  segments: WallConstructionArea[],
  fullPosition: Vec3,
  fullSize: Vec3
): WallConstructionArea {
  if (segments.length === 0) {
    return new WallConstructionArea(fullPosition, fullSize)
  }

  if (segments.length === 1) {
    return segments[0]
  }

  // Merge all offsets into a single array
  const mergedOffsets: Vec2[] = []

  for (const segment of segments) {
    if (segment.topOffsets) {
      // Segment with roof coverage - copy offsets
      mergedOffsets.push(...segment.topOffsets.map(o => copyVec2(o)))
    } else {
      // Segment without roof - add flat offsets at segment boundaries
      mergedOffsets.push(newVec2(segment.position[0], 0))
      mergedOffsets.push(newVec2(segment.position[0] + segment.size[0], 0))
    }
  }

  // Remove duplicates and sort by X position
  const uniqueOffsets = removeDuplicateOffsets(mergedOffsets)
  uniqueOffsets.sort((a, b) => a[0] - b[0])

  return new WallConstructionArea(fullPosition, fullSize, uniqueOffsets)
}

/**
 * Remove duplicate offsets (same X position, different or same heights)
 * Keeps both values if they differ (height jump)
 */
function removeDuplicateOffsets(offsets: Vec2[]): Vec2[] {
  const result: Vec2[] = []
  const seen = new Map<number, number[]>() // X position -> heights at that position

  for (const offset of offsets) {
    const x = offset[0]
    const y = offset[1]

    if (!seen.has(x)) {
      seen.set(x, [y])
      result.push(offset)
    } else {
      const heights = seen.get(x)
      if (heights && !heights.includes(y)) {
        // Different height at same position - keep it (height jump)
        heights.push(y)
        result.push(offset)
      }
      // Otherwise skip - exact duplicate
    }
  }

  return result
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
  const segmentOffsets: Vec2[] = []

  // Find positions where jumps occur (same X position, different offsets)
  for (let i = 0; i < area.topOffsets.length - 1; i++) {
    segmentOffsets.push(area.topOffsets[i])
    const current = area.topOffsets[i]
    const next = area.topOffsets[i + 1]
    if (Math.abs(current[0] - next[0]) < POSITION_EPSILON) {
      const end = current[0]
      segments.push(
        new WallConstructionArea(
          newVec3(area.position[0] + start, area.position[1], area.position[2]),
          newVec3(end - start, area.size[1], area.size[2]),
          segmentOffsets.map(o => newVec2(o[0] - start, o[1]))
        )
      )
      start = end
      segmentOffsets.length = 0
    }
  }

  if (segmentOffsets.length > 0) {
    segments.push(
      new WallConstructionArea(
        newVec3(area.position[0] + start, area.position[1], area.position[2]),
        newVec3(area.size[0] - start, area.size[1], area.size[2]),
        segmentOffsets.map(o => newVec2(o[0] - start, o[1]))
      )
    )
  }

  return segments
}
