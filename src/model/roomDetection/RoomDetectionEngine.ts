import type { ModelState, Wall, Room, Point } from '@/types/model'
import type { WallId, PointId, FloorId } from '@/types/ids'
import type { Point2D, Area } from '@/types/geometry'
import { calculatePolygonArea, createPoint2D } from '@/types/geometry'
import {
  type WallLoopTrace,
  type LoopDirection,
  type RoomSide,
  type RoomDefinition
} from './types'

/**
 * Core engine for room detection algorithms
 * Contains pure functions for geometric calculations and loop detection
 */
export class RoomDetectionEngine {
  constructor () {
  }

  /**
   * Find all wall loops (potential rooms) on a floor
   */
  findWallLoops (state: ModelState, floorId: FloorId): WallId[][] {
    const floor = state.floors.get(floorId)
    if (floor == null) return []

    const wallIds = floor.wallIds
    if (wallIds.length === 0) return []

    // Build adjacency map for wall connections at each point
    const wallConnections = new Map<PointId, WallId[]>()

    for (const wallId of wallIds) {
      const wall = state.walls.get(wallId)
      if (wall == null) continue

      if (!wallConnections.has(wall.startPointId)) {
        wallConnections.set(wall.startPointId, [])
      }
      if (!wallConnections.has(wall.endPointId)) {
        wallConnections.set(wall.endPointId, [])
      }

      wallConnections.get(wall.startPointId)?.push(wallId)
      wallConnections.get(wall.endPointId)?.push(wallId)
    }

    const faces: WallId[][] = []
    const usedEdges = new Set<string>()

    // For each wall, try to find the minimal face starting from each direction
    for (const startWallId of wallIds) {
      const startWall = state.walls.get(startWallId)
      if (startWall == null) continue

      // Try both directions: start->end and end->start
      const directions = [
        { from: startWall.startPointId, to: startWall.endPointId },
        { from: startWall.endPointId, to: startWall.startPointId }
      ]

      for (const { from, to } of directions) {
        const edgeKey = `${startWallId}:${from}->${to}`
        if (usedEdges.has(edgeKey)) continue

        const face = this.findMinimalFace(startWallId, from, to, wallConnections, state)
        if (face != null && face.length >= 3) {
          // Check if we already have this face (same walls, possibly different order)
          const sortedFace = [...face].sort()
          const isDuplicate = faces.some(existingFace => {
            const sortedExisting = [...existingFace].sort()
            return sortedExisting.length === sortedFace.length &&
              sortedExisting.every((wallId, index) => wallId === sortedFace[index])
          })

          if (!isDuplicate) {
            faces.push(face)
          }

          // Mark all edges in this face as used
          this.markFaceEdgesAsUsed(face, state, usedEdges)
        }
      }
    }

    // Filter to keep only interior faces (actual rooms)
    return this.filterInteriorFaces(faces, state)
  }

  /**
   * Trace a wall loop starting from a given wall in a specific direction
   */
  traceWallLoop (startWallId: WallId, direction: LoopDirection, state: ModelState): WallLoopTrace | null {
    const startWall = state.walls.get(startWallId)
    if (startWall == null) return null

    const wallIds: WallId[] = [startWallId]
    const pointIds: PointId[] = [startWall.startPointId]
    const visitedWalls = new Set<WallId>()

    let currentWallId = startWallId
    let currentPointId = startWall.endPointId

    // Keep tracing until we return to the start or get stuck
    while (true) {
      pointIds.push(currentPointId)

      // Add the current wall to visited BEFORE looking for the next one
      visitedWalls.add(currentWallId)

      const nextWallId = this.findNextWallInLoop(currentWallId, currentPointId, direction, state, visitedWalls, startWallId)

      if (nextWallId == null) {
        // Got stuck, not a complete loop
        return null
      }

      if (nextWallId === startWallId) {
        // Completed the loop!
        const area = this.calculateLoopArea(wallIds, state)
        return {
          wallIds,
          pointIds,
          isValid: true,
          area
        }
      }

      const nextWall = state.walls.get(nextWallId)
      if (nextWall == null) return null

      wallIds.push(nextWallId)

      // Move to the next point
      currentWallId = nextWallId
      currentPointId = nextWall.startPointId === currentPointId ? nextWall.endPointId : nextWall.startPointId

      // Safety check to prevent infinite loops
      if (wallIds.length > 100) {
        return null
      }
    }
  }

