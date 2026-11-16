import { describe, expect, it } from 'vitest'

import { type Vec2, distVec2, newVec2, perpendicularCCW, scaleAddVec2 } from '@/shared/geometry'

import type { InnerWallNode, PerimeterWallNode, PerimeterWallNodeGeometry } from './rooms'
import {
  type WallNodeIncidentLine,
  computeAdjacentWallLineIntersections,
  computeNodeGeometry
} from './wallNodeIntersections'

const NODE_POSITION = newVec2(0, 0)

function makeIncident(
  wallId: string,
  wallDirection: Vec2,
  halfThickness = 5,
  side: 'start' | 'end' = 'start'
): WallNodeIncidentLine {
  const normal = perpendicularCCW(wallDirection)
  return {
    wallId: wallId as never,
    left: {
      point: scaleAddVec2(NODE_POSITION, normal, -halfThickness),
      direction: wallDirection
    },
    right: {
      point: scaleAddVec2(NODE_POSITION, normal, halfThickness),
      direction: wallDirection
    },
    dir: wallDirection,
    side
  }
}

function makeInnerNode(wallIds: string[]): InnerWallNode {
  return {
    id: 'wallnode_inner' as never,
    type: 'inner',
    position: NODE_POSITION,
    perimeterId: 'perimeter_test' as never,
    connectedWallIds: wallIds as never
  }
}

function makePerimeterNode(wallIds: string[]): PerimeterWallNode {
  return {
    id: 'wallnode_perimeter' as never,
    type: 'perimeter',
    wallId: 'outwall_boundary' as never,
    offsetFromCornerStart: 500,
    perimeterId: 'perimeter_test' as never,
    connectedWallIds: wallIds as never
  }
}

function expectFiniteGeometry(geometry: ReturnType<typeof computeNodeGeometry>): void {
  expect(isFiniteVec2(geometry.center)).toBe(true)
  for (const incident of geometry.incidentWalls) {
    expect(isFiniteVec2(incident.direction)).toBe(true)
    expect(isFiniteVec2(incident.leftPoint)).toBe(true)
    expect(isFiniteVec2(incident.rightPoint)).toBe(true)
  }
  for (const point of geometry.boundary?.points ?? []) {
    expect(isFiniteVec2(point)).toBe(true)
  }
}

function isFiniteVec2(value: Vec2): boolean {
  return Number.isFinite(value[0]) && Number.isFinite(value[1])
}

