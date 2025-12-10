import type { OpeningAssemblyId } from '@/building/model'
import type { Opening } from '@/building/model/model'
import { resolveOpeningConfig } from '@/construction/openings/resolver'
import type { Length } from '@/shared/geometry'

const toNumber = (value: Length | undefined): number => Number(value ?? 0)

const clampLength = (value: number): Length => (value > 0 ? value : 0) as Length

// Center ↔ Edge conversions (padding-independent!)
export const centerToLeftEdge = (center: Length, width: Length): Length =>
  clampLength(toNumber(center) - toNumber(width) / 2)

export const leftEdgeToCenter = (leftEdge: Length, width: Length): Length =>
  clampLength(toNumber(leftEdge) + toNumber(width) / 2)

// Width/Height conversions (padding-dependent)
export const finishedWidthToConstruction = (width: Length, padding: Length): Length =>
  clampLength(toNumber(width) + 2 * toNumber(padding))

export const constructionWidthToFinished = (width: Length, padding: Length): Length =>
  clampLength(toNumber(width) - 2 * toNumber(padding))

export const finishedHeightToConstruction = (height: Length, padding: Length): Length =>
  clampLength(toNumber(height) + 2 * toNumber(padding))

export const constructionHeightToFinished = (height: Length, padding: Length): Length =>
  clampLength(toNumber(height) - 2 * toNumber(padding))

// Center-based conversions for construction dimensions
// Center position stays the same, but we need left edge for construction
export const finishedCenterToConstructionLeftEdge = (center: Length, width: Length, padding: Length): Length => {
  const constructionWidth = toNumber(width) + 2 * toNumber(padding)
  return clampLength(toNumber(center) - constructionWidth / 2)
}

export const constructionLeftEdgeToFinishedCenter = (leftEdge: Length, width: Length, padding: Length): Length => {
  const constructionWidth = toNumber(width) + 2 * toNumber(padding)
  return clampLength(toNumber(leftEdge) + constructionWidth / 2)
}

// Legacy functions (kept for backward compatibility during migration)
export const finishedOffsetToConstruction = (offset: Length, padding: Length): Length =>
  clampLength(toNumber(offset) - toNumber(padding))

export const constructionOffsetToFinished = (offset: Length, padding: Length): Length =>
  clampLength(toNumber(offset) + toNumber(padding))

export const finishedSillToConstruction = (sillHeight: Length | undefined, padding: Length): Length | undefined => {
  if (sillHeight == null) return undefined
  return clampLength(toNumber(sillHeight) - toNumber(padding))
}

export const constructionSillToFinished = (sillHeight: Length | undefined, padding: Length): Length | undefined => {
  if (sillHeight == null) return undefined
  return clampLength(toNumber(sillHeight) + toNumber(padding))
}

// Construction dimensions include a computed centerOffsetFromWallStart (left edge)
export type OpeningConstructionDimensions = Opening & {
  offsetFromStart: Length // Computed left edge for construction system
}

export function convertOpeningToConstruction(
  opening: Opening,
  wallOpeningAssemblyId?: OpeningAssemblyId
): OpeningConstructionDimensions {
  const config = resolveOpeningConfig(opening, { openingAssemblyId: wallOpeningAssemblyId })

  // Convert from center-based finished to left-edge-based construction
  const constructionWidth = finishedWidthToConstruction(opening.width, config.padding)
  const constructionLeftEdge = finishedCenterToConstructionLeftEdge(
    opening.centerOffsetFromWallStart,
    opening.width,
    config.padding
  )

  return {
    ...opening,
    offsetFromStart: constructionLeftEdge, // Computed left edge for construction
    width: constructionWidth,
    height: finishedHeightToConstruction(opening.height, config.padding),
    sillHeight: finishedSillToConstruction(opening.sillHeight, config.padding)
  }
}

export function convertOpeningToFinished(openingConstruction: OpeningConstructionDimensions, padding: Length): Opening {
  // Convert from construction left edge back to center
  const finishedCenter = constructionLeftEdgeToFinishedCenter(
    openingConstruction.offsetFromStart,
    openingConstruction.width,
    padding
  )

  return {
    ...openingConstruction,
    centerOffsetFromWallStart: finishedCenter,
    width: constructionWidthToFinished(openingConstruction.width, padding),
    height: constructionHeightToFinished(openingConstruction.height, padding),
    sillHeight: constructionSillToFinished(openingConstruction.sillHeight, padding)
  }
}
