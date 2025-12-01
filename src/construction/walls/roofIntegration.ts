import { type ReadonlyVec2, vec2, vec3 } from 'gl-matrix'

import { WallConstructionArea } from '@/construction/geometry'
import type { HeightItem, HeightJumpItem, HeightLine } from '@/construction/roofs/types'
import type { Length } from '@/shared/geometry'

// Use smaller epsilon for position comparisons
const POSITION_EPSILON = 0.0001

/**
 * Result of converting height line to wall offsets
 */
export type WallTopOffsets = readonly ReadonlyVec2[] | undefined
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

  const offsets: vec2[] = []

  // Convert each height line item to offset
  for (const item of heightLine) {
    const absoluteX = item.position * wallLength

    if (isHeightJumpItem(item)) {
      // HeightJumpItem - add both offsets at same position
      offsets.push(vec2.fromValues(absoluteX, item.offsetBefore))
      offsets.push(vec2.fromValues(absoluteX, item.offsetAfter))
    } else {
      // HeightItem
      offsets.push(vec2.fromValues(absoluteX, item.offset))
    }
  }

  return offsets.length > 0 ? offsets : undefined
}

/**
 * Step 1: Merge height lines from multiple roofs
 * Combines entries and sorts by position
 */
export function mergeRoofHeightLines(heightLines: HeightLine[]): HeightLine {
  if (heightLines.length === 0) return []
  if (heightLines.length === 1) return heightLines[0]

  // Combine all items and sort by position
  const allItems = heightLines.flat()
  allItems.sort((a, b) => a.position - b.position)

  return allItems
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

  const result: HeightLine = []

  // Check if we need to fill before first item
  const firstItem = heightLine[0]
  if (firstItem.position > POSITION_EPSILON) {
    // NULL REGION AT START: Gap from 0 to first item
    // Add ceiling offset at start
    result.push({ position: 0, offset: ceilingOffset, nullAfter: false })

    // Add jump FROM ceiling TO first item's offset at first item position
    const firstOffset = isHeightItem(firstItem) ? firstItem.offset : firstItem.offsetBefore
    result.push({
      position: firstItem.position,
      offsetBefore: ceilingOffset,
      offsetAfter: firstOffset
    } as HeightJumpItem)
  } else {
    // First item is at/near start - add it
    if (isHeightItem(firstItem)) {
      result.push({ position: firstItem.position, offset: firstItem.offset, nullAfter: false })
    } else {
      result.push(firstItem)
    }
  }

  // Process remaining items, looking for null regions
  for (let i = 1; i < heightLine.length; i++) {
    const prevItem = heightLine[i - 1]
    const currentItem = heightLine[i]

    // Check if previous item has nullAfter flag
    if (isHeightItem(prevItem) && prevItem.nullAfter) {
      // NULL REGION: from prevItem.position to currentItem.position

      // Jump FROM previous offset TO ceiling at previous position
      result.push({
        position: prevItem.position,
        offsetBefore: prevItem.offset,
        offsetAfter: ceilingOffset
      } as HeightJumpItem)

      // Jump FROM ceiling TO current offset at current position
      const currentOffset = isHeightItem(currentItem) ? currentItem.offset : currentItem.offsetBefore
      result.push({
        position: currentItem.position,
        offsetBefore: ceilingOffset,
        offsetAfter: currentOffset
      } as HeightJumpItem)
    } else {
      // No null region - add current item
      result.push(currentItem)
    }
  }

  // Check if we need to fill after last item
  const lastItem = heightLine[heightLine.length - 1]
  if (lastItem.position < 1 - POSITION_EPSILON) {
    const lastOffset = isHeightItem(lastItem) ? lastItem.offset : lastItem.offsetAfter

    // Check if last item has nullAfter
    if (isHeightItem(lastItem) && lastItem.nullAfter) {
      // NULL REGION AT END: Already created jump to ceiling above
      // Just need point at position 1
      result.push({ position: 1, offset: ceilingOffset, nullAfter: false })
    } else {
      // NO NULL: Last item doesn't reach end - extend with jump to ceiling
      result.push({
        position: lastItem.position,
        offsetBefore: lastOffset,
        offsetAfter: ceilingOffset
      } as HeightJumpItem)
      result.push({ position: 1, offset: ceilingOffset, nullAfter: false })
    }
  }

  return result
}