describe('computeNodeGeometry', () => {
  it('computes the two adjacent intersections for perpendicular walls', () => {
    const east = makeIncident('intermediate_east', newVec2(1, 0))
    const north = makeIncident('intermediate_north', newVec2(0, 1))

    const intersections = computeAdjacentWallLineIntersections([east, north], 'wallnode_inner' as never)

    expect(intersections).toEqual([newVec2(5, 5), newVec2(-5, -5)])
  })

  it('marks adjacent collinear wall lines without creating an intersection', () => {
    const east = makeIncident('intermediate_east', newVec2(1, 0))
    const west = makeIncident('intermediate_west', newVec2(-1, 0))

    expect(computeAdjacentWallLineIntersections([east, west], 'wallnode_inner' as never)).toEqual([null, null])
  })

  it('computes an inner wall endpoint from one incident wall', () => {
    const result = computeNodeGeometry(makeInnerNode(['intermediate_east']), NODE_POSITION, [
      makeIncident('intermediate_east', newVec2(1, 0))
    ])

    expect(result.boundary).toBeUndefined()
    expect(result.center).toEqual(NODE_POSITION)
    expect(result.incidentWalls).toHaveLength(1)
    expect(result.incidentWalls[0].leftPoint).toEqual(newVec2(0, -5))
    expect(result.incidentWalls[0].rightPoint).toEqual(newVec2(0, 5))
  })

  it('uses endpoint intersections while creating a polygon for two non-collinear walls', () => {
    const incidents: WallNodeIncidentLine[] = [
      {
        wallId: 'intermediate_wall_a' as never,
        left: { point: newVec2(0, -5), direction: newVec2(1, 0) },
        right: { point: newVec2(0, 5), direction: newVec2(1, 0) },
        dir: newVec2(1, 0),
        side: 'start'
      },
      {
        wallId: 'intermediate_wall_b' as never,
        left: { point: newVec2(0, 0), direction: newVec2(Math.SQRT1_2, Math.SQRT1_2) },
        right: { point: newVec2(0, 10), direction: newVec2(Math.SQRT1_2, Math.SQRT1_2) },
        dir: newVec2(Math.SQRT1_2, Math.SQRT1_2),
        side: 'start'
      }
    ]
    const node = {
      id: 'node' as never,
      type: 'inner',
      position: newVec2(0, 0),
      perimeterId: 'perimeter' as never,
      connectedWallIds: ['intermediate_wall_a', 'intermediate_wall_b'] as never
    } satisfies InnerWallNode

    const result = computeNodeGeometry(node, newVec2(0, 0), incidents)

    expect(result.boundary?.points).toHaveLength(4)
    expect(result.center).toEqual(newVec2(-1.25, 1.25))
    expect(result.incidentWalls).toHaveLength(2)
    expect(result.incidentWalls[0].leftPoint).toEqual(newVec2(-15, -5))
    expect(result.incidentWalls[0].rightPoint).toEqual(newVec2(5, 5))
  })

  it.each([
    ['acute', newVec2(1, 0), newVec2(Math.SQRT1_2, Math.SQRT1_2)],
    ['obtuse', newVec2(1, 0), newVec2(-Math.SQRT1_2, Math.SQRT1_2)]
  ])('creates a finite four-sided boundary for a two-wall %s junction', (_name, firstDirection, secondDirection) => {
    const result = computeNodeGeometry(makeInnerNode(['intermediate_a', 'intermediate_b']), NODE_POSITION, [
      makeIncident('intermediate_a', firstDirection),
      makeIncident('intermediate_b', secondDirection)
    ])

    expect(result.boundary?.points).toHaveLength(4)
    expectFiniteGeometry(result)
  })

  it('preserves two collinear inner-wall incidents without creating a boundary', () => {
    const result = computeNodeGeometry(makeInnerNode(['intermediate_east', 'intermediate_west']), NODE_POSITION, [
      makeIncident('intermediate_east', newVec2(1, 0)),
      makeIncident('intermediate_west', newVec2(-1, 0))
    ])

    expect(result.boundary).toBeUndefined()
    expect(result.center).toEqual(NODE_POSITION)
    expect(result.incidentWalls.map(incident => incident.id)).toEqual(['intermediate_east', 'intermediate_west'])
  })

  it('creates a finite boundary for a three-way T junction', () => {
    const result = computeNodeGeometry(
      makeInnerNode(['intermediate_east', 'intermediate_north', 'intermediate_west']),
      NODE_POSITION,
      [
        makeIncident('intermediate_east', newVec2(1, 0)),
        makeIncident('intermediate_north', newVec2(0, 1)),
        makeIncident('intermediate_west', newVec2(-1, 0))
      ]
    )

    expect(result.boundary?.points.length).toBeGreaterThanOrEqual(4)
    expect(result.incidentWalls).toHaveLength(3)
    expectFiniteGeometry(result)
  })

  it('creates a finite boundary for a four-way cross junction', () => {
    const result = computeNodeGeometry(
      makeInnerNode(['intermediate_east', 'intermediate_north', 'intermediate_west', 'intermediate_south']),
      NODE_POSITION,
      [
        makeIncident('intermediate_east', newVec2(1, 0)),
        makeIncident('intermediate_north', newVec2(0, 1)),
        makeIncident('intermediate_west', newVec2(-1, 0)),
        makeIncident('intermediate_south', newVec2(0, -1))
      ]
    )

    expect(result.boundary?.points.length).toBeGreaterThanOrEqual(4)
    expect(result.incidentWalls.map(incident => incident.id).sort()).toEqual([
      'intermediate_east',
      'intermediate_north',
      'intermediate_south',
      'intermediate_west'
    ])
    expectFiniteGeometry(result)
  })

  it('handles mixed wall thicknesses at a cross junction', () => {
    const result = computeNodeGeometry(
      makeInnerNode(['intermediate_east', 'intermediate_north', 'intermediate_west', 'intermediate_south']),
      NODE_POSITION,
      [
        makeIncident('intermediate_east', newVec2(1, 0), 5),
        makeIncident('intermediate_north', newVec2(0, 1), 10),
        makeIncident('intermediate_west', newVec2(-1, 0), 7),
        makeIncident('intermediate_south', newVec2(0, -1), 12)
      ]
    )

    expect(result.boundary?.points.length).toBeGreaterThanOrEqual(4)
    expectFiniteGeometry(result)
    expect(result.incidentWalls.map(incident => incident.id).sort()).toEqual([
      'intermediate_east',
      'intermediate_north',
      'intermediate_south',
      'intermediate_west'
    ])
  })

  it('computes perimeter-node geometry from two perimeter rays and an intermediate branch', () => {
    const result = computeNodeGeometry(makePerimeterNode(['intermediate_north']), NODE_POSITION, [
      makeIncident('outwall_boundary', newVec2(1, 0), 5, 'end'),
      makeIncident('intermediate_north', newVec2(0, 1), 5),
      makeIncident('outwall_boundary', newVec2(-1, 0), 5, 'start')
    ]) as PerimeterWallNodeGeometry

    expect(result.position).toEqual(NODE_POSITION)
    expect(result.insideLine).toBeDefined()
    expect(result.outsideLine).toBeDefined()
    expect(distVec2(result.insideLine.start, result.insideLine.end)).toBeGreaterThan(0)
    expect(distVec2(result.outsideLine.start, result.outsideLine.end)).toBeGreaterThan(0)
    expect(result.incidentWalls).toHaveLength(3)
    expectFiniteGeometry(result)
  })

  it('handles multiple intermediate branches at a perimeter node', () => {
    const result = computeNodeGeometry(makePerimeterNode(['intermediate_ne', 'intermediate_nw']), NODE_POSITION, [
      makeIncident('outwall_boundary', newVec2(1, 0), 5, 'end'),
      makeIncident('intermediate_ne', newVec2(Math.SQRT1_2, Math.SQRT1_2), 6),
      makeIncident('intermediate_nw', newVec2(-Math.SQRT1_2, Math.SQRT1_2), 8),
      makeIncident('outwall_boundary', newVec2(-1, 0), 5, 'start')
    ]) as PerimeterWallNodeGeometry

    expect(result.position).toEqual(NODE_POSITION)
    expect(result.incidentWalls).toHaveLength(4)
    expect(result.insideLine).toBeDefined()
    expect(result.outsideLine).toBeDefined()
    expectFiniteGeometry(result)
  })

  it('keeps geometry finite for translated and rotated junctions', () => {
    const nodePosition = newVec2(1250, -730)
    const east = newVec2(Math.SQRT1_2, Math.SQRT1_2)
    const north = newVec2(-Math.SQRT1_2, Math.SQRT1_2)
    const translateIncident = (incident: WallNodeIncidentLine): WallNodeIncidentLine => ({
      ...incident,
      left: { ...incident.left, point: scaleAddVec2(incident.left.point, nodePosition, 1) },
      right: { ...incident.right, point: scaleAddVec2(incident.right.point, nodePosition, 1) }
    })

    const result = computeNodeGeometry(
      { ...makeInnerNode(['intermediate_a', 'intermediate_b']), position: nodePosition },
      nodePosition,
      [
        translateIncident(makeIncident('intermediate_a', east, 6)),
        translateIncident(makeIncident('intermediate_b', north, 9))
      ]
    )

    expect(result.boundary?.points).toHaveLength(4)
    expectFiniteGeometry(result)
    expect(Math.abs(result.center[0])).toBeGreaterThan(100)
    expect(Math.abs(result.center[1])).toBeGreaterThan(100)
  })
})
