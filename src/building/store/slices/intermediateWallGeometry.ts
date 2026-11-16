import isDeepEqual from 'fast-deep-equal'

import type { Perimeter } from '@/building/model'
import type { IntermediateWallId, PerimeterId, WallNodeId } from '@/building/model/ids'
import { isIntermediateWallId, isOpeningId } from '@/building/model/ids'
import type {
  InnerWallNode,
  InnerWallNodeGeometry,
  IntermediateWall,
  IntermediateWallGeometry,
  PerimeterWallNodeGeometry,
  WallAxis,
  WallNode
} from '@/building/model/rooms'
import { type WallNodeIncidentLine, computeNodeGeometry } from '@/building/model/wallNodeIntersections'
import type { IntermediateWallsState } from '@/building/store/slices/intermediateWallsSlice'
import type { PerimetersState } from '@/building/store/slices/perimeterSlice'
import type { TimestampsState } from '@/building/store/slices/timestampsSlice'
import { updateTimestampDraft } from '@/building/store/slices/timestampsSlice'
import type { WallEntitiesState } from '@/building/store/slices/wallEntitiesSlice'
import {
  type Length,
  type Line2D,
  type LineSegment2D,
  type Vec2,
  ZERO_VEC2,
  addVec2,
  direction,
  distVec2,
  dotVec2,
  lenVec2,
  lineFromSegment,
  midpoint,
  negVec2,
  normVec2,
  perpendicularCCW,
  perpendicularCW,
  projectPointOntoLine,
  scaleAddVec2,
  scaleVec2,
  subVec2
} from '@/shared/geometry'
import { ensurePolygonIsClockwise } from '@/shared/geometry/polygon'

import { updateEntityGeometry } from './perimeterGeometry'

export function updateAllWallNodeGeometry(
  state: IntermediateWallsState & PerimetersState & WallEntitiesState & TimestampsState,
  perimeterId: PerimeterId
): void {
  if (!(perimeterId in state.perimeters)) return
  const perimeter = state.perimeters[perimeterId]

  const nodePositions = getNodePositions(perimeter, state)
  const wallLines = getWallLines(perimeter, state, nodePositions)

  for (const nodeId of perimeter.wallNodeIds) {
    const node = state.wallNodes[nodeId]

    const incidentWallLines: WallNodeIncidentLine[] = node.connectedWallIds
      .map(wallId => {
        const lines = wallLines.get(wallId)
        const wall = state.intermediateWalls[wallId]
        if (!lines) return null
        const left = wall.start.nodeId === node.id ? lines.left : lines.right
        const right = wall.start.nodeId === node.id ? lines.right : lines.left
        const dir = wall.start.nodeId === node.id ? lines.left.direction : negVec2(lines.left.direction)
        const side = wall.start.nodeId === node.id ? 'start' : 'end'
        return {
          wallId,
          left,
          right,
          dir,
          side
        } satisfies WallNodeIncidentLine
      })
      .filter(item => item != null)

    if (node.type === 'perimeter') {
      const perimeterWall = state._perimeterWallGeometry[node.wallId]
      const insideLine = lineFromSegment(perimeterWall.insideLine)
      const outsideLine = lineFromSegment(perimeterWall.outsideLine)
      incidentWallLines.push(
        {
          wallId: node.wallId,
          dir: perimeterWall.direction,
          left: outsideLine,
          right: insideLine,
          side: 'end'
        },
        {
          wallId: node.wallId,
          dir: negVec2(perimeterWall.direction),
          left: insideLine,
          right: outsideLine,
          side: 'start'
        }
      )
    }

    incidentWallLines.sort((a, b) => {
      const aDir = a.dir
      const bDir = b.dir
      const angleA = Math.atan2(aDir[1], aDir[0])
      const angleB = Math.atan2(bDir[1], bDir[0])
      return angleB - angleA
    })

    if (node.connectedWallIds.length === 0) {
      updateOrphanedNodeGeometry(node, state, nodePositions)
    } else if (node.type === 'inner' && incidentWallLines.length === 1) {
      updateWallEnd(state, incidentWallLines[0], node)
    } else {
      const nodePos = nodePositions.get(node.id)
      if (!nodePos) throw new Error('Missing node position')
      updateComplexNodeGeometry(node, nodePos, incidentWallLines, state)
    }
  }

  for (const wallId of perimeter.intermediateWallIds) {
    updateWallGeometry(state._intermediateWallGeometry[wallId], state.intermediateWalls[wallId])
  }

  for (const wallId of perimeter.intermediateWallIds) {
    updateIntermediateWallEntities(state, wallId)
  }
}

