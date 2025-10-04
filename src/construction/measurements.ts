import { vec2, vec3 } from 'gl-matrix'

import { type Projection } from '@/construction/geometry'
import {
  type Length,
  type Line2D,
  type Vec2,
  type Vec3,
  computeBoundsLines,
  direction,
  distance,
  distanceToInfiniteLine,
  perpendicularCCW,
  projectPointOntoLine,
  scale,
  subtract
} from '@/shared/geometry'

import type { Tag } from './tags'

export type RawMeasurement = AutoMeasurement | DirectMeasurement

export interface AutoMeasurement {
  startPoint: Vec3
  endPoint: Vec3
  size: Vec3
  tags?: Tag[]
}

export interface DirectMeasurement {
  startPoint: Vec3
  endPoint: Vec3
  label: string
  offset: number
  tags?: Tag[]
}

export interface ProjectedMeasurement {
  // Rectangle corners (measurement area in 2D)
  startPointMin: Vec2 // Original measurement line start
  endPointMin: Vec2 // Original measurement line end
  startPointMax: Vec2 // Extended rectangle start
  endPointMax: Vec2 // Extended rectangle end
  perpendicularRange: number
  length: Length
  tags?: Tag[]
}

export interface IntervalMeasurement extends ProjectedMeasurement {
  t1: number
  t2: number
  distanceLeft: number
  distanceRight: number
}

export interface LineMeasurement {
  startPoint: Vec2
  endPoint: Vec2
  startOnLine: Vec2
  endOnLine: Vec2
  length: Length
  tags?: Tag[]
}

export interface MeasurementGroup {
  direction: Vec2
  startLeft: Vec2
  startRight: Vec2
  measurements: IntervalMeasurement[]
}

export interface MeasurementLines {
  direction: Vec2
  start: Vec2
  lines: LineMeasurement[][]
}

function normalizeDirection(d: Vec2) {
  if (d[0] < 0 || (d[0] === 0 && d[1] < 0)) {
    return scale(d, -1)
  }
  return d
}

function projectMeasurements(measurements: AutoMeasurement[], projection: Projection): ProjectedMeasurement[] {
  return measurements
    .map(m => {
      const startPointMin = projection(m.startPoint)
      const endPointMin = projection(m.endPoint)
      const measurementDirection = direction(startPointMin, endPointMin)
      const normal = perpendicularCCW(measurementDirection)

      // Project the 3D size vector and extract perpendicular component only
      const sizeEnd3D = vec3.create()
      vec3.add(sizeEnd3D, m.startPoint, m.size)
      const sizeEnd2D = projection(sizeEnd3D)
      const size2D = subtract(sizeEnd2D, startPointMin)
      const perpendicularRange = vec2.dot(size2D, normal)

      // Create rectangle corners using perpendicular offset
      const startPointMax = vec2.scaleAndAdd(vec2.create(), startPointMin, normal, perpendicularRange)
      const endPointMax = vec2.scaleAndAdd(vec2.create(), endPointMin, normal, perpendicularRange)

      const length = distance(startPointMin, endPointMin)
      return {
        startPointMin,
        endPointMin,
        startPointMax,
        endPointMax,
        // Default to min points (will be updated in layout phase)
        startPoint: startPointMin,
        endPoint: endPointMin,
        length,
        perpendicularRange,
        tags: m.tags
      }
    })
    .filter(m => m.length > 0)
}

function groupMeasurements(measurements: ProjectedMeasurement[]) {
  const DIRECTION_TOLERANCE = 1e-5
  const groupedMeasurements = new Map<Vec2, ProjectedMeasurement[]>()

  for (const measurement of measurements) {
    const dir = normalizeDirection(direction(measurement.startPointMin, measurement.endPointMin))
    let existingGroup: ProjectedMeasurement[] | null = null

    for (const [groupDir, group] of groupedMeasurements.entries()) {
      // Use tolerance-based comparison instead of exact equality
      if (
        Math.abs(groupDir[0] - dir[0]) < DIRECTION_TOLERANCE &&
        Math.abs(groupDir[1] - dir[1]) < DIRECTION_TOLERANCE
      ) {
        existingGroup = group
        break
      }
    }

    if (!existingGroup) {
      existingGroup = []
      groupedMeasurements.set(dir, existingGroup)
    }
    existingGroup.push(measurement)
  }
  return groupedMeasurements
}

function calculateMinDistance(measurement: ProjectedMeasurement, line: Line2D): number {
  // Only check start points - end points have same distances due to alignment
  const minDistance = distanceToInfiniteLine(measurement.startPointMin, line)
  const maxDistance = distanceToInfiniteLine(measurement.startPointMax, line)

  return Math.min(minDistance, maxDistance)
}

function processMeasurementGroup(
  dir: Vec2,
  measurements: ProjectedMeasurement[],
  planPoints: Vec2[]
): MeasurementGroup {
  const { left, right } = computeBoundsLines(dir, planPoints)
  const leftLine: Line2D = { point: left.start, direction: dir }
  const rightLine: Line2D = { point: right.start, direction: dir }
  return {
    direction: dir,
    startLeft: left.start,
    startRight: right.start,
    measurements: measurements.map(m => {
      const distanceLeft = calculateMinDistance(m, leftLine)
      const distanceRight = calculateMinDistance(m, rightLine)

      // Use min points for t1/t2 calculation (will be updated in layout)
      const projectedStart = projectPointOntoLine(m.startPointMin, leftLine)
      const projectedEnd = projectPointOntoLine(m.endPointMin, leftLine)
      const t1 = distance(projectedStart, left.start)
      const t2 = distance(projectedEnd, left.start)

      return {
        ...m,
        startPointMin: t1 < t2 ? m.startPointMin : m.endPointMin,
        endPointMin: t1 < t2 ? m.endPointMin : m.startPointMin,
        startPointMax: t1 < t2 ? m.startPointMax : m.endPointMax,
        endPointMax: t1 < t2 ? m.endPointMax : m.startPointMax,
        distanceLeft,
        distanceRight,
        t1: Math.min(t1, t2),
        t2: Math.max(t1, t2)
      }
    })
  }
}

