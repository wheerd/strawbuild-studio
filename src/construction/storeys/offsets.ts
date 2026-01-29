import type { HeightLine } from '@/construction/roofs'
import {
  type Length,
  type LineSegment2D,
  type Polygon2D,
  type Vec2,
  intersectLineSegmentWithPolygon,
  lerpVec2,
  projectVec2
} from '@/shared/geometry'

interface SlopedArea {
  polygon: Polygon2D
  base: Vec2
  downSlopeDir: Vec2
  angleRad: number
  baseOffset: Length
}

interface ConstantArea {
  polygon: Polygon2D
  offset: Length
}

type Area = SlopedArea | ConstantArea

const T_EPSILON = 1e-9
const OFFSET_EPSILON = 1e-2

export class VerticalOffsetMap {
  private readonly fallbackOffset: Length

  constructor(fallbackOffset: Length) {
    this.fallbackOffset = fallbackOffset
  }

  addSlopedArea(polygon: Polygon2D, base: Vec2, downSlopeDir: Vec2, angleRad: number, baseOffset: Length) {
    this.slopedAreas.push({ polygon, base, downSlopeDir, angleRad, baseOffset })
  }

  addConstantArea(polygon: Polygon2D, offset: Length) {
    this.constantAreas.push({ polygon, offset })
  }

  getOffsets(line: LineSegment2D): HeightLine {
    const slopedIntersections = this.slopedAreas.map(
      a => intersectLineSegmentWithPolygon(line, a.polygon)?.segments.filter(i => i.tEnd - i.tStart >= T_EPSILON) ?? []
    )
    const constantIntersections = this.constantAreas.map(
      a => intersectLineSegmentWithPolygon(line, a.polygon)?.segments.filter(i => i.tEnd - i.tStart >= T_EPSILON) ?? []
    )
    const intersectionsWithArea = slopedIntersections
      .map((x, i) => ({ area: this.slopedAreas[i] as Area, intersections: x }))
      .concat(constantIntersections.map((x, i) => ({ area: this.constantAreas[i] as Area, intersections: x })))

    const transitionPoints = slopedIntersections
      .concat(constantIntersections)
      .flat()
      .flatMap(i => [i.tStart, i.tEnd])
      .concat([0, 1])
      .sort((a, b) => a - b)

    const uniquePoints = transitionPoints.filter((t, i) => i === 0 || t - transitionPoints[i - 1] >= T_EPSILON)

    const result: HeightLine = []

    for (const t of uniquePoints) {
      if (t <= T_EPSILON) {
        const offsetAt = this.calculateMaxOffsetAt(line, T_EPSILON, intersectionsWithArea)
        const offset = Math.round(offsetAt.offset / OFFSET_EPSILON) * OFFSET_EPSILON
        result.push({ position: 0, offset, nullAfter: false })
      } else if (t >= 1 - T_EPSILON) {
        const offsetAt = this.calculateMaxOffsetAt(line, 1 - T_EPSILON, intersectionsWithArea)
        const offset = Math.round(offsetAt.offset / OFFSET_EPSILON) * OFFSET_EPSILON
        result.push({ position: 1, offset, nullAfter: true })
      } else {
        const before = this.calculateMaxOffsetAt(line, t - T_EPSILON, intersectionsWithArea)
        const after = this.calculateMaxOffsetAt(line, t + T_EPSILON, intersectionsWithArea)

        const beforeAreasStr = Array.from(before.activeIndices).sort().join(',')
        const afterAreasStr = Array.from(after.activeIndices).sort().join(',')

        if (beforeAreasStr !== afterAreasStr) {
          if (Math.abs(before.offset - after.offset) < OFFSET_EPSILON) {
            const offset = Math.round(before.offset / OFFSET_EPSILON) * OFFSET_EPSILON
            result.push({ position: t, offset, nullAfter: false })
          } else {
            const offsetBefore = Math.round(before.offset / OFFSET_EPSILON) * OFFSET_EPSILON
            const offsetAfter = Math.round(after.offset / OFFSET_EPSILON) * OFFSET_EPSILON
            result.push({ position: t, offsetBefore, offsetAfter })
          }
        }
      }
    }

    return result
  }

  private calculateMaxOffsetAt(
    line: LineSegment2D,
    t: number,
    intersectionsWithArea: { area: Area; intersections: { tStart: number; tEnd: number }[] }[]
  ): { offset: Length; activeIndices: Set<number> } {
    const point = lerpVec2(line.start, line.end, t)

    let maxOffset: Length | null = null
    const activeIndices = new Set<number>()

    for (let i = 0; i < intersectionsWithArea.length; i++) {
      const { area, intersections } = intersectionsWithArea[i]
      if (intersections.some(s => s.tStart <= t && s.tEnd >= t)) {
        let offset
        if ('offset' in area) {
          offset = area.offset
        } else {
          const signedDist = projectVec2(area.base, point, area.downSlopeDir)
          offset = area.baseOffset + signedDist * -Math.tan(area.angleRad)
        }

        if (maxOffset == null || offset > maxOffset + 1e-9) {
          maxOffset = offset
          activeIndices.clear()
          activeIndices.add(i)
        } else if (Math.abs(offset - maxOffset) < 1e-9) {
          maxOffset = offset
          activeIndices.add(i)
        }
      }
    }

    return { offset: maxOffset ?? this.fallbackOffset, activeIndices }
  }

  private readonly slopedAreas: SlopedArea[] = []
  private readonly constantAreas: ConstantArea[] = []
}