/**
 * Step 3: Merge inside and outside height lines using minimum offset
 * Both lines should be fully filled (no null regions) before calling this
 * Filters out redundant consecutive points
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

  // Sort positions
  const sortedPositions = Array.from(positions).sort((a, b) => a - b)

  const rawResult: HeightLine = []

  for (const pos of sortedPositions) {
    const insideItem = findItemAtPosition(insideHeightLine, pos)
    const outsideItem = findItemAtPosition(outsideHeightLine, pos)

    if (!insideItem || !outsideItem) continue

    // Check if either is a height jump
    const insideIsJump = isHeightJumpItem(insideItem)
    const outsideIsJump = isHeightJumpItem(outsideItem)

    if (insideIsJump || outsideIsJump) {
      // At least one is a jump - create jump with minimum offsets
      const insideOffsetBefore = insideIsJump
        ? insideItem.offsetBefore
        : getOffsetAt(insideHeightLine, pos - POSITION_EPSILON)
      const insideOffsetAfter = insideIsJump
        ? insideItem.offsetAfter
        : getOffsetAt(insideHeightLine, pos + POSITION_EPSILON)

      const outsideOffsetBefore = outsideIsJump
        ? outsideItem.offsetBefore
        : getOffsetAt(outsideHeightLine, pos - POSITION_EPSILON)
      const outsideOffsetAfter = outsideIsJump
        ? outsideItem.offsetAfter
        : getOffsetAt(outsideHeightLine, pos + POSITION_EPSILON)

      const minOffsetBefore = Math.min(insideOffsetBefore, outsideOffsetBefore)
      const minOffsetAfter = Math.min(insideOffsetAfter, outsideOffsetAfter)

      // Only create jump if offsets differ
      if (Math.abs(minOffsetBefore - minOffsetAfter) > POSITION_EPSILON) {
        rawResult.push({
          position: pos,
          offsetBefore: minOffsetBefore,
          offsetAfter: minOffsetAfter
        } as HeightJumpItem)
      } else {
        // Offsets are same - use regular item
        rawResult.push({
          position: pos,
          offset: minOffsetAfter,
          nullAfter: false
        })
      }
    } else {
      // Both are regular items - use minimum offset
      const insideOffset = (insideItem as HeightItem).offset
      const outsideOffset = (outsideItem as HeightItem).offset
      const minOffset = Math.min(insideOffset, outsideOffset)

      rawResult.push({
        position: pos,
        offset: minOffset,
        nullAfter: false
      })
    }
  }

  // Filter out redundant points
  return filterRedundantPoints(rawResult)
}

/**
 * Filter out redundant consecutive points:
 * - Consecutive HeightItems with same offset
 * - HeightJumpItems where offsetBefore == offsetAfter (no-op jumps)
 * - Keep first and last points always
 */
function filterRedundantPoints(heightLine: HeightLine): HeightLine {
  if (heightLine.length <= 2) return heightLine

  const result: HeightLine = []

  for (let i = 0; i < heightLine.length; i++) {
    const item = heightLine[i]
    const isFirst = i === 0
    const isLast = i === heightLine.length - 1

    // Always keep first and last
    if (isFirst || isLast) {
      result.push(item)
      continue
    }

    // Check if jump is no-op
    if (isHeightJumpItem(item)) {
      if (Math.abs(item.offsetBefore - item.offsetAfter) < POSITION_EPSILON) {
        // No-op jump - skip it
        continue
      }
      result.push(item)
      continue
    }

    // Check if consecutive HeightItems have same offset
    const prevItem = result[result.length - 1]
    if (isHeightItem(item) && isHeightItem(prevItem)) {
      if (Math.abs(item.offset - prevItem.offset) < POSITION_EPSILON) {
        // Same offset as previous - skip this one
        continue
      }
    }

    result.push(item)
  }

  return result
}

