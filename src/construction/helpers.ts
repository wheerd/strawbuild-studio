import { vec2 } from 'gl-matrix'

import {
  type Area,
  type Length,
  type Line2D,
  type LineSegment2D,
  type Polygon2D,
  type PolygonWithHoles2D,
  calculatePolygonArea,
  direction,
  ensurePolygonIsClockwise,
  intersectPolygon,
  lineIntersection,
  offsetPolygon,
  perpendicular,
  perpendicularCW,
  simplifyPolygon
} from '@/shared/geometry'

import { createConstructionElement } from './elements'
import type { MaterialId } from './materials/material'
import { polygonPartInfo } from './parts'
import { type ConstructionResult, yieldElement, yieldWarning } from './results'
import { createExtrudedPolygon } from './shapes'
import type { Tag } from './tags'

export function polygonFromLineIntersections(lines: Line2D[]): Polygon2D {
  const points: vec2[] = []
  for (let i = 0; i < lines.length; i++) {
    const prev = lines[(i - 1 + lines.length) % lines.length]
    const current = lines[i]
    const intersection = lineIntersection(prev, current)
    if (intersection) {
      points.push(intersection)
    }
  }
  return { points }
}

export function infiniteBeamPolygon(
  line: Line2D,
  clipStart: Line2D,
  clipEnd: Line2D,
  thicknessLeft: Length,
  thicknessRight: Length
): Polygon2D | null {
  const leftDir = perpendicularCW(line.direction)
  const lineLeft: Line2D = {
    point: vec2.scaleAndAdd(vec2.create(), line.point, leftDir, thicknessLeft),
    direction: line.direction
  }
  const lineRight: Line2D = {
    point: vec2.scaleAndAdd(vec2.create(), line.point, leftDir, -thicknessRight),
    direction: line.direction
  }
  const p1 = lineIntersection(lineLeft, clipStart)
  const p2 = lineIntersection(lineRight, clipStart)
  const p3 = lineIntersection(lineRight, clipEnd)
  const p4 = lineIntersection(lineLeft, clipEnd)

  if (!p1 || !p2 || !p3 || !p4) return null

  const beamPolygon: Polygon2D = { points: [p1, p2, p3, p4] }
  return ensurePolygonIsClockwise(beamPolygon)
}

export function* infiniteBeam(
  line: Line2D,
  clipPolygon: PolygonWithHoles2D,
  thicknessLeft: Length,
  thicknessRight: Length,
  height: Length,
  material: MaterialId,
  partType?: string,
  tags?: Tag[]
): Generator<ConstructionResult> {
  const leftDir = perpendicularCW(line.direction)
  const lineStart = vec2.scaleAndAdd(vec2.create(), line.point, line.direction, 1e6)
  const lineEnd = vec2.scaleAndAdd(vec2.create(), line.point, line.direction, -1e6)
  const p1 = vec2.scaleAndAdd(vec2.create(), lineStart, leftDir, thicknessLeft)
  const p2 = vec2.scaleAndAdd(vec2.create(), lineStart, leftDir, -thicknessRight)
  const p3 = vec2.scaleAndAdd(vec2.create(), lineEnd, leftDir, -thicknessRight)
  const p4 = vec2.scaleAndAdd(vec2.create(), lineEnd, leftDir, thicknessLeft)

  const beamPolygon: Polygon2D = { points: [p1, p2, p3, p4] }
  const beamParts = intersectPolygon(clipPolygon, { outer: beamPolygon, holes: [] })

  for (const part of beamParts) {
    const partInfo = partType ? polygonPartInfo(partType, part.outer, 'xy', height) : undefined
    yield* yieldElement(
      createConstructionElement(material, createExtrudedPolygon(part, 'xy', height), undefined, tags, partInfo)
    )
  }
}

