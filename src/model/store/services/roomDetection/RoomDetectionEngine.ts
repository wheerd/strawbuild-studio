import type { WallId, PointId } from '@/types/ids'
import type { Point2D, Polygon2D } from '@/types/geometry'
import { createPoint2D, direction, isPointInPolygon } from '@/types/geometry'
import {
  type WallLoopTrace,
  type RoomSide,
  type RoomDefinition,
  type RoomBoundaryDefinition,
  type RoomDetectionGraph
} from './types'

/**
 * Core engine for room detection algorithms
 * Contains pure functions for geometric calculations and loop detection
 */
export class RoomDetectionEngine {
  /**
   * Find all minimal wall loops (potential rooms) on a floor
   */
  findMinimalWallLoops(graph: RoomDetectionGraph): WallLoopTrace[] {
    const loops: WallLoopTrace[] = []
    const processedEdges = new Set<string>()

    // Try to find loops starting from each edge
    for (const [startPointId, edges] of graph.edges) {
      for (const edge of edges) {
        const edgeKey = `${startPointId}->${edge.endPointId}:${edge.wallId}`
        if (processedEdges.has(edgeKey)) continue

        const loop = this.traceWallLoop(startPointId, edge.endPointId, graph)
        if (loop != null && loop.pointIds.length >= 3) {
          // Mark all edges in this loop as processed
          for (let i = 0; i < loop.pointIds.length; i++) {
            const currentPoint = loop.pointIds[i]
            const nextPoint = loop.pointIds[(i + 1) % loop.pointIds.length]
            const wallId = loop.wallIds[i]
            processedEdges.add(`${currentPoint}->${nextPoint}:${wallId}`)
          }
          loops.push(loop)
        }
      }
    }

    return loops
  }

  /**
   * Trace a wall loop starting from a given wall in a specific direction
   * Uses DFS with smallest angle selection to find minimal cycles
   */
  traceWallLoop(startPointId: PointId, endPointId: PointId, graph: RoomDetectionGraph): WallLoopTrace | null {
    const visited = new Set<PointId>()
    const wallsUsed = new Set<WallId>()
    const pointPath: PointId[] = [startPointId, endPointId]
    const wallPath: WallId[] = []

    // Find the wall connecting start and end points
    const startEdges = graph.edges.get(startPointId) ?? []
    const initialWall = startEdges.find(edge => edge.endPointId === endPointId)

    if (initialWall == null) {
      return null
    }

    wallPath.push(initialWall.wallId)
    wallsUsed.add(initialWall.wallId)
    visited.add(startPointId)

    const result = this.dfsTraceLoop(endPointId, startPointId, graph, visited, wallsUsed, pointPath, wallPath)

    if (result != null) {
      return {
        pointIds: result.pointPath,
        wallIds: result.wallPath
      }
    }

    return null
  }

