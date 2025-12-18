import { vec3 } from 'gl-matrix'

import { type Projection, WallConstructionArea, projectPoint } from '@/construction/geometry'
import { type ConstructionResult, yieldMeasurement } from '@/construction/results'
import {
  type Length,
  type Line2D,
  type Vec2,
  computeBoundsLines,
  direction,
  distVec2,
  distanceToInfiniteLine,
  newVec2,
  perpendicularCCW,
  projectPointOntoLine,
  projectVec2,
  scaleAddVec2,
  scaleVec2
} from '@/shared/geometry'
import { formatLength } from '@/shared/utils/formatting'

import type { Tag } from './tags'

export type RawMeasurement = AutoMeasurement | DirectMeasurement

export interface AutoMeasurement {
  startPoint: vec3
  endPoint: vec3
  extend1: vec3
  extend2?: vec3
  tags?: Tag[]
}

export interface DirectMeasurement {
  startPoint: vec3
  endPoint: vec3
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

export type AreaMeasurement = 'minHeight' | 'maxHeight' | 'width' | 'thickness'

const DIRECTION_TOLERANCE = 1e-5

export function createMeasurementFromArea(
  area: WallConstructionArea,
  type: AreaMeasurement,
  tags?: Tag[],
  offset?: Length,
  useMin = true
): RawMeasurement | null {
  if (area.isEmpty) return null

  const bounds = area.bounds
  const axis = type === 'width' ? 0 : type === 'thickness' ? 1 : 2
  const base = useMin ? bounds.min : bounds.max
  const maxZ = type === 'minHeight' ? bounds.min[2] + area.minHeight : bounds.max[2]
  const startPoint = vec3.fromValues(
    axis === 0 ? bounds.min[0] : base[0],
    axis === 1 ? bounds.min[1] : base[1],
    axis === 2 ? bounds.min[2] : base[2]
  )
  const endPoint = vec3.fromValues(
    axis === 0 ? bounds.max[0] : base[0],
    axis === 1 ? bounds.max[1] : base[1],
    axis === 2 ? maxZ : base[2]
  )
  const extend1 = vec3.fromValues(
    axis === 1 ? bounds.max[0] : base[0],
    axis === 2 ? bounds.max[1] : base[1],
    axis === 0 ? bounds.max[2] : base[2]
  )
  const extend2 = vec3.fromValues(
    axis === 2 ? bounds.max[0] : base[0],
    axis === 0 ? bounds.max[1] : base[1],
    axis === 1 ? bounds.max[2] : base[2]
  )
  const length = type === 'minHeight' ? area.minHeight : bounds.size[axis]
  return {
    startPoint,
    endPoint,
    extend1,
    extend2,
    label: offset ? formatLength(length) : undefined,
    tags,
    offset
  }
}

export function* yieldMeasurementFromArea(
  area: WallConstructionArea,
  type: 'width' | 'thickness' | 'height',
  tags?: Tag[],
  offset?: Length,
  useMin = true
): Generator<ConstructionResult> {
  if (area.isEmpty) return
  if (type === 'height') {
    if (area.minHeight !== area.size[2]) {
      const minHeight = createMeasurementFromArea(area, 'minHeight', tags, offset, useMin)
      if (minHeight) {
        yield yieldMeasurement(minHeight)
      }
    }
    const maxHeight = createMeasurementFromArea(area, 'maxHeight', tags, offset, useMin)
    if (maxHeight) {
      yield yieldMeasurement(maxHeight)
    }
  } else {
    const measurement = createMeasurementFromArea(area, type, tags, offset, useMin)
    if (measurement) {
      yield yieldMeasurement(measurement)
    }
  }
}

function normalizeDirection(d: Vec2) {
  let result = d
  if (d[0] < 0 || (Math.abs(d[0]) < DIRECTION_TOLERANCE && d[1] < 0)) {
    result = scaleVec2(d, -1)
  }
  // Ensure we don't have negative zero (floating-point artifact)
  if (Object.is(result[0], -0)) result = newVec2(0, result[1])
  if (Object.is(result[1], -0)) result = newVec2(result[0], 0)
  return result
}

function projectMeasurements(measurements: AutoMeasurement[], projection: Projection): ProjectedMeasurement[] {
  return measurements
    .map(m => {
      const startPoint3D = projectPoint(m.startPoint, projection)
      const endPoint3D = projectPoint(m.endPoint, projection)
      const startPointBase = newVec2(startPoint3D[0], startPoint3D[1])
      const endPointBase = newVec2(endPoint3D[0], endPoint3D[1])
      const measurementDirection = direction(startPointBase, endPointBase)
      const normal = perpendicularCCW(measurementDirection)

      // Project the 3D size vector and extract perpendicular component only
      const extend1Projected = projectPoint(m.extend1, projection)
      const extend1Projected2D = newVec2(extend1Projected[0], extend1Projected[1])
      const extend1Range = projectVec2(startPointBase, extend1Projected2D, normal)
      let extendRangeMin = Math.min(extend1Range, 0)
      let extendRangeMax = Math.max(extend1Range, 0)

      if (m.extend2) {
        const extend2Projected = projectPoint(m.extend2, projection)
        const extend2Projected2D = newVec2(extend2Projected[0], extend2Projected[1])
        const extend2Range = projectVec2(startPointBase, extend2Projected2D, normal)
        extendRangeMin = Math.min(extend2Range, extendRangeMin)
        extendRangeMax = Math.max(extend2Range, extendRangeMax)
      }

      // Create rectangle corners using perpendicular offset
      const startPointMin = scaleAddVec2(startPointBase, normal, extendRangeMin)
      const endPointMin = scaleAddVec2(endPointBase, normal, extendRangeMin)
      const startPointMax = scaleAddVec2(startPointBase, normal, extendRangeMax)
      const endPointMax = scaleAddVec2(endPointBase, normal, extendRangeMax)

      const length = distVec2(startPointBase, endPointBase)
      return {
        startPointMin,
        endPointMin,
        startPointMax,
        endPointMax,
        // Default to min points (will be updated in layout phase)
        startPoint: startPointBase,
        endPoint: endPointBase,
        length,
        tags: m.tags
      }
    })
    .filter(m => m.length > 0)
}

function groupMeasurements(measurements: ProjectedMeasurement[]) {
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
      const t1 = projectVec2(left.start, projectedStart, dir)
      const t2 = projectVec2(left.start, projectedEnd, dir)
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
    if (Math.abs(measurement.distanceLeft - measurement.distanceRight) < 1) {
      leftMeasurements.push(measurement)
      rightMeasurements.push(measurement)
    } else if (measurement.distanceLeft < measurement.distanceRight) {
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