export function* beam(
  line: LineSegment2D,
  clipPolygon: PolygonWithHoles2D,
  thicknessLeft: Length,
  thicknessRight: Length,
  height: Length,
  material: MaterialId,
  partType?: string,
  tags?: Tag[]
): Generator<ConstructionResult> {
  const leftDir = perpendicularCW(direction(line.start, line.end))
  const p1 = vec2.scaleAndAdd(vec2.create(), line.start, leftDir, thicknessLeft)
  const p2 = vec2.scaleAndAdd(vec2.create(), line.start, leftDir, -thicknessRight)
  const p3 = vec2.scaleAndAdd(vec2.create(), line.end, leftDir, -thicknessRight)
  const p4 = vec2.scaleAndAdd(vec2.create(), line.end, leftDir, thicknessLeft)

  const beamPolygon: Polygon2D = { points: [p1, p2, p3, p4] }
  const beamParts = intersectPolygon(clipPolygon, { outer: beamPolygon, holes: [] })

  for (const part of beamParts) {
    const partInfo = partType ? polygonPartInfo(partType, part.outer, 'xy', height) : undefined
    yield* yieldElement(
      createConstructionElement(material, createExtrudedPolygon(part, 'xy', height), undefined, tags, partInfo)
    )
  }
}

export function* stripesPolygons(
  polygon: PolygonWithHoles2D,
  direction: vec2,
  thickness: Length,
  spacing: Length,
  startOffset: Length = 0,
  endOffset: Length = 0,
  minimumArea: Area = 0
): Generator<PolygonWithHoles2D> {
  const perpDir = perpendicular(direction)

  const dots = polygon.outer.points.map(p => vec2.dot(p, perpDir))
  const joistStart = polygon.outer.points[dots.indexOf(Math.min(...dots))]
  const totalSpan = Math.max(...dots) - Math.min(...dots)

  const dots2 = polygon.outer.points.map(p => vec2.dot(p, direction))
  const joistMin = polygon.outer.points[dots2.indexOf(Math.min(...dots2))]
  const joistLength = Math.max(...dots2) - Math.min(...dots2)

  const joistLine: Line2D = { point: joistStart, direction: direction }
  const perpLine: Line2D = { point: joistMin, direction: perpDir }

  const intersection = lineIntersection(joistLine, perpLine)

  if (!intersection) {
    return
  }

  const stepWidth = thickness + spacing
  const end = totalSpan + spacing - endOffset
  for (let offset = startOffset; offset <= end; offset += stepWidth) {
    const clippedOffset = Math.min(offset, totalSpan - thickness)
    const p1 = vec2.scaleAndAdd(vec2.create(), intersection, perpDir, clippedOffset)
    const p2 = vec2.scaleAndAdd(vec2.create(), p1, perpDir, thickness)
    const p3 = vec2.scaleAndAdd(vec2.create(), p2, direction, joistLength)
    const p4 = vec2.scaleAndAdd(vec2.create(), p1, direction, joistLength)

    const joistPolygon: Polygon2D = { points: [p1, p2, p3, p4] }
    const joistParts = intersectPolygon(polygon, { outer: joistPolygon, holes: [] })

    yield* joistParts.filter(p => calculatePolygonArea(p.outer) > minimumArea)
  }
}

