import type { ConstructionElement } from '@/construction/elements'
import { getElementPosition, getElementSize } from '@/construction/elements'
import type { ConstructionSegment } from '@/construction/walls/construction'
import type { Length, Vec2 } from '@/shared/geometry'
import { createVec2 } from '@/shared/geometry'
import { formatLength } from '@/shared/utils/formatLength'

export interface Measurement {
  type: MeasurementType
  startPoint: Vec2 // Construction coordinates [x, z]
  endPoint: Vec2 // Construction coordinates [x, z]
  label: string // e.g., "800mm", "1200mm"
  offset?: number // Distance from wall (negative for below, positive for above)
}

export type MeasurementType =
  | 'post-spacing'
  | 'opening-spacing'
  | 'opening-width'
  | 'sill-height'
  | 'header-height'
  | 'opening-height'
  | 'ring-beam-outer'
  | 'ring-beam-inner'

/**
 * Extract post positions from construction elements and calculate spacings
 */
export function calculatePostSpacingMeasurements(elements: ConstructionElement[]): Measurement[] {
  // Find all posts and sort by x position
  const posts = elements
    .filter(el => el.type === 'post')
    .sort((a, b) => getElementPosition(a)[0] - getElementPosition(b)[0])

  if (posts.length < 2) return []

  const measurements: Measurement[] = []

  // Calculate spacings between adjacent posts (the straw-filled areas)
  for (let i = 0; i < posts.length - 1; i++) {
    const currentPost = posts[i]
    const nextPost = posts[i + 1]

    // Start of spacing is end of current post
    const spacingStart = (getElementPosition(currentPost)[0] + getElementSize(currentPost)[0]) as Length
    // End of spacing is start of next post
    const spacingEnd = getElementPosition(nextPost)[0] as Length
    const spacing = (spacingEnd - spacingStart) as Length

    if (spacing > 0) {
      measurements.push({
        type: 'post-spacing',
        startPoint: createVec2(spacingStart, 0),
        endPoint: createVec2(spacingEnd, 0),
        label: formatLength(spacing),
        offset: 60
      })
    }
  }

  return measurements
}

/**
 * Calculate opening-related measurements
 */
export function calculateOpeningMeasurements(openingSegment: ConstructionSegment, floorHeight: Length): Measurement[] {
  if (openingSegment.type !== 'opening') return []

  const measurements: Measurement[] = []
  const elements = openingSegment.elements

  // Find the single header and sill (at most one of each per segment)
  const header = elements.find((el: ConstructionElement) => el.type === 'header')
  const sill = elements.find((el: ConstructionElement) => el.type === 'sill')

  if (!header) return measurements

  const headerCenterX = (getElementPosition(header)[0] + getElementSize(header)[0] / 2) as Length
  const headerWidth = getElementSize(header)[0]
  const headerBottom = getElementPosition(header)[2] as Length

  // Opening width (horizontal, above wall)
  measurements.push({
    type: 'opening-width',
    startPoint: createVec2(getElementPosition(header)[0], floorHeight),
    endPoint: createVec2(getElementPosition(header)[0] + headerWidth, floorHeight),
    label: formatLength(headerWidth as Length),
    offset: -60
  })

  // Header height (vertical, in opening center)
  measurements.push({
    type: 'header-height',
    startPoint: createVec2(headerCenterX, 0),
    endPoint: createVec2(headerCenterX, headerBottom),
    label: formatLength(headerBottom),
    offset: 40
  })

  // Sill height and opening height (if sill exists)
  if (sill) {
    const sillTop = (getElementPosition(sill)[2] + getElementSize(sill)[2]) as Length

    if (sillTop > 0) {
      // Sill height (vertical, in opening center)
      measurements.push({
        type: 'sill-height',
        startPoint: createVec2(headerCenterX, 0),
        endPoint: createVec2(headerCenterX, sillTop),
        label: formatLength(sillTop),
        offset: -40
      })

      // Opening height (if both sill and header exist)
      const openingHeight = (headerBottom - sillTop) as Length
      if (openingHeight > 0) {
        measurements.push({
          type: 'opening-height',
          startPoint: createVec2(headerCenterX, sillTop),
          endPoint: createVec2(headerCenterX, headerBottom),
          label: formatLength(openingHeight),
          offset: -40
        })
      }
    }
  }

  return measurements
}

/**
 * Calculate spacing between adjacent openings and from wall ends to openings
 */
export function calculateOpeningSpacingMeasurements(
  segments: ConstructionSegment[],
  wallLength: Length,
  floorHeight: Length
): Measurement[] {
  const openingSegments = segments.filter(seg => seg.type === 'opening').sort((a, b) => a.position - b.position)

  if (openingSegments.length === 0) return []

  const measurements: Measurement[] = []

  // Distance from start of wall to first opening
  const firstOpening = openingSegments[0]
  if (firstOpening.position > 0) {
    measurements.push({
      type: 'opening-spacing',
      startPoint: createVec2(0, floorHeight),
      endPoint: createVec2(firstOpening.position, floorHeight),
      label: formatLength(firstOpening.position),
      offset: -60
    })
  }

  // Distance between adjacent openings
  for (let i = 0; i < openingSegments.length - 1; i++) {
    const currentSegment = openingSegments[i]
    const nextSegment = openingSegments[i + 1]

    const currentEnd = (currentSegment.position + currentSegment.width) as Length
    const nextStart = nextSegment.position
    const spacing = (nextStart - currentEnd) as Length

    if (spacing > 0) {
      measurements.push({
        type: 'opening-spacing',
        startPoint: createVec2(currentEnd, floorHeight),
        endPoint: createVec2(nextStart, floorHeight),
        label: formatLength(spacing),
        offset: -60
      })
    }
  }

  // Distance from last opening to end of wall
  const lastOpening = openingSegments[openingSegments.length - 1]
  const lastOpeningEnd = (lastOpening.position + lastOpening.width) as Length
  if (lastOpeningEnd < wallLength) {
    const remainingDistance = (wallLength - lastOpeningEnd) as Length
    measurements.push({
      type: 'opening-spacing',
      startPoint: createVec2(lastOpeningEnd, floorHeight),
      endPoint: createVec2(wallLength, floorHeight),
      label: formatLength(remainingDistance),
      offset: -60
    })
  }

  return measurements
}
