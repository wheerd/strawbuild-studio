import type {
  InnerWallNodeGeometry,
  PerimeterWallNodeGeometry,
  WallNode,
  WallNodeIncidentWall
} from '@/building/model/rooms'
import {
  type Line2D,
  type Vec2,
  ZERO_VEC2,
  addVec2,
  crossVec2,
  direction,
  distVec2,
  dotAbsVec2,
  dotVec2,
  lineIntersection,
  midpoint,
  projectPointOntoLine,
  scaleAddVec2,
  scaleVec2,
  subVec2
} from '@/shared/geometry'

import { type WallId, type WallNodeId, isIntermediateWallId } from './ids'

export interface WallNodeIncidentLine {
  left: Line2D
  right: Line2D
  wallId: WallId
  dir: Vec2
  side: 'start' | 'end'
}

/** Computes adjacent incident intersections; null marks an angularly colinear pair. */
export function computeAdjacentWallLineIntersections(
  incidents: readonly WallNodeIncidentLine[],
  nodeId: WallNodeId
): (Vec2 | null)[] {
  return incidents.map((incident, index) => {
    const next = incidents[(index + 1) % incidents.length]
    if (dotAbsVec2(incident.right.direction, next.left.direction) >= 0.99) {
      return null
    }

    const intersection = lineIntersection(incident.right, next.left)
    if (!intersection) {
      throw new Error(`No intersection found between wall lines at node ${nodeId}`)
    }
    return intersection
  })
}

function computeWallEnd(nodePos: Vec2, wall: WallNodeIncidentLine) {
  const left = projectPointOntoLine(nodePos, wall.left)
  const right = projectPointOntoLine(nodePos, wall.right)

  return {
    center: midpoint(left, right),
    incidentWalls: [{ direction: wall.dir, leftPoint: left, rightPoint: right, id: wall.wallId, side: wall.side }]
  } as InnerWallNodeGeometry
}

export function computeNodeGeometry(node: WallNode, nodePos: Vec2, incidents: WallNodeIncidentLine[]) {
  if (node.type === 'inner') {
    if (incidents.length === 1) {
      return computeWallEnd(nodePos, incidents[0])
    } else if (incidents.length === 2) {
      const dot = dotAbsVec2(incidents[0].dir, incidents[1].dir)
      if (dot > 0.99) {
        return computeColinearNodeGeometry(nodePos, incidents[0], incidents[1])
      }
      return computeTwoWallNodeGeometry(node.id, incidents)
    }
  }

  const intersectionPoints = computeAdjacentWallLineIntersections(incidents, node.id)

  const n = incidents.length
  const colinearIndex = intersectionPoints.indexOf(null)
  let colinearPrev = ZERO_VEC2
  let colinearNext = ZERO_VEC2
  let colinearSharedPoint: Vec2 | undefined
  if (colinearIndex !== -1) {
    const colinearLine = incidents[colinearIndex].right
    const prevIndex = (n + colinearIndex - 1) % n
    const nextIndex = (colinearIndex + 1) % n
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    colinearPrev = projectPointOntoLine(intersectionPoints[prevIndex]!, colinearLine)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    colinearNext = projectPointOntoLine(intersectionPoints[nextIndex]!, colinearLine)
    colinearSharedPoint = clampPointToLineSegment(
      projectPointOntoLine(nodePos, colinearLine),
      colinearPrev,
      colinearNext
    )
  }

  let insideStart = ZERO_VEC2
  let insideEnd = ZERO_VEC2
  let outsideStart = ZERO_VEC2
  let outsideEnd = ZERO_VEC2
  const incidentWalls: WallNodeIncidentWall[] = []
  const polygonPoints: Vec2[] = []
  for (let i = 0; i < n; i++) {
    const iNext = (i + 1) % n
    const line = incidents[iNext]

    const prevIntersection = intersectionPoints[i] ?? colinearPrev
    const nextIntersection = intersectionPoints[iNext] ?? colinearNext
    const leftProj = dotVec2(line.dir, prevIntersection)
    const rightProj = dotVec2(line.dir, nextIntersection)
    const leftPoint = leftProj < rightProj ? projectPointOntoLine(nextIntersection, line.left) : prevIntersection
    const rightPoint = leftProj < rightProj ? nextIntersection : projectPointOntoLine(prevIntersection, line.right)

    const wallLeftPoint =
      colinearSharedPoint && iNext === lineIndexAfter(colinearIndex, n) ? colinearSharedPoint : prevIntersection
    const wallRightPoint = colinearSharedPoint && iNext === colinearIndex ? colinearSharedPoint : nextIntersection

    polygonPoints.push(prevIntersection, leftPoint, rightPoint)
    incidentWalls.push({
      leftPoint: wallLeftPoint,
      rightPoint: wallRightPoint,
      direction: line.dir,
      id: line.wallId,
      side: line.side
    })

    if (!isIntermediateWallId(line.wallId)) {
      if (intersectionPoints[iNext] === null) {
        insideStart = leftPoint
        outsideStart = rightPoint
      } else if (intersectionPoints[i] === null) {
        insideEnd = rightPoint
        outsideEnd = leftPoint
      } else {
        throw new Error('Unreachable')
      }
    }
  }

  const boundary = { points: simplifyNodePolygonPoints(polygonPoints) }
  const sum = boundary.points.reduce((acc, p) => addVec2(acc, p), ZERO_VEC2)
  const center = scaleVec2(sum, 1 / boundary.points.length)

  if (node.type === 'inner') {
    return {
      center,
      boundary,
      incidentWalls
    } as InnerWallNodeGeometry
  } else {
    return {
      position: nodePos,
      center,
      boundary,
      incidentWalls,
      insideLine: { start: insideStart, end: insideEnd },
      outsideLine: { start: outsideStart, end: outsideEnd }
    } as PerimeterWallNodeGeometry
  }
}