/**
 * Find item at exact position
 */
function findItemAtPosition(heightLine: HeightLine, position: number): HeightItem | HeightJumpItem | null {
  for (const item of heightLine) {
    if (Math.abs(item.position - position) < POSITION_EPSILON) {
      return item
    }
  }
  return null
}

/**
 * Get offset at position by interpolation
 */
function getOffsetAt(heightLine: HeightLine, position: number): Length {
  // Clamp position
  position = Math.max(0, Math.min(1, position))

  // Find surrounding items
  let before: HeightItem | HeightJumpItem | null = null
  let after: HeightItem | HeightJumpItem | null = null

  for (let i = 0; i < heightLine.length; i++) {
    const item = heightLine[i]
    if (item.position <= position) {
      before = item
    }
    if (item.position >= position && after === null) {
      after = item
      break
    }
  }

  if (!before && !after) return 0
  if (!before) {
    return isHeightItem(after!) ? after!.offset : after!.offsetBefore
  }
  if (!after) {
    return isHeightItem(before) ? before.offset : before.offsetAfter
  }

  // Exact match
  if (Math.abs(before.position - position) < POSITION_EPSILON) {
    return isHeightItem(before) ? before.offset : before.offsetAfter
  }
  if (Math.abs(after.position - position) < POSITION_EPSILON) {
    return isHeightItem(after) ? after.offset : after.offsetBefore
  }

  // Interpolate
  const beforeOffset = isHeightItem(before) ? before.offset : before.offsetAfter
  const afterOffset = isHeightItem(after) ? after.offset : after.offsetBefore

  const ratio = (position - before.position) / (after.position - before.position)
  return beforeOffset + ratio * (afterOffset - beforeOffset)
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
  fullPosition: vec3,
  fullSize: vec3
): WallConstructionArea {
  if (segments.length === 0) {
    return new WallConstructionArea(fullPosition, fullSize)
  }

  if (segments.length === 1) {
    return segments[0]
  }

  // Merge all offsets into a single array
  const mergedOffsets: vec2[] = []

  for (const segment of segments) {
    if (segment.topOffsets) {
      // Segment with roof coverage - copy offsets
      mergedOffsets.push(...segment.topOffsets.map(o => vec2.clone(o)))
    } else {
      // Segment without roof - add flat offsets at segment boundaries
      mergedOffsets.push(vec2.fromValues(segment.position[0], 0))
      mergedOffsets.push(vec2.fromValues(segment.position[0] + segment.size[0], 0))
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
function removeDuplicateOffsets(offsets: vec2[]): vec2[] {
  const result: vec2[] = []
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
  const segmentOffsets: vec2[] = []

  // Find positions where jumps occur (same X position, different offsets)
  for (let i = 0; i < area.topOffsets.length - 1; i++) {
    segmentOffsets.push(area.topOffsets[i])
    const current = area.topOffsets[i]
    const next = area.topOffsets[i + 1]
    if (Math.abs(current[0] - next[0]) < POSITION_EPSILON) {
      const end = current[0]
      segments.push(
        new WallConstructionArea(
          vec3.fromValues(area.position[0] + start, area.position[1], area.position[2]),
          vec3.fromValues(end - start, area.size[1], area.size[2]),
          segmentOffsets.map(o => vec2.fromValues(o[0] - start, o[1]))
        )
      )
      start = end
      segmentOffsets.length = 0
    }
  }

  if (segmentOffsets.length > 0) {
    segments.push(
      new WallConstructionArea(
        vec3.fromValues(area.position[0] + start, area.position[1], area.position[2]),
        vec3.fromValues(area.size[0] - start, area.size[1], area.size[2]),
        segmentOffsets.map(o => vec2.fromValues(o[0] - start, o[1]))
      )
    )
  }

  return segments
}
