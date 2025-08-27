import type { Wall, Room, Point } from '@/types/model'
import type { WallId, PointId } from '@/types/ids'
import type { Point2D } from '@/types/geometry'
import { createPoint2D } from '@/types/geometry'
import {
  type WallLoopTrace,
  type RoomSide,
  type RoomDefinition,
  type RoomBoundaryDefinition,
  type RoomDetectionGraph
} from './types'
import type { StoreState } from '@/model'

/**
 * Core engine for room detection algorithms
 * Contains pure functions for geometric calculations and loop detection
 */
export class RoomDetectionEngine {
  constructor () {
  }

  /**
   * Find all minimal wall loops (potential rooms) on a floor
   */
  findMinimalWallLoops (graph: RoomDetectionGraph): WallLoopTrace[] {
    const loops: WallLoopTrace[] = []
    const processedEdges = new Set<string>()

    // Try to find loops starting from each edge
    for (const [startPointId, edges] of graph.edges) {
      for (const edge of edges) {
        const edgeKey = `${startPointId}->${edge.endPointId}:${edge.wallId}`
        if (processedEdges.has(edgeKey)) continue

        const loop = this.traceWallLoop(startPointId, edge.endPointId, graph)
        if (loop && loop.pointIds.length >= 3) {
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
  traceWallLoop (startPointId: PointId, endPointId: PointId, graph: RoomDetectionGraph): WallLoopTrace | null {
    const visited = new Set<PointId>()
    const wallsUsed = new Set<WallId>()
    const pointPath: PointId[] = [startPointId, endPointId]
    const wallPath: WallId[] = []

    // Find the wall connecting start and end points
    const startEdges = graph.edges.get(startPointId) ?? []
    const initialWall = startEdges.find(edge => edge.endPointId === endPointId)
    
    if (!initialWall) {
      return null
    }

    wallPath.push(initialWall.wallId)
    wallsUsed.add(initialWall.wallId)
    visited.add(startPointId)

    const result = this.dfsTraceLoop(endPointId, startPointId, graph, visited, wallsUsed, pointPath, wallPath)
    
    if (result) {
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
  private dfsTraceLoop (
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
      
      if (result) {
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
  private sortEdgesByAngle (
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

    if (!currentPos || !previousPos) {
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
      if (!nextPos) {
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

  /**
   * Determine which side of a wall a room should be on based on room geometry
   */
  determineRoomSide (roomDef: RoomDefinition, wall: Wall, state: StoreState): RoomSide {
    // Get wall direction vector (start -> end)
    const startPoint = state.points.get(wall.startPointId)
    const endPoint = state.points.get(wall.endPointId)

    if (startPoint == null || endPoint == null || roomDef.outerBoundary.pointIds.length === 0) {
      return 'left' // Default fallback
    }

    // Get all room points that are NOT on the wall (from outer boundary first)
    const roomPoints = roomDef.outerBoundary.pointIds
      .filter(pointId => pointId !== wall.startPointId && pointId !== wall.endPointId)
      .map(id => state.points.get(id))
      .filter((p): p is Point => p !== undefined)
      .map(p => p.position)

    if (roomPoints.length === 0) {
      // If no other points in outer boundary, fall back to checking all points or centroid
      const allRoomPoints = roomDef.outerBoundary.pointIds
        .map(id => state.points.get(id))
        .filter((p): p is Point => p !== undefined)
        .map(p => p.position)

      if (allRoomPoints.length === 0) return 'left'

      // Use centroid of all room points
      const centroidX = allRoomPoints.reduce((sum, p) => sum + p.x, 0) / allRoomPoints.length
      const centroidY = allRoomPoints.reduce((sum, p) => sum + p.y, 0) / allRoomPoints.length
      roomPoints.push(createPoint2D(centroidX, centroidY))
    }

    // Take the first room point (or use centroid if needed) to determine side
    const testPoint = roomPoints[0]

    const wallVector = {
      x: endPoint.position.x - startPoint.position.x,
      y: endPoint.position.y - startPoint.position.y
    }

    // Vector from wall start to test point
    const toTestPoint = {
      x: testPoint.x - startPoint.position.x,
      y: testPoint.y - startPoint.position.y
    }

    // Cross product to determine which side of the wall the point is on
    // Positive cross product means point is to the left of wall direction
    const crossProduct = wallVector.x * toTestPoint.y - wallVector.y * toTestPoint.x

    return crossProduct > 0 ? 'left' : 'right'
  }

  /**
   * Create a room definition from a wall loop
   */
  createRoomFromLoop (wallIds: WallId[], name: string, state: StoreState): RoomDefinition | null {
    if (!this.isValidWallLoop(wallIds, state)) {
      return null
    }

    const pointIds = this.extractOrderedPointsFromWalls(wallIds, state)
    if (pointIds.length === 0) {
      return null
    }

    return {
      name,
      wallIds,
      outerBoundary: {
        wallIds,
        pointIds
      },
      holes: [],
      interiorWallIds: []
    }
  }

  /**
   * Create a complete room definition with holes from multiple wall loops
   */
  createRoomWithHoles (
    outerWallIds: WallId[],
    holeWallIds: WallId[][],
    name: string,
    state: StoreState
  ): RoomDefinition | null {
    // Validate outer boundary
    if (!this.isValidWallLoop(outerWallIds, state)) {
      return null
    }

    const outerPointIds = this.extractOrderedPointsFromWalls(outerWallIds, state)
    if (outerPointIds.length === 0) {
      return null
    }

    // Process holes
    const holes: RoomBoundaryDefinition[] = []
    const allWallIds = [...outerWallIds]

    for (const holeWalls of holeWallIds) {
      if (!this.isValidWallLoop(holeWalls, state)) {
        continue // Skip invalid holes
      }

      const holePointIds = this.extractOrderedPointsFromWalls(holeWalls, state)
      if (holePointIds.length === 0) {
        continue
      }

      // Verify hole is inside the outer boundary
      if (this.isLoopInsideLoop(holeWalls, outerWallIds, state)) {
        holes.push({
          wallIds: holeWalls,
          pointIds: holePointIds
        })
        allWallIds.push(...holeWalls)
      }
    }

    return {
      name,
      wallIds: allWallIds,
      outerBoundary: {
        wallIds: outerWallIds,
        pointIds: outerPointIds
      },
      holes,
      interiorWallIds: []
    }
  }

  /**
   * Check if one wall loop is completely inside another
   */
  isLoopInsideLoop (innerWallIds: WallId[], outerWallIds: WallId[], state: StoreState): boolean {
    const innerPoints = this.getLoopPolygonPoints(innerWallIds, state)
    const outerPoints = this.getLoopPolygonPoints(outerWallIds, state)

    if (innerPoints.length < 3 || outerPoints.length < 3) {
      return false
    }

    // Check if all inner points are inside the outer polygon
    return innerPoints.every(point => this.isPointInPolygon(point, outerPoints))
  }

  /**
   * Get polygon points for a wall loop
   */
  getLoopPolygonPoints (wallIds: WallId[], state: StoreState): Point2D[] {
    return this.getFacePolygonPoints(wallIds, state)
  }

  /**
   * Point-in-polygon test using ray casting algorithm
   */
  private isPointInPolygon (point: Point2D, polygon: Point2D[]): boolean {
    let inside = false

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const pi = polygon[i]
      const pj = polygon[j]

      if (((pi.y > point.y) !== (pj.y > point.y)) &&
        (point.x < (pj.x - pi.x) * (point.y - pi.y) / (pj.y - pi.y) + pi.x)) {
        inside = !inside
      }
    }

    return inside
  }

  /**
   * Identify interior walls that are completely inside a room
   */
  findInteriorWalls (roomDefinition: RoomDefinition, floorWallIds: WallId[], state: StoreState): WallId[] {
    const interiorWalls: WallId[] = []

    // Get room polygon (outer boundary minus holes)
    const outerPoints = this.getLoopPolygonPoints(roomDefinition.outerBoundary.wallIds, state)
    if (outerPoints.length < 3) return []

    // Get hole polygons
    const holePolygons = roomDefinition.holes.map(hole =>
      this.getLoopPolygonPoints(hole.wallIds, state)
    ).filter(points => points.length >= 3)

    // Check each wall on the floor
    for (const wallId of floorWallIds) {
      // Skip if wall is already part of room boundaries
      if (roomDefinition.wallIds.includes(wallId)) continue

      const wall = state.walls.get(wallId)
      if (wall == null) continue

      // Check if wall is completely inside the room
      if (this.isWallInsideRoom(wall, outerPoints, holePolygons, state)) {
        interiorWalls.push(wallId)
      }
    }

    return interiorWalls
  }

  /**
   * Check if a wall is completely inside a room (considering holes)
   */
  private isWallInsideRoom (
    wall: Wall,
    outerPolygon: Point2D[],
    holePolygons: Point2D[][],
    state: StoreState
  ): boolean {
    const startPoint = state.points.get(wall.startPointId)
    const endPoint = state.points.get(wall.endPointId)

    if (startPoint == null || endPoint == null) return false

    // Check if both endpoints are inside the outer boundary
    const startInOuter = this.isPointInPolygon(startPoint.position, outerPolygon)
    const endInOuter = this.isPointInPolygon(endPoint.position, outerPolygon)

    if (!startInOuter || !endInOuter) return false

    // Check if wall is NOT inside any holes
    for (const holePolygon of holePolygons) {
      const startInHole = this.isPointInPolygon(startPoint.position, holePolygon)
      const endInHole = this.isPointInPolygon(endPoint.position, holePolygon)

      if (startInHole || endInHole) return false
    }

    // Additional check: wall midpoint should also be inside room
    const midpoint = createPoint2D(
      (startPoint.position.x + endPoint.position.x) / 2,
      (startPoint.position.y + endPoint.position.y) / 2
    )

    const midInOuter = this.isPointInPolygon(midpoint, outerPolygon)
    if (!midInOuter) return false

    for (const holePolygon of holePolygons) {
      const midInHole = this.isPointInPolygon(midpoint, holePolygon)
      if (midInHole) return false
    }

    return true
  }

  /**
   * Find rooms that contain a specific wall
   */
  findRoomsWithWall (state: StoreState, wallId: WallId): Room[] {
    const rooms: Room[] = []

    for (const room of state.rooms.values()) {
      const outerBoundaryHasWall = room.outerBoundary.wallIds.has(wallId)
      const holesHaveWall = room.holes.some(hole => hole.wallIds.has(wallId))
      const interiorHasWall = room.interiorWallIds.has(wallId)
      
      if (outerBoundaryHasWall || holesHaveWall || interiorHasWall) {
        rooms.push(room)
      }
    }

    return rooms
  }

  // Private helper methods



  private isValidWallLoop (wallIds: WallId[], state: StoreState): boolean {
    if (wallIds.length < 3) return false

    // Build connectivity map
    const pointToWalls = new Map<PointId, WallId[]>()

    for (const wallId of wallIds) {
      const wall = state.walls.get(wallId)
      if (wall == null) return false

      if (!pointToWalls.has(wall.startPointId)) {
        pointToWalls.set(wall.startPointId, [])
      }
      if (!pointToWalls.has(wall.endPointId)) {
        pointToWalls.set(wall.endPointId, [])
      }

      pointToWalls.get(wall.startPointId)?.push(wallId)
      pointToWalls.get(wall.endPointId)?.push(wallId)
    }

    // Each point should connect to exactly 2 walls (for a closed loop)
    for (const [, connectedWalls] of pointToWalls) {
      if (connectedWalls.length !== 2) {
        return false
      }
    }

    // Check if all walls are connected in a single loop
    const visited = new Set<WallId>()
    const startWallId = wallIds[0]
    let currentWallId = startWallId
    let currentPoint = state.walls.get(startWallId)?.startPointId

    if (currentPoint == null) return false

    while (true) {
      visited.add(currentWallId)

      // Find the next wall connected to the current point
      const connectedWalls = pointToWalls.get(currentPoint) ?? []
      const nextWallId = connectedWalls.find(wId => wId !== currentWallId && !visited.has(wId))

      if (nextWallId == null) {
        // No unvisited wall - check if we've visited all walls and can return to start
        if (visited.size === wallIds.length && connectedWalls.includes(startWallId)) {
          return true
        }
        return false
      }

      const nextWall = state.walls.get(nextWallId)
      if (nextWall == null) return false

      // Move to the other end of the next wall
      currentPoint = nextWall.startPointId === currentPoint ? nextWall.endPointId : nextWall.startPointId
      currentWallId = nextWallId

      // Safety check
      if (visited.size > wallIds.length) return false
    }
  }

  private getFacePolygonPoints (wallIds: WallId[], state: StoreState): Point2D[] {
    if (wallIds.length === 0) return []

    const points: Point2D[] = []

    for (let i = 0; i < wallIds.length; i++) {
      const currentWall = state.walls.get(wallIds[i])
      const nextWall = state.walls.get(wallIds[(i + 1) % wallIds.length])

      if (currentWall == null || nextWall == null) continue

      // Find connection point between current and next wall
      let connectionPoint: PointId | null = null

      if (currentWall.endPointId === nextWall.startPointId) {
        connectionPoint = currentWall.endPointId
      } else if (currentWall.endPointId === nextWall.endPointId) {
        connectionPoint = currentWall.endPointId
      } else if (currentWall.startPointId === nextWall.startPointId) {
        connectionPoint = currentWall.startPointId
      } else if (currentWall.startPointId === nextWall.endPointId) {
        connectionPoint = currentWall.startPointId
      }

      if (connectionPoint != null) {
        const point = state.points.get(connectionPoint)
        if (point != null) {
          points.push(point.position)
        }
      }
    }

    return points
  }

  private extractOrderedPointsFromWalls (wallIds: WallId[], state: StoreState): PointId[] {
    if (wallIds.length === 0) return []

    const points: PointId[] = []

    for (let i = 0; i < wallIds.length; i++) {
      const currentWall = state.walls.get(wallIds[i])
      const nextWall = state.walls.get(wallIds[(i + 1) % wallIds.length])

      if (currentWall == null || nextWall == null) continue

      // Find connection point
      let connectionPoint: PointId | null = null

      if (currentWall.endPointId === nextWall.startPointId) {
        connectionPoint = currentWall.endPointId
      } else if (currentWall.endPointId === nextWall.endPointId) {
        connectionPoint = currentWall.endPointId
      } else if (currentWall.startPointId === nextWall.startPointId) {
        connectionPoint = currentWall.startPointId
      } else if (currentWall.startPointId === nextWall.endPointId) {
        connectionPoint = currentWall.startPointId
      }

      if (connectionPoint != null) {
        points.push(connectionPoint)
      }
    }

    return points
  }
}