  /**
   * DFS helper function for tracing wall loops
   */
  private dfsTraceLoop(
    currentPoint: PointId,
    targetPoint: PointId,
    graph: RoomDetectionGraph,
    visited: Set<PointId>,
    wallsUsed: Set<WallId>,
    pointPath: PointId[],
    wallPath: WallId[]
  ): { pointPath: PointId[], wallPath: WallId[] } | null {
    // If we've reached the target point and have at least 3 points, we found a cycle
    if (currentPoint === targetPoint && pointPath.length >= 3) {
      // Don't add the target point again since it's already at the start
      return { pointPath: [...pointPath], wallPath: [...wallPath] }
    }

    // Get available edges from current point
    const edges = graph.edges.get(currentPoint) ?? []
    const availableEdges = edges.filter(edge => {
      // Don't reuse walls
      if (wallsUsed.has(edge.wallId)) return false

      // Allow returning to start point if we have enough points for a cycle
      if (edge.endPointId === targetPoint && pointPath.length >= 3) return true

      // Don't visit already visited points
      return !visited.has(edge.endPointId)
    })

    if (availableEdges.length === 0) {
      return null
    }

    // Sort edges by angle (smallest angle first for minimal cycles)
    const sortedEdges = this.sortEdgesByAngle(currentPoint, pointPath, graph, availableEdges)

    // Try each edge in order (DFS with angle-based selection)
    for (const edge of sortedEdges) {
      const nextPoint = edge.endPointId

      // Mark as visited if not the target point
      const wasVisited = visited.has(nextPoint)
      if (nextPoint !== targetPoint) {
        visited.add(nextPoint)
      }

      wallsUsed.add(edge.wallId)
      wallPath.push(edge.wallId)

      // Only add the next point to path if it's not the target (to avoid duplication)
      if (nextPoint !== targetPoint) {
        pointPath.push(nextPoint)
      }

      const result = this.dfsTraceLoop(nextPoint, targetPoint, graph, visited, wallsUsed, pointPath, wallPath)

      if (result != null) {
        return result
      }

      // Backtrack
      if (nextPoint !== targetPoint) {
        pointPath.pop()
      }
      wallPath.pop()
      wallsUsed.delete(edge.wallId)

      if (!wasVisited && nextPoint !== targetPoint) {
        visited.delete(nextPoint)
      }
    }

    return null
  }

  /**
   * Sort edges by angle from the previous direction, selecting smallest angles first
   */
  private sortEdgesByAngle(
    currentPoint: PointId,
    pointPath: PointId[],
    graph: RoomDetectionGraph,
    edges: Array<{ endPointId: PointId, wallId: WallId }>
  ): Array<{ endPointId: PointId, wallId: WallId }> {
    if (pointPath.length < 2) {
      return edges
    }

    const currentPos = graph.points.get(currentPoint)
    const previousPoint = pointPath[pointPath.length - 2]
    const previousPos = graph.points.get(previousPoint)

    if (currentPos == null || previousPos == null) {
      return edges
    }

    // Calculate incoming direction
    const incomingAngle = Math.atan2(
      currentPos.y - previousPos.y,
      currentPos.x - previousPos.x
    )

    // Calculate angle for each outgoing edge and sort by smallest turn angle
    const edgesWithAngles = edges.map(edge => {
      const nextPos = graph.points.get(edge.endPointId)
      if (nextPos == null) {
        return { edge, angle: 0, turnAngle: Math.PI * 2 }
      }

      const outgoingAngle = Math.atan2(
        nextPos.y - currentPos.y,
        nextPos.x - currentPos.x
      )

      // Calculate turn angle (difference from incoming direction)
      let turnAngle = outgoingAngle - incomingAngle

      // Normalize to [0, 2π) - we want the smallest positive turn angle
      while (turnAngle < 0) turnAngle += 2 * Math.PI
      while (turnAngle >= 2 * Math.PI) turnAngle -= 2 * Math.PI

      return { edge, angle: outgoingAngle, turnAngle }
    })

    // Sort by turn angle (smallest first for minimal cycles)
    edgesWithAngles.sort((a, b) => a.turnAngle - b.turnAngle)

    return edgesWithAngles.map(item => item.edge)
  }

  toPolygon(traceWallLoop: WallLoopTrace, graph: RoomDetectionGraph): Polygon2D {
    const points: Point2D[] = []
    for (const pointId of traceWallLoop.pointIds) {
      const point = graph.points.get(pointId)
      if (point != null) {
        points.push(point)
      }
    }
    return { points }
  }

  /**
   * Determine which side of a wall a room should be on based on room geometry
   */
  determineRoomSide(boundary: RoomBoundaryDefinition, wallId: WallId, graph: RoomDetectionGraph): RoomSide {
    const wall = graph.walls.get(wallId)
    if (boundary.pointIds.length < 3 || wall === undefined) {
      return 'left'
    }

    // Calculate centroid of the boundary
    let centroidX = 0
    let centroidY = 0
    for (const pointId of boundary.pointIds) {
      const point = graph.points.get(pointId)
      if (point != null) {
        centroidX += point.x
        centroidY += point.y
      }
    }
    centroidX /= boundary.pointIds.length
    centroidY /= boundary.pointIds.length
    const centroid = createPoint2D(centroidX, centroidY)

    const wallStart = graph.points.get(wall.startPointId)
    const wallEnd = graph.points.get(wall.endPointId)
    if (wallStart == null || wallEnd == null) {
      return 'left'
    }
    const wallVector = direction(wallStart, wallEnd)
    const toCentroidVector = direction(wallStart, centroid)
    const crossProduct = wallVector.x * toCentroidVector.y - wallVector.y * toCentroidVector.x
    return crossProduct > 0 ? 'left' : 'right'
  }

