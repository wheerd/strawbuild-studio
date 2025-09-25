import type { PerimeterWall, Opening } from '@/shared/types/model'
import type { Length, Vec3 } from '@/shared/geometry'
import type { LayersConfig } from '@/shared/types/config'
import { formatLength } from '@/shared/utils/formatLength'

export interface WallSegment3D {
  type: 'wall' | 'opening'
  position: Vec3 // [offsetFromStart, 0, 0]
  size: Vec3 // [width, wallThickness, wallHeight]

  // For opening segments - array supports merged adjacent openings
  openings?: Opening[]
}

function canMergeOpenings(opening1: Opening, opening2: Opening): boolean {
  // Check if openings are adjacent
  const opening1End = opening1.offsetFromStart + opening1.width
  const opening2Start = opening2.offsetFromStart

  if (opening1End !== opening2Start) return false

  // Check if sill heights match
  const sill1 = opening1.sillHeight ?? 0
  const sill2 = opening2.sillHeight ?? 0
  if (sill1 !== sill2) return false

  // Check if header positions match (sill + height)
  const header1 = sill1 + opening1.height
  const header2 = sill2 + opening2.height
  if (header1 !== header2) return false

  return true
}

function mergeAdjacentOpenings(sortedOpenings: Opening[]): Opening[][] {
  if (sortedOpenings.length === 0) return []

  const groups: Opening[][] = []
  let currentGroup = [sortedOpenings[0]]

  for (let i = 1; i < sortedOpenings.length; i++) {
    const prevOpening = currentGroup[currentGroup.length - 1]
    const currentOpening = sortedOpenings[i]

    if (canMergeOpenings(prevOpening, currentOpening)) {
      currentGroup.push(currentOpening)
    } else {
      groups.push(currentGroup)
      currentGroup = [currentOpening]
    }
  }

  groups.push(currentGroup)
  return groups
}

export function segmentWall(
  wall: PerimeterWall,
  wallHeight: Length,
  constructionLength: Length,
  startExtension: Length = 0 as Length,
  layers: LayersConfig
): WallSegment3D[] {
  const y = layers.insideThickness
  const sizeY = wall.thickness - layers.insideThickness - layers.outsideThickness

  if (wall.openings.length === 0) {
    // No openings - just one wall segment for the entire length
    return [
      {
        type: 'wall',
        position: [0, y, 0],
        size: [constructionLength, sizeY, wallHeight]
      }
    ]
  }

  // Sort openings by position along the wall
  const sortedOpenings = [...wall.openings].sort((a, b) => a.offsetFromStart - b.offsetFromStart)

  // Validate openings don't overlap and fit within wall
  let currentPosition = 0 as Length

  for (const opening of sortedOpenings) {
    const openingStart = opening.offsetFromStart
    const openingEnd = (openingStart + opening.width) as Length

    // Validate opening fits within the original wall boundary (before extensions)
    if (openingEnd > wall.wallLength) {
      throw new Error(
        `Opening extends beyond wall length: opening ends at ${formatLength(openingEnd)} but wall ${wall.id} is only ${formatLength(wall.wallLength)} long`
      )
    }

    // Validate opening doesn't overlap with previous position
    if (openingStart < currentPosition) {
      throw new Error(
        `Opening overlaps with previous segment: opening starts at ${formatLength(openingStart)} but previous segment ends at ${formatLength(currentPosition)}`
      )
    }

    currentPosition = openingEnd
  }

  // Group adjacent compatible openings
  const openingGroups = mergeAdjacentOpenings(sortedOpenings)

  // Create segments with Vec3 positioning
  const segments: WallSegment3D[] = []
  currentPosition = 0 as Length

  for (const openingGroup of openingGroups) {
    // Adjust opening positions by start extension to account for corner extension
    const groupStart = (openingGroup[0].offsetFromStart + startExtension) as Length
    const groupEnd = (openingGroup[openingGroup.length - 1].offsetFromStart +
      openingGroup[openingGroup.length - 1].width +
      startExtension) as Length

    // Create wall segment before opening group if there's space
    if (groupStart > currentPosition) {
      const wallSegmentWidth = (groupStart - currentPosition) as Length
      segments.push({
        type: 'wall',
        position: [currentPosition, y, 0],
        size: [wallSegmentWidth, sizeY, wallHeight]
      })
    }

    // Create opening segment for the group
    const groupWidth = (groupEnd - groupStart) as Length
    segments.push({
      type: 'opening',
      position: [groupStart, y, 0],
      size: [groupWidth, sizeY, wallHeight],
      openings: openingGroup
    })

    currentPosition = groupEnd
  }

  // Create final wall segment if there's remaining space
  if (currentPosition < constructionLength) {
    const remainingWidth = (constructionLength - currentPosition) as Length
    segments.push({
      type: 'wall',
      position: [currentPosition, y, 0],
      size: [remainingWidth, sizeY, wallHeight]
    })
  }

  return segments
}