export function* simpleStripes(
  polygon: PolygonWithHoles2D,
  direction: vec2,
  thickness: Length,
  height: Length,
  spacing: Length,
  material: MaterialId,
  partType?: string,
  tags?: Tag[]
): Generator<ConstructionResult> {
  const perpDir = perpendicular(direction)

  const dots = polygon.outer.points.map(p => vec2.dot(p, perpDir))
  const joistStart = polygon.outer.points[dots.indexOf(Math.min(...dots))]
  const totalSpan = Math.max(...dots) - Math.min(...dots)

  const dots2 = polygon.outer.points.map(p => vec2.dot(p, direction))
  const joistMin = polygon.outer.points[dots2.indexOf(Math.min(...dots2))]
  const joistLength = Math.max(...dots2) - Math.min(...dots2)

  const joistLine: Line2D = { point: joistStart, direction: direction }
  const perpLine: Line2D = { point: joistMin, direction: perpDir }

  const intersection = lineIntersection(joistLine, perpLine)

  if (!intersection) {
    yield yieldWarning('Could not determine stripe positions due to parallel lines.', [])
    return
  }

  // Used to filter out tiny joist pieces (which are probably not needed)
  const minRelevantArea = (thickness * thickness) / 2

  const stepWidth = thickness + spacing
  const end = totalSpan + spacing
  for (let offset = 0; offset <= end; offset += stepWidth) {
    const clippedOffset = Math.min(offset, totalSpan - thickness)
    const p1 = vec2.scaleAndAdd(vec2.create(), intersection, perpDir, clippedOffset)
    const p2 = vec2.scaleAndAdd(vec2.create(), p1, perpDir, thickness)
    const p3 = vec2.scaleAndAdd(vec2.create(), p2, direction, joistLength)
    const p4 = vec2.scaleAndAdd(vec2.create(), p1, direction, joistLength)

    const joistPolygon: Polygon2D = { points: [p1, p2, p3, p4] }
    const joistParts = intersectPolygon(polygon, { outer: joistPolygon, holes: [] })

    for (const part of joistParts) {
      if (calculatePolygonArea(part.outer) < minRelevantArea) continue
      const partInfo = partType ? polygonPartInfo(partType, part.outer, 'xy', height) : undefined
      yield* yieldElement(
        createConstructionElement(material, createExtrudedPolygon(part, 'xy', height), undefined, tags, partInfo)
      )
    }
  }
}

export function* simplePolygonFrame(
  polygon: Polygon2D,
  thickness: Length,
  height: Length,
  material: MaterialId,
  clipPolygon?: Polygon2D,
  partType?: string,
  tags?: Tag[],
  inside = true
): Generator<ConstructionResult> {
  polygon = ensurePolygonIsClockwise(polygon)
  const outerPolygon = inside ? polygon : offsetPolygon(polygon, thickness)
  const innerPolygon = inside ? offsetPolygon(polygon, -thickness) : polygon

  if (outerPolygon.points.length === innerPolygon.points.length) {
    const l = outerPolygon.points.length
    for (let i0 = 0; i0 < l; i0++) {
      const i1 = (i0 + 1) % l
      const innerStart = innerPolygon.points[i0]
      const innerEnd = innerPolygon.points[i1]
      const outsideStart = closestPoint(innerStart, outerPolygon.points)
      const outsideEnd = closestPoint(innerEnd, outerPolygon.points)

      const elementPolygon: PolygonWithHoles2D = {
        outer: {
          // points: [outerPolygon.points[i0], outerPolygon.points[i1], innerPolygon.points[i1], innerPolygon.points[i0]]
          points: [innerStart, innerEnd, outsideEnd, outsideStart]
        },
        holes: []
      }
      const clipped = clipPolygon
        ? intersectPolygon(elementPolygon, { outer: clipPolygon, holes: [] })
        : [elementPolygon]

      for (const clip of clipped) {
        const partInfo = partType ? polygonPartInfo(partType, clip.outer, 'xy', height) : undefined
        yield* yieldElement(
          createConstructionElement(material, createExtrudedPolygon(clip, 'xy', height), undefined, tags, partInfo)
        )
      }
    }
  }
}

export function closestPoint(reference: vec2, points: vec2[]): vec2 {
  if (points.length === 0) {
    throw new Error("closestPoint: 'points' array must not be empty.")
  }

  let closest = points[0]
  let minDistSq = vec2.sqrDist(reference, closest)

  for (let i = 1; i < points.length; i++) {
    const p = points[i]
    const distSq = vec2.sqrDist(reference, p)
    if (distSq < minDistSq) {
      minDistSq = distSq
      closest = p
    }
  }

  return vec2.clone(closest)
}

export function* polygonEdges(polygon: Polygon2D): Generator<LineSegment2D> {
  for (let i0 = 0; i0 < polygon.points.length; i0++) {
    const i1 = (i0 + 1) % polygon.points.length
    yield {
      start: polygon.points[i0],
      end: polygon.points[i1]
    }
  }
}

const EPSILON = 1e-5