function computeTwoWallNodeGeometry(nodeId: WallNodeId, incidents: WallNodeIncidentLine[]) {
  const intersections = computeAdjacentWallLineIntersections(incidents, nodeId)
  const incidentWalls = incidents.map((incident, index) => {
    const leftPoint = intersections[(index + incidents.length - 1) % incidents.length]
    const rightPoint = intersections[index]
    if (!leftPoint || !rightPoint) throw new Error(`Missing two-wall intersection at node ${nodeId}`)
    return {
      direction: incident.dir,
      leftPoint,
      rightPoint,
      id: incident.wallId,
      side: incident.side
    }
  })
  const polygonPoints: Vec2[] = []
  for (let i = 0; i < incidents.length; i++) {
    const iNext = (i + 1) % incidents.length
    const line = incidents[iNext]
    const prevIntersection = intersections[i]
    const nextIntersection = intersections[iNext]
    if (!prevIntersection || !nextIntersection) {
      throw new Error(`Missing two-wall boundary intersection at node ${nodeId}`)
    }

    const leftProj = dotVec2(line.dir, prevIntersection)
    const rightProj = dotVec2(line.dir, nextIntersection)
    const leftPoint = leftProj < rightProj ? projectPointOntoLine(nextIntersection, line.left) : prevIntersection
    const rightPoint = leftProj < rightProj ? nextIntersection : projectPointOntoLine(prevIntersection, line.right)
    polygonPoints.push(prevIntersection, leftPoint, rightPoint)
  }

  const boundary = { points: simplifyNodePolygonPoints(polygonPoints) }
  const sum = boundary.points.reduce((acc, point) => addVec2(acc, point), ZERO_VEC2)
  const center = scaleVec2(sum, 1 / boundary.points.length)

  return {
    center,
    boundary,
    incidentWalls
  } as InnerWallNodeGeometry
}

function clampPointToLineSegment(point: Vec2, start: Vec2, end: Vec2): Vec2 {
  if (distVec2(start, end) <= 1e-6) return start

  const lineDirection = direction(start, end)
  const pointProjection = dotVec2(point, lineDirection)
  const startProjection = dotVec2(start, lineDirection)
  const endProjection = dotVec2(end, lineDirection)
  const clampedProjection = Math.max(
    Math.min(startProjection, endProjection),
    Math.min(Math.max(startProjection, endProjection), pointProjection)
  )

  return scaleAddVec2(point, lineDirection, clampedProjection - pointProjection)
}
function simplifyNodePolygonPoints(points: Vec2[]): Vec2[] {
  const deduplicated: Vec2[] = []
  for (const point of points) {
    if (deduplicated.length === 0 || distVec2(deduplicated[deduplicated.length - 1], point) > 1e-6) {
      deduplicated.push(point)
    }
  }
  if (deduplicated.length > 1 && distVec2(deduplicated[0], deduplicated[deduplicated.length - 1]) <= 1e-6) {
    deduplicated.pop()
  }

  let changed = true
  while (changed && deduplicated.length >= 3) {
    changed = false
    for (let i = 0; i < deduplicated.length; i++) {
      const previous = deduplicated[(i + deduplicated.length - 1) % deduplicated.length]
      const current = deduplicated[i]
      const next = deduplicated[(i + 1) % deduplicated.length]
      const incoming = subVec2(current, previous)
      const outgoing = subVec2(next, current)
      if (Math.abs(crossVec2(incoming, outgoing)) <= 1e-6 && dotVec2(incoming, outgoing) >= 0) {
        deduplicated.splice(i, 1)
        changed = true
        break
      }
    }
  }

  return deduplicated
}

function computeColinearNodeGeometry(nodePos: Vec2, a: WallNodeIncidentLine, b: WallNodeIncidentLine) {
  const aLeft = projectPointOntoLine(nodePos, a.left)
  const aRight = projectPointOntoLine(nodePos, a.right)
  const bLeft = projectPointOntoLine(nodePos, b.left)
  const bRight = projectPointOntoLine(nodePos, b.right)

  return {
    center: midpoint(aLeft, aRight),
    incidentWalls: [
      { direction: a.dir, leftPoint: aLeft, rightPoint: aRight, id: a.wallId, side: a.side },
      { direction: b.dir, leftPoint: bLeft, rightPoint: bRight, id: b.wallId, side: b.side }
    ]
  } as InnerWallNodeGeometry
}

function lineIndex(index: number, count: number): number {
  return (index + count) % count
}

function lineIndexAfter(index: number, count: number): number {
  return lineIndex(index + 1, count)
}
