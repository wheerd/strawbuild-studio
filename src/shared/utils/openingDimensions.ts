import type { Opening } from '@/building/model/model'
import type { Length } from '@/shared/geometry'

const toNumber = (value: Length | undefined): number => Number(value ?? 0)

const clampLength = (value: number): Length => (value > 0 ? value : 0) as Length

export const finishedWidthToConstruction = (width: Length, padding: Length): Length =>
  clampLength(toNumber(width) + 2 * toNumber(padding))

export const constructionWidthToFinished = (width: Length, padding: Length): Length =>
  clampLength(toNumber(width) - 2 * toNumber(padding))

export const finishedHeightToConstruction = (height: Length, padding: Length): Length =>
  clampLength(toNumber(height) + 2 * toNumber(padding))

export const constructionHeightToFinished = (height: Length, padding: Length): Length =>
  clampLength(toNumber(height) - 2 * toNumber(padding))

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

export type OpeningConstructionDimensions = Opening

export function convertOpeningToConstruction(opening: Opening, padding: Length): OpeningConstructionDimensions {
  return {
    ...opening,
    offsetFromStart: finishedOffsetToConstruction(opening.offsetFromStart, padding),
    width: finishedWidthToConstruction(opening.width, padding),
    height: finishedHeightToConstruction(opening.height, padding),
    sillHeight: finishedSillToConstruction(opening.sillHeight, padding)
  }
}

export function convertOpeningToFinished(opening: Opening, padding: Length): Opening {
  return {
    ...opening,
    offsetFromStart: constructionOffsetToFinished(opening.offsetFromStart, padding),
    width: constructionWidthToFinished(opening.width, padding),
    height: constructionHeightToFinished(opening.height, padding),
    sillHeight: constructionSillToFinished(opening.sillHeight, padding)
  }
}