  /**
   * Validate if a room definition is geometrically valid
   */
  validateRoom (roomDef: RoomDefinition, state: ModelState): boolean {
    // Must have minimum number of walls
    if (roomDef.wallIds.length < 3) {
      return false
    }

    // Check if walls form a connected loop
    return this.isValidWallLoop(roomDef.wallIds, state)
  }

  /**
   * Determine which side of a wall a room should be on based on room geometry
   */
  determineRoomSide (roomDef: RoomDefinition, wall: Wall, state: ModelState): RoomSide {
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
  createRoomFromLoop (wallIds: WallId[], name: string, state: ModelState): RoomDefinition | null {
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
    state: ModelState
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
    const holes: Array<import('./types').RoomBoundaryDefinition> = []
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
  isLoopInsideLoop (innerWallIds: WallId[], outerWallIds: WallId[], state: ModelState): boolean {
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
  getLoopPolygonPoints (wallIds: WallId[], state: ModelState): Point2D[] {
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
  findInteriorWalls (roomDefinition: RoomDefinition, floorWallIds: WallId[], state: ModelState): WallId[] {
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
    state: ModelState
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
  findRoomsWithWall (state: ModelState, wallId: WallId): Room[] {
    const rooms: Room[] = []

    for (const room of state.rooms.values()) {
      if (room.wallIds.has(wallId)) {
        rooms.push(room)
      }
    }

    return rooms
  }

  // Private helper methods

  private findMinimalFace (
    startWallId: WallId,
    _startFrom: PointId,
    startTo: PointId,
    wallConnections: Map<PointId, WallId[]>,
    state: ModelState
  ): WallId[] | null {
    const face: WallId[] = [startWallId]
    let currentPoint = startTo
    let previousWall = startWallId

    while (face.length < 20) { // Prevent infinite loops
      const connectedWalls = wallConnections.get(currentPoint) ?? []
      if (connectedWalls.length < 2) return null // Dead end

      // Find the next wall by taking the rightmost turn (clockwise)
      let nextWall: WallId | null = null
      let bestAngle = -Math.PI * 2

      const currentWall = state.walls.get(previousWall)
      if (currentWall == null) return null

      // Direction we came from
      const prevPoint = currentWall.startPointId === currentPoint ? currentWall.endPointId : currentWall.startPointId
      const prevPointPos = state.points.get(prevPoint)
      const currentPointPos = state.points.get(currentPoint)
      if (prevPointPos == null || currentPointPos == null) return null

      const incomingAngle = Math.atan2(
        currentPointPos.position.y - prevPointPos.position.y,
        currentPointPos.position.x - prevPointPos.position.x
      )

      for (const wallId of connectedWalls) {
        if (wallId === previousWall) continue // Don't go back

        const wall = state.walls.get(wallId)
        if (wall == null) continue

        const otherPoint = wall.startPointId === currentPoint ? wall.endPointId : wall.startPointId
        const otherPointPos = state.points.get(otherPoint)
        if (otherPointPos == null) continue

        const outgoingAngle = Math.atan2(
          otherPointPos.position.y - currentPointPos.position.y,
          otherPointPos.position.x - currentPointPos.position.x
        )

        // Calculate the angle difference (turn angle)
        let turnAngle = outgoingAngle - incomingAngle
        while (turnAngle <= -Math.PI) turnAngle += 2 * Math.PI
        while (turnAngle > Math.PI) turnAngle -= 2 * Math.PI

        // We want the rightmost turn (most clockwise, which is the smallest turn angle)
        if (turnAngle > bestAngle) {
          bestAngle = turnAngle
          nextWall = wallId
        }
      }

      if (nextWall == null) return null

      // Check if we've completed the face
      if (nextWall === startWallId) {
        return face
      }

      // Check if we've hit another wall in our path (not a minimal face)
      if (face.includes(nextWall)) {
        return null
      }

      face.push(nextWall)
      previousWall = nextWall

      const nextWallObj = state.walls.get(nextWall)
      if (nextWallObj == null) return null
      currentPoint = nextWallObj.startPointId === currentPoint ? nextWallObj.endPointId : nextWallObj.startPointId
    }

    return null
  }

  private findNextWallInLoop (
    currentWallId: WallId,
    currentPointId: PointId,
    direction: LoopDirection,
    state: ModelState,
    visitedWalls: Set<WallId>,
    startWallId?: WallId
  ): WallId | null {
    const currentWall = state.walls.get(currentWallId)
    const currentPoint = state.points.get(currentPointId)

    if (currentWall == null || currentPoint == null) {
      return null
    }

    // Get all walls connected to this point
    const allConnectedWalls = Array.from(state.walls.values()).filter(wall =>
      wall.startPointId === currentPointId || wall.endPointId === currentPointId
    )

    // Filter out the current wall and visited walls, but allow start wall for completion
    const connectedWalls = allConnectedWalls.filter(wall => {
      if (wall.id === currentWallId) return false

      if (wall.id === startWallId && startWallId !== currentWallId) {
        return true // Allow start wall to complete loop
      }

      return !visitedWalls.has(wall.id)
    })

    if (connectedWalls.length === 0) {
      return null
    }

    if (connectedWalls.length === 1) {
      return connectedWalls[0].id
    }

    // Calculate direction-based selection
    const otherPointId = currentWall.startPointId === currentPointId ? currentWall.endPointId : currentWall.startPointId
    const otherPoint = state.points.get(otherPointId)
    if (otherPoint == null) return null

    const currentWallVector = {
      x: currentPoint.position.x - otherPoint.position.x,
      y: currentPoint.position.y - otherPoint.position.y
    }

    let bestWall: WallId | null = null
    let bestAngle = direction === 'left' ? -Math.PI * 2 : Math.PI * 2

    for (const wall of connectedWalls) {
      const nextPointId = wall.startPointId === currentPointId ? wall.endPointId : wall.startPointId
      const nextPoint = state.points.get(nextPointId)
      if (nextPoint == null) continue

      const wallVector = {
        x: nextPoint.position.x - currentPoint.position.x,
        y: nextPoint.position.y - currentPoint.position.y
      }

      // Calculate angle between current wall direction and this wall
      const angle = Math.atan2(
        currentWallVector.x * wallVector.y - currentWallVector.y * wallVector.x,
        currentWallVector.x * wallVector.x + currentWallVector.y * wallVector.y
      )

      if (direction === 'left') {
        // Take the most counter-clockwise (leftmost) path
        if (angle > bestAngle) {
          bestAngle = angle
          bestWall = wall.id
        }
      } else {
        // Take the most clockwise (rightmost) path
        if (angle < bestAngle) {
          bestAngle = angle
          bestWall = wall.id
        }
      }
    }

    return bestWall
  }

  private isValidWallLoop (wallIds: WallId[], state: ModelState): boolean {
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
      const connectedWalls = (pointToWalls.get(currentPoint) != null) || []
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

  private markFaceEdgesAsUsed (face: WallId[], state: ModelState, usedEdges: Set<string>): void {
    for (let i = 0; i < face.length; i++) {
      const wallId = face[i]
      const wall = state.walls.get(wallId)
      if (wall == null) continue

      const nextWallId = face[(i + 1) % face.length]
      const nextWall = state.walls.get(nextWallId)
      if (nextWall == null) continue

      // Find shared point between current and next wall
      let sharedPoint: PointId | null = null
      if (wall.endPointId === nextWall.startPointId) sharedPoint = wall.endPointId
      else if (wall.endPointId === nextWall.endPointId) sharedPoint = wall.endPointId
      else if (wall.startPointId === nextWall.startPointId) sharedPoint = wall.startPointId
      else if (wall.startPointId === nextWall.endPointId) sharedPoint = wall.startPointId

      if (sharedPoint != null) {
        const edgeFrom = wall.startPointId === sharedPoint ? wall.endPointId : wall.startPointId
        usedEdges.add(`${wallId}:${edgeFrom}->${sharedPoint}`)
      }
    }
  }

  private filterInteriorFaces (faces: WallId[][], state: ModelState): WallId[][] {
    if (faces.length <= 1) return faces

    // Sort faces by area - smaller faces are more likely to be interior rooms
    const facesWithAreas = faces.map(face => ({
      face,
      area: this.calculateFaceArea(face, state)
    })).filter(item => item.area > 0)

    facesWithAreas.sort((a, b) => a.area - b.area)

    // For smaller projects, return all valid faces
    // TODO: Implement more sophisticated interior/exterior detection for complex cases
    return facesWithAreas.map(item => item.face)
  }

  private calculateFaceArea (wallIds: WallId[], state: ModelState): number {
    const points = this.getFacePolygonPoints(wallIds, state)
    if (points.length < 3) return 0

    return Number(calculatePolygonArea({ points }))
  }

  private getFacePolygonPoints (wallIds: WallId[], state: ModelState): Point2D[] {
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

  private calculateLoopArea (wallIds: WallId[], state: ModelState): Area | undefined {
    const points = this.getFacePolygonPoints(wallIds, state)
    if (points.length < 3) return undefined

    return calculatePolygonArea({ points })
  }

  private extractOrderedPointsFromWalls (wallIds: WallId[], state: ModelState): PointId[] {
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