  /**
   * Create a room definition from a wall loop
   */
  createRoomFromLoop(loop: WallLoopTrace, name: string, _graph: RoomDetectionGraph): RoomDefinition | null {
    if (loop.pointIds.length < 3 || loop.wallIds.length < 3) {
      return null
    }

    const outerBoundary: RoomBoundaryDefinition = {
      wallIds: [...loop.wallIds],
      pointIds: [...loop.pointIds]
    }

    return {
      name,
      outerBoundary,
      holes: [],
      interiorWallIds: []
    }
  }

  /**
   * Create a complete room definition with holes from multiple wall loops
   */
  createRoomWithHoles(outer: WallLoopTrace, holes: WallLoopTrace[], name: string, _graph: RoomDetectionGraph): RoomDefinition | null {
    if (outer.pointIds.length < 3 || outer.wallIds.length < 3) {
      return null
    }

    const outerBoundary: RoomBoundaryDefinition = {
      wallIds: [...outer.wallIds],
      pointIds: [...outer.pointIds]
    }

    const holeBoundaries: RoomBoundaryDefinition[] = holes.map(hole => ({
      wallIds: [...hole.wallIds],
      pointIds: [...hole.pointIds]
    }))

    return {
      name,
      outerBoundary,
      holes: holeBoundaries,
      interiorWallIds: []
    }
  }

  /**
   * Check if one wall loop is completely inside another
   */
  isLoopInsideLoop(outer: WallLoopTrace, inner: WallLoopTrace, graph: RoomDetectionGraph): boolean {
    const outerPolygon = this.toPolygon(outer, graph)

    // Check if all points of the inner loop are inside the outer polygon
    for (const pointId of inner.pointIds) {
      const point = graph.points.get(pointId)
      if (point == null || !isPointInPolygon(point, outerPolygon)) {
        return false
      }
    }

    return true
  }

  /**
   * Identify interior walls that are completely inside a room
   */
  findInteriorWalls(roomDefinition: RoomDefinition, graph: RoomDetectionGraph): WallId[] {
    const interiorWalls: WallId[] = []
    const boundaryWallIds = new Set([
      ...roomDefinition.outerBoundary.wallIds,
      ...roomDefinition.holes.flatMap(hole => hole.wallIds)
    ])

    const outerPolygon = this.toPolygon(roomDefinition.outerBoundary, graph)
    const holePolygons = roomDefinition.holes.map(hole => this.toPolygon(hole, graph))

    // Check all walls in the graph
    for (const [wallId, wall] of graph.walls) {
      // Skip boundary walls
      if (boundaryWallIds.has(wallId)) continue

      // Check if both wall endpoints are inside the room
      const startPoint = graph.points.get(wall.startPointId)
      const endPoint = graph.points.get(wall.endPointId)

      if (startPoint != null && endPoint != null &&
        isPointInPolygon(startPoint, outerPolygon) &&
        isPointInPolygon(endPoint, outerPolygon)) {
        // Also check that the wall doesn't cross any hole boundaries
        let isInsideHole = false
        for (const holePolygon of holePolygons) {
          if (isPointInPolygon(startPoint, holePolygon) ||
            isPointInPolygon(endPoint, holePolygon)) {
            isInsideHole = true
            break
          }
        }

        if (!isInsideHole) {
          interiorWalls.push(wallId)
        }
      }
    }

    return interiorWalls
  }
}