export function lineSegmentIntersect(line: Line2D, segment: LineSegment2D): vec2 | null {
  const segmentLine: Line2D = {
    point: segment.start,
    direction: direction(segment.start, segment.end)
  }

  const intersection = lineIntersection(line, segmentLine)
  if (!intersection) return null

  // Check if intersection is actually on the segment
  const segmentLength = vec2.distance(segment.start, segment.end)
  const distFromStart = vec2.distance(segment.start, intersection)
  const distFromEnd = vec2.distance(segment.end, intersection)

  // Point is on segment if distances sum to segment length (with epsilon tolerance)
  if (Math.abs(distFromStart + distFromEnd - segmentLength) < EPSILON) {
    return intersection
  }

  return null
}

export function splitPolygonAtIndices(
  polygon: Polygon2D,
  startIndex: number,
  endIndex: number,
  cutStart: vec2,
  cutEnd: vec2
): [Polygon2D, Polygon2D] {
  const points = polygon.points
  const n = points.length

  // cutStart lies on the edge from points[startIndex] to points[(startIndex+1)%n]
  // cutEnd lies on the edge from points[endIndex] to points[(endIndex+1)%n]

  // Build first polygon: cutStart -> points along polygon -> cutEnd
  const poly1Points: vec2[] = []

  // Add cutStart (unless it coincides with the next point we'll add)
  const nextAfterStart = points[(startIndex + 1) % n]
  if (vec2.distance(cutStart, nextAfterStart) > EPSILON) {
    poly1Points.push(vec2.clone(cutStart))
  }

  // Add all points from (startIndex+1) to endIndex (inclusive)
  let i = (startIndex + 1) % n
  while (true) {
    poly1Points.push(vec2.clone(points[i]))
    if (i === endIndex) break
    i = (i + 1) % n
  }

  // Add cutEnd (unless it coincides with the last point we added)
  if (vec2.distance(cutEnd, poly1Points[poly1Points.length - 1]) > EPSILON) {
    poly1Points.push(vec2.clone(cutEnd))
  }

  // Build second polygon: cutEnd -> points along polygon -> cutStart
  const poly2Points: vec2[] = []

  // Add cutEnd (unless it coincides with the next point we'll add)
  const nextAfterEnd = points[(endIndex + 1) % n]
  if (vec2.distance(cutEnd, nextAfterEnd) > EPSILON) {
    poly2Points.push(vec2.clone(cutEnd))
  }

  // Add all points from (endIndex+1) to startIndex (inclusive)
  i = (endIndex + 1) % n
  while (true) {
    poly2Points.push(vec2.clone(points[i]))
    if (i === startIndex) break
    i = (i + 1) % n
  }

  // Add cutStart (unless it coincides with the last point we added)
  if (vec2.distance(cutStart, poly2Points[poly2Points.length - 1]) > EPSILON) {
    poly2Points.push(vec2.clone(cutStart))
  }

  return [{ points: poly1Points }, { points: poly2Points }]
}

