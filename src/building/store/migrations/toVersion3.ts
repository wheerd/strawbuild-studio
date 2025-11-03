import { vec2 } from 'gl-matrix'

import { ensurePolygonIsClockwise } from '@/shared/geometry/polygon'

import type { Migration } from './shared'
import { isRecord, toVec2 } from './shared'

export const migrateToVersion3: Migration = state => {
  if (!isRecord(state)) return

  const perimeters = state.perimeters
  if (!isRecord(perimeters)) return

  for (const perimeter of Object.values(perimeters)) {
    if (!isRecord(perimeter)) continue

    if (Array.isArray(perimeter.referencePolygon) && perimeter.referencePolygon.length > 0) {
      perimeter.referencePolygon = perimeter.referencePolygon
        .map(point => toVec2(point))
        .filter((point): point is vec2 => point !== null)
      continue
    }

    const referenceSide = perimeter.referenceSide === 'outside' ? 'outside' : 'inside'
    const corners = Array.isArray(perimeter.corners) ? perimeter.corners : []

    const candidatePoints: vec2[] = []

    for (const corner of corners) {
      if (!isRecord(corner)) {
        candidatePoints.length = 0
        break
      }

      const point = toVec2(
        referenceSide === 'outside' ? (corner as Record<string, unknown>).outsidePoint : corner.insidePoint
      )
      if (!point) {
        candidatePoints.length = 0
        break
      }
      candidatePoints.push(point)
    }

    if (candidatePoints.length < 3) {
      perimeter.referencePolygon = []
      continue
    }

    const canonical = ensurePolygonIsClockwise({ points: candidatePoints })
    perimeter.referenceSide = referenceSide
    perimeter.referencePolygon = canonical.points.map(point => vec2.clone(point))
  }
}