function updateOrphanedNodeGeometry(
  node: WallNode,
  state: IntermediateWallsState & PerimetersState & WallEntitiesState & TimestampsState,
  nodePositions: Map<WallNodeId, Vec2>
) {
  if (node.type === 'inner') {
    state._wallNodeGeometry[node.id] = {
      center: node.position,
      incidentWalls: []
    } as InnerWallNodeGeometry
  } else {
    const wallGeometry = state._perimeterWallGeometry[node.wallId]
    const insidePoint = nodePositions.get(node.id)
    if (!insidePoint) throw new Error(`Missing node position for node ${node.id}`)
    const outsidePoint = projectPointOntoLine(insidePoint, lineFromSegment(wallGeometry.outsideLine))
    state._wallNodeGeometry[node.id] = {
      position: insidePoint,
      center: midpoint(outsidePoint, insidePoint),
      incidentWalls: [],
      insideLine: { start: insidePoint, end: insidePoint },
      outsideLine: { start: outsidePoint, end: outsidePoint }
    } as PerimeterWallNodeGeometry
  }
}

function updateIntermediateWallEntities(
  state: IntermediateWallsState & PerimetersState & WallEntitiesState & TimestampsState,
  wallId: IntermediateWallId
): void {
  const wall = state.intermediateWalls[wallId]
  const geometry = state._intermediateWallGeometry[wallId]

  const insideLine: LineSegment2D = {
    start: scaleAddVec2(geometry.entityReferenceLine.start, geometry.leftDirection, -wall.thickness / 2),
    end: scaleAddVec2(geometry.entityReferenceLine.end, geometry.leftDirection, -wall.thickness / 2)
  }
  const outsideLine: LineSegment2D = {
    start: scaleAddVec2(geometry.entityReferenceLine.start, geometry.leftDirection, wall.thickness / 2),
    end: scaleAddVec2(geometry.entityReferenceLine.end, geometry.leftDirection, wall.thickness / 2)
  }
  const source = {
    insideLine,
    outsideLine,
    direction: geometry.direction
  }

  for (const entityId of wall.entityIds) {
    if (isOpeningId(entityId)) {
      if (!(entityId in state.openings)) continue
      const entity = state.openings[entityId]
      const nextGeometry = updateEntityGeometry(source, entity)
      if (!isGeometryEqual(state._openingGeometry[entityId], nextGeometry)) {
        updateTimestampDraft(state, entityId)
      }
      state._openingGeometry[entityId] = nextGeometry
    } else {
      if (!(entityId in state.wallPosts)) continue
      const entity = state.wallPosts[entityId]
      const nextGeometry = updateEntityGeometry(source, entity)
      if (!isGeometryEqual(state._wallPostGeometry[entityId], nextGeometry)) {
        updateTimestampDraft(state, entityId)
      }
      state._wallPostGeometry[entityId] = nextGeometry
    }
  }
}

function isGeometryEqual(a: unknown, b: unknown): boolean {
  return isDeepEqual(a, b)
}