export function* partitionByAlignedEdges(polygon: Polygon2D, dir: vec2): Generator<Polygon2D> {
  // Optimization: polygons with less than 4 points cannot be split
  if (polygon.points.length < 4) {
    yield polygon
    return
  }

  const queue = [ensurePolygonIsClockwise(polygon)]

  while (queue.length > 0) {
    const toSplit = queue.pop()!
    const pointCount = toSplit.points.length

    const area = calculatePolygonArea(toSplit)
    if (area < EPSILON) continue

    if (pointCount < 4) {
      yield toSplit
      continue
    }

    let splitFound = false

    for (let i = 0; i < pointCount; i++) {
      const start = toSplit.points[i]
      const end = toSplit.points[(i + 1) % pointCount]
      const prev = toSplit.points[(i - 1 + pointCount) % pointCount]
      const next = toSplit.points[(i + 2) % pointCount]
      const edgeDir = direction(start, end)

      // Check if edge is aligned with the joist direction (handles both dir and -dir)
      if (1 - Math.abs(vec2.dot(edgeDir, dir)) > EPSILON) continue

      const edgeLine: Line2D = { point: start, direction: dir }
      const perpDir = perpendicularCW(edgeDir)

      // Check if we can extend this edge in either direction
      // Forward: check if next edge has positive perpendicular component (turns right/into polygon)
      const nextDir = direction(end, next)
      const nextPerpComponent = vec2.dot(nextDir, perpDir)
      const canExtendForward = nextPerpComponent < -EPSILON

      // Backward: check if prev edge has negative perpendicular component (turns left when going backward)
      const prevDir = direction(prev, start)
      const prevPerpComponent = vec2.dot(prevDir, perpDir)
      const canExtendBackward = prevPerpComponent > EPSILON

      if (!canExtendForward && !canExtendBackward) continue

      let bestForwardIndex = -1
      let bestForwardPoint: vec2 | null = null
      let smallestForwardDistance = Infinity

      let bestBackwardIndex = -1
      let bestBackwardPoint: vec2 | null = null
      let smallestBackwardDistance = Infinity

      // Search for intersections (excluding current, next, and previous edges)
      for (let j = 2; j < pointCount - 1; j++) {
        // Forward search
        if (canExtendForward) {
          const candidateIndex = (i + j) % pointCount
          const candidateStart = toSplit.points[candidateIndex]
          const candidateEnd = toSplit.points[(candidateIndex + 1) % pointCount]
          const intersection = lineSegmentIntersect(edgeLine, { start: candidateStart, end: candidateEnd })

          if (intersection) {
            const distance = vec2.distance(end, intersection)
            if (distance > EPSILON && distance < smallestForwardDistance) {
              bestForwardIndex = candidateIndex
              bestForwardPoint = intersection
              smallestForwardDistance = distance
            }
          }
        }

        // Backward search
        if (canExtendBackward) {
          const candidateIndex = (i - j + pointCount) % pointCount
          const candidateStart = toSplit.points[candidateIndex]
          const candidateEnd = toSplit.points[(candidateIndex + 1) % pointCount]
          const intersection = lineSegmentIntersect(edgeLine, { start: candidateStart, end: candidateEnd })

          if (intersection) {
            const distance = vec2.distance(start, intersection)
            if (distance > EPSILON && distance < smallestBackwardDistance) {
              bestBackwardIndex = candidateIndex
              bestBackwardPoint = intersection
              smallestBackwardDistance = distance
            }
          }
        }
      }

      // If we found a valid split, perform it
      if (bestBackwardPoint || bestForwardPoint) {
        let cutStart = start
        let cutEnd = end
        let splitStartIndex = i
        let splitEndIndex = (i + 1) % pointCount

        if (bestBackwardPoint && bestForwardPoint) {
          if (bestBackwardIndex === bestForwardIndex) {
            // Same edge - choose the split with smaller distance
            if (smallestBackwardDistance < smallestForwardDistance) {
              cutEnd = bestBackwardPoint
              splitEndIndex = bestBackwardIndex
            } else {
              cutStart = bestForwardPoint
              splitStartIndex = bestForwardIndex
            }
          } else {
            // Different edges - only perform backward cut (arbitrary choice)
            // The forward ear will be discovered and cut in a subsequent iteration
            cutEnd = bestBackwardPoint
            splitEndIndex = bestBackwardIndex
          }
        } else if (bestBackwardPoint) {
          // Only backward cut found
          cutEnd = bestBackwardPoint
          splitEndIndex = bestBackwardIndex
        } else if (bestForwardPoint) {
          // Only forward cut found
          cutStart = bestForwardPoint
          splitStartIndex = bestForwardIndex
        }

        const [poly1, poly2] = splitPolygonAtIndices(toSplit, splitStartIndex, splitEndIndex, cutStart, cutEnd)

        queue.push(simplifyPolygon(poly1), simplifyPolygon(poly2))
        splitFound = true
        break // Move to next polygon in queue
      }
    }

    if (!splitFound) {
      // No valid splits found - this polygon is fully partitioned
      yield toSplit
    }
  }
}