function assignSides(group: MeasurementGroup): {
  leftMeasurements: IntervalMeasurement[]
  rightMeasurements: IntervalMeasurement[]
} {
  const leftMeasurements: IntervalMeasurement[] = []
  const rightMeasurements: IntervalMeasurement[] = []

  for (const measurement of group.measurements) {
    if (measurement.distanceLeft <= measurement.distanceRight) {
      leftMeasurements.push(measurement)
    } else {
      rightMeasurements.push(measurement)
    }
  }

  return { leftMeasurements, rightMeasurements }
}

function deduplicateMeasurements(measurements: IntervalMeasurement[]): IntervalMeasurement[] {
  const unique = new Map<string, IntervalMeasurement>()

  for (const measurement of measurements) {
    const sortedTags = measurement.tags ? [...measurement.tags].sort() : []
    const key = `${measurement.t1}_${measurement.t2}_${JSON.stringify(sortedTags)}`
    if (!unique.has(key)) {
      unique.set(key, measurement)
    }
  }

  return Array.from(unique.values())
}

function assignRows(measurements: IntervalMeasurement[]): IntervalMeasurement[][] {
  if (measurements.length === 0) return []

  // Sort by distance (further = closer to inside), then by interval size (larger = more outside)
  const sorted = measurements.sort((a, b) => {
    const distA = Math.min(a.distanceLeft, a.distanceRight)
    const distB = Math.min(b.distanceLeft, b.distanceRight)
    if (Math.abs(distA - distB) < 1e-5) {
      // Same distance: larger intervals go outside (later in array)
      return a.t2 - a.t1 - (b.t2 - b.t1)
    }
    return distB - distA // Further measurements first
  })

  const rows: IntervalMeasurement[][] = []

  // Simple row assignment: avoid overlaps within same row
  for (const measurement of sorted) {
    let assigned = false

    // Try to place in existing row without overlap
    for (const row of rows) {
      const hasOverlap = row.some(existing => !(measurement.t2 <= existing.t1 || measurement.t1 >= existing.t2))

      if (!hasOverlap) {
        row.push(measurement)
        assigned = true
        break
      }
    }

    // Create new row if no suitable row found
    if (!assigned) {
      rows.push([measurement])
    }
  }

  return rows
}

function selectClosestPoints(
  measurement: ProjectedMeasurement,
  line: Line2D
): {
  startPoint: Vec2
  endPoint: Vec2
  baseOffset: number
} {
  const minDistance = distanceToInfiniteLine(measurement.startPointMin, line)
  const maxDistance = distanceToInfiniteLine(measurement.startPointMax, line)

  if (minDistance <= maxDistance) {
    return {
      startPoint: measurement.startPointMin,
      endPoint: measurement.endPointMin,
      baseOffset: minDistance
    }
  } else {
    return {
      startPoint: measurement.startPointMax,
      endPoint: measurement.endPointMax,
      baseOffset: maxDistance
    }
  }
}

function convertToLineMeasurements(
  measurements: IntervalMeasurement[],
  lineStart: Vec2,
  direction: Vec2,
  swapDir: boolean
): LineMeasurement[] {
  const line: Line2D = { point: lineStart, direction }

  return measurements.map(m => {
    const { startPoint, endPoint } = selectClosestPoints(m, line)

    // Recalculate t1/t2 based on closest points
    const startOnLine = projectPointOntoLine(startPoint, line)
    const endOnLine = projectPointOntoLine(endPoint, line)

    return {
      startPoint: swapDir ? endPoint : startPoint,
      endPoint: swapDir ? startPoint : endPoint,
      perpendicularRange: m.perpendicularRange,
      length: m.length,
      tags: m.tags,
      startOnLine: swapDir ? endOnLine : startOnLine,
      endOnLine: swapDir ? startOnLine : endOnLine
    }
  })
}

function layout(group: MeasurementGroup): { left: MeasurementLines; right: MeasurementLines } {
  const { leftMeasurements, rightMeasurements } = assignSides(group)

  const leftDeduped = deduplicateMeasurements(leftMeasurements)
  const rightDeduped = deduplicateMeasurements(rightMeasurements)

  const leftRows = assignRows(leftDeduped)
  const rightRows = assignRows(rightDeduped)

  return {
    left: {
      direction: group.direction,
      start: group.startLeft,
      lines: leftRows.map(row => convertToLineMeasurements(row, group.startLeft, group.direction, false))
    },
    right: {
      direction: group.direction,
      start: group.startRight,
      lines: rightRows.map(row => convertToLineMeasurements(row, group.startRight, group.direction, true))
    }
  }
}

export function* processMeasurements(
  measurements: AutoMeasurement[],
  projection: Projection,
  planPoints: Vec2[]
): Generator<MeasurementLines> {
  const projected = projectMeasurements(measurements, projection)
  const grouped = groupMeasurements(projected)
  for (const [direction, groupMeasurements] of grouped) {
    const group = processMeasurementGroup(direction, groupMeasurements, planPoints)
    const layoutResult = layout(group)
    yield layoutResult.left
    yield layoutResult.right
  }
}
