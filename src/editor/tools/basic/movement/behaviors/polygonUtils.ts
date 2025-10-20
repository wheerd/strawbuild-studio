import { vec2 } from 'gl-matrix'

import type { LineSegment2D } from '@/shared/geometry'

export function createPolygonSegments(points: readonly vec2[]): LineSegment2D[] {
  if (points.length < 2) return []

  const segments: LineSegment2D[] = []
  for (let index = 0; index < points.length; index += 1) {
    const start = points[index]
    const end = points[(index + 1) % points.length]
    segments.push({ start, end })
  }

  return segments
}