function updateWallGeometry(geometry: IntermediateWallGeometry, wall: IntermediateWall) {
  const leftStartProjection = dotVec2(geometry.direction, geometry.leftLine.start)
  const leftEndProjection = dotVec2(geometry.direction, geometry.leftLine.end)
  const rightStartProjection = dotVec2(geometry.direction, geometry.rightLine.start)
  const rightEndProjection = dotVec2(geometry.direction, geometry.rightLine.end)
  const overlapStart = Math.max(
    Math.min(leftStartProjection, leftEndProjection),
    Math.min(rightStartProjection, rightEndProjection)
  )
  const overlapEnd = Math.min(
    Math.max(leftStartProjection, leftEndProjection),
    Math.max(rightStartProjection, rightEndProjection)
  )

  const centerStart = scaleAddVec2(
    scaleAddVec2(geometry.leftLine.start, geometry.direction, overlapStart - leftStartProjection),
    geometry.leftDirection,
    -wall.thickness / 2
  )
  const centerEnd = scaleAddVec2(
    scaleAddVec2(geometry.leftLine.start, geometry.direction, overlapEnd - leftStartProjection),
    geometry.leftDirection,
    -wall.thickness / 2
  )

  geometry.entityReferenceLine = { start: centerStart, end: centerEnd }
  geometry.wallLength = distVec2(geometry.entityReferenceLine.start, geometry.entityReferenceLine.end)
  geometry.leftLength = distVec2(geometry.leftLine.start, geometry.leftLine.end)
  geometry.rightLength = distVec2(geometry.rightLine.start, geometry.rightLine.end)

  geometry.boundary = ensurePolygonIsClockwise({
    points: [
      scaleAddVec2(geometry.entityReferenceLine.start, geometry.leftDirection, -wall.thickness / 2),
      scaleAddVec2(geometry.entityReferenceLine.end, geometry.leftDirection, -wall.thickness / 2),
      scaleAddVec2(geometry.entityReferenceLine.end, geometry.leftDirection, wall.thickness / 2),
      scaleAddVec2(geometry.entityReferenceLine.start, geometry.leftDirection, wall.thickness / 2)
    ]
  })
}

function updateComplexNodeGeometry(
  node: WallNode,
  nodePos: Vec2,
  incidents: WallNodeIncidentLine[],
  state: IntermediateWallsState & PerimetersState & TimestampsState
) {
  const geometry = computeNodeGeometry(node, nodePos, incidents)

  for (const incident of geometry.incidentWalls) {
    if (isIntermediateWallId(incident.id)) {
      assignWallEndpointsFromNode(node.id, incident.id, state, incident.leftPoint, incident.rightPoint)
    }
  }

  state._wallNodeGeometry[node.id] = geometry
}

function assignWallEndpointsFromNode(
  nodeId: WallNodeId,
  wallId: IntermediateWallId,
  state: IntermediateWallsState & PerimetersState & TimestampsState,
  left: Vec2,
  right: Vec2
) {
  const wallB = state.intermediateWalls[wallId]
  const geometryB = state._intermediateWallGeometry[wallId]
  if (wallB.start.nodeId === nodeId) {
    geometryB.leftLine.start = left
    geometryB.rightLine.start = right
  } else {
    geometryB.rightLine.end = left
    geometryB.leftLine.end = right
  }
}

function updateWallEnd(
  state: IntermediateWallsState & PerimetersState & TimestampsState,
  wall: WallNodeIncidentLine,
  node: InnerWallNode
) {
  const left = projectPointOntoLine(node.position, wall.left)
  const right = projectPointOntoLine(node.position, wall.right)
  assignWallEndpointsFromNode(node.id, wall.wallId as IntermediateWallId, state, left, right)

  state._wallNodeGeometry[node.id] = {
    center: midpoint(left, right),
    incidentWalls: [{ direction: wall.dir, leftPoint: left, rightPoint: right, id: wall.wallId, side: wall.side }]
  } as InnerWallNodeGeometry
}

function getWallLines(
  perimeter: Perimeter,
  state: IntermediateWallsState & PerimetersState & TimestampsState,
  nodePositions: Map<WallNodeId, Vec2>
) {
  const wallLines = new Map<IntermediateWallId, { left: Line2D; right: Line2D }>()
  for (const wallId of perimeter.intermediateWallIds) {
    const wall = state.intermediateWalls[wallId]
    const startPos = nodePositions.get(wall.start.nodeId)
    const endPos = nodePositions.get(wall.end.nodeId)
    if (!startPos || !endPos) continue

    const lines = computeWallLines(startPos, wall.start.axis, endPos, wall.end.axis, wall.thickness)

    state._intermediateWallGeometry[wallId] = {
      direction: lines.left.direction,
      leftDirection: perpendicularCCW(lines.left.direction),
      boundary: { points: [] },
      entityReferenceLine: { start: ZERO_VEC2, end: ZERO_VEC2 },
      wallLength: 0,
      leftLength: 0,
      leftLine: { start: ZERO_VEC2, end: ZERO_VEC2 },
      rightLength: 0,
      rightLine: { start: ZERO_VEC2, end: ZERO_VEC2 }
    }

    wallLines.set(wallId, lines)
  }

  return wallLines
}

function getNodePositions(perimeter: Perimeter, state: IntermediateWallsState & PerimetersState & TimestampsState) {
  const nodePositions = new Map<WallNodeId, Vec2>()
  for (const nodeId of perimeter.wallNodeIds) {
    const node = state.wallNodes[nodeId]

    if (node.type === 'perimeter') {
      const wallGeometry = state._perimeterWallGeometry[node.wallId]
      const position = scaleAddVec2(wallGeometry.insideLine.start, wallGeometry.direction, node.offsetFromCornerStart)

      nodePositions.set(nodeId, position)
    } else {
      nodePositions.set(nodeId, node.position)
    }
  }
  return nodePositions
}

export function computeWallLines(
  start: Vec2,
  startAxis: WallAxis,
  end: Vec2,
  endAxis: WallAxis,
  thickness: Length
): { left: Line2D; right: Line2D } {
  if (startAxis === endAxis) {
    const lineDirection = direction(start, end)
    const leftDir = perpendicularCCW(lineDirection)

    const leftBase = startAxis === 'left' ? start : scaleAddVec2(start, leftDir, thickness)
    const rightBase = startAxis === 'right' ? start : scaleAddVec2(start, leftDir, -thickness)

    return {
      left: { point: leftBase, direction: lineDirection },
      right: { point: rightBase, direction: lineDirection }
    }
  }

  const v = subVec2(end, start)
  const len = lenVec2(v)
  const dir = normVec2(v)
  const perpendicularDir = perpendicularCCW(dir)

  if (startAxis !== endAxis && thickness > len) {
    throw new Error('Wall thickness larger than distance between points')
  }

  // The signed normal offset between the selected axes determines the
  // direction of the parallel wall lines. Positive values mean that the
  // start attachment is farther toward the left side than the end one.
  const axisPosition = (axis: WallAxis): number => (axis === 'left' ? -1 : 1)
  const normalOffset = ((axisPosition(startAxis) - axisPosition(endAxis)) * thickness) / 2
  const alpha = normalOffset / len
  const beta = Math.sqrt(1 - alpha * alpha)

  // `leftDir` is the left normal of the start -> end direction. The
  // perpendicular component is positive so the line direction remains
  // oriented from start to end for every attachment-axis combination.
  const leftDir = addVec2(scaleVec2(dir, alpha), scaleVec2(perpendicularDir, beta))
  const lineDirection = perpendicularCW(leftDir)

  const leftBase = startAxis === 'left' ? start : endAxis === 'left' ? end : scaleAddVec2(start, leftDir, thickness)

  const rightBase = startAxis === 'right' ? start : endAxis === 'right' ? end : scaleAddVec2(start, leftDir, -thickness)

  return {
    left: { point: leftBase, direction: lineDirection },
    right: { point: rightBase, direction: lineDirection }
  }
}
