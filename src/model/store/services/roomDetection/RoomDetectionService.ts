import type { WallId, FloorId, PointId, RoomId } from '@/types/ids'
import type { Vec2, Polygon2D } from '@/types/geometry'
import { distance, isPointInPolygon } from '@/types/geometry'
import type { StoreState, StoreActions } from '../../types'
import { useModelStore } from '../..'
import { RoomDetectionEngine } from './RoomDetectionEngine'
import type { RoomDetectionGraph, RoomDefinition, RoomBoundaryDefinition } from './types'
import type { Room, Wall } from '@/types/model'

export interface IRoomDetectionService {
  // Room detection operations
  detectRooms: (floorId: FloorId) => void
  detectRoomAtPoint: (floorId: FloorId, point: Vec2) => void

  // Room merging and splitting
  updateRoomsAfterWallRemoval: (removedWall: Wall) => void
  updateRoomsAfterWallAddition: (floorId: FloorId, addedWallId: WallId) => void

  // Configuration
  setAutoDetectionEnabled: (enabled: boolean) => void
  isAutoDetectionEnabled: () => boolean
}

export class RoomDetectionService implements IRoomDetectionService {
  private autoDetectionEnabled: boolean = true
  private readonly get: () => StoreState & StoreActions
  private readonly engine: RoomDetectionEngine

  constructor(get: () => StoreState & StoreActions, _set: (partial: Partial<StoreState & StoreActions>) => void) {
    this.get = get
    // _set is kept for future use but not stored as instance variable
    this.autoDetectionEnabled = true
    this.engine = new RoomDetectionEngine()
  }

  setAutoDetectionEnabled(enabled: boolean): void {
    this.autoDetectionEnabled = enabled
  }

  isAutoDetectionEnabled(): boolean {
    return this.autoDetectionEnabled
  }

  detectRooms(floorId: FloorId): void {
    // Always detect rooms, even if auto-detection is disabled
    const store = this.get()
    const graph = this.buildRoomDetectionGraph(floorId)

    // Find all minimal wall loops (potential rooms)
    const loops = this.engine.findMinimalWallLoops(graph)

    // Get existing rooms on this floor to avoid duplicates and generate proper names
    const existingRooms = Array.from(store.rooms.values()).filter(room => room.floorId === floorId)

    // Convert existing rooms to comparable format
    const existingRoomBoundaries = existingRooms.map(room => ({
      room,
      pointIds: new Set(room.outerBoundary.pointIds)
    }))

    // Create room definitions from detected loops
    const newRoomDefinitions: RoomDefinition[] = []

    loops.forEach(loop => {
      const loopPointIds = new Set(loop.pointIds)

      // Check if this loop matches an existing room (compare only point IDs)
      const existingRoom = existingRoomBoundaries.find(existing =>
        this.areBoundariesEqual(loopPointIds, existing.pointIds)
      )

      // Only add if it doesn't already exist
      if (existingRoom == null) {
        const roomName = this.generateUniqueRoomName(existingRooms, newRoomDefinitions)
        const roomDefinition = this.engine.createRoomFromLoop(loop, roomName, graph)

        if (roomDefinition !== null) {
          newRoomDefinitions.push(roomDefinition)
        }
      }
    })

    // Create only the new rooms
    newRoomDefinitions.forEach(definition => {
      this.createRoomFromDefinition(definition, floorId)
    })
  }

  detectRoomAtPoint(floorId: FloorId, point: Vec2): void {
    if (!this.autoDetectionEnabled) return

    const graph = this.buildRoomDetectionGraph(floorId)

    // Find the nearest point in the graph
    let nearestPointId: PointId | null = null
    let minDistance = Infinity

    for (const [pointId, graphPoint] of graph.points) {
      const dist = distance(point, graphPoint)
      if (dist < minDistance) {
        minDistance = dist
        nearestPointId = pointId
      }
    }

    if (nearestPointId == null) return

    // Try to find a room loop starting from this point
    const edges = graph.edges.get(nearestPointId)
    if (edges == null || edges.length === 0) return

    // Try tracing from the first available edge
    const firstEdge = edges[0]
    const loop = this.engine.traceWallLoop(nearestPointId, firstEdge.endPointId, graph)

    if (loop !== null) {
      const roomName = 'Detected Room'
      const roomDefinition = this.engine.createRoomFromLoop(loop, roomName, graph)

      if (roomDefinition !== null) {
        this.createRoomFromDefinition(roomDefinition, floorId)
      }
    }
  }

  updateRoomsAfterWallRemoval(removedWall: Wall): void {
    if (!this.autoDetectionEnabled) return

    const store = this.get()
    if (removedWall.leftRoomId === removedWall.rightRoomId) {
      // If both sides of the removed wall referenced the same room, it must be an interior wall
      const affectedRoomId = removedWall.leftRoomId
      if (affectedRoomId) {
        store.removeInteriorWallFromRoom(affectedRoomId, removedWall.id)
      }
    }

    if (removedWall.leftRoomId && removedWall.rightRoomId && removedWall.leftRoomId !== removedWall.rightRoomId) {
      // If the removed wall separated two different rooms, we need to merge them
      const leftRoomId = removedWall.leftRoomId
      const rightRoomId = removedWall.rightRoomId

      const leftRoom = store.rooms.get(leftRoomId)
      const rightRoom = store.rooms.get(rightRoomId)

      if (leftRoom && rightRoom) {
        this.mergeRoomWithRemovedWall(removedWall, leftRoom, rightRoom, store, leftRoomId, rightRoomId)
      }
    } else if (removedWall.leftRoomId) {
      const roomId = removedWall.leftRoomId
      this.cleanupRoomReferences([roomId])
      store.removeRoom(roomId)
    } else if (removedWall.rightRoomId) {
      const roomId = removedWall.rightRoomId
      this.cleanupRoomReferences([removedWall.rightRoomId])
      store.removeRoom(roomId)
    }
  }

  private mergeRoomWithRemovedWall(
    removedWall: Wall,
    leftRoom: Room,
    rightRoom: Room,
    store: StoreState & StoreActions,
    leftRoomId: RoomId,
    rightRoomId: RoomId
  ) {
    const leftRoomPoints = this.shiftPointsByRemoving(
      leftRoom.outerBoundary.pointIds,
      removedWall.startPointId,
      removedWall.endPointId
    )
    const rightRoomPoints = this.shiftPointsByRemoving(
      rightRoom.outerBoundary.pointIds,
      removedWall.startPointId,
      removedWall.endPointId
    )

    if (leftRoomPoints[0] !== rightRoomPoints[rightRoomPoints.length - 1]) {
      throw new Error('Invalid room boundaries after wall removal')
    }
    if (rightRoomPoints[0] !== leftRoomPoints[leftRoomPoints.length - 1]) {
      throw new Error('Invalid room boundaries after wall removal')
    }

    // Check if there are wall fragments left that are now interior walls
    const interiorWallPointPairs: Array<{ start: PointId; end: PointId }> = []
    while (
      leftRoomPoints.length > 2 &&
      rightRoomPoints.length > 2 &&
      leftRoomPoints[1] === rightRoomPoints[rightRoomPoints.length - 2]
    ) {
      interiorWallPointPairs.push({ start: leftRoomPoints[0], end: leftRoomPoints[1] })
      leftRoomPoints.shift()
      rightRoomPoints.pop()
    }
    while (
      leftRoomPoints.length > 2 &&
      rightRoomPoints.length > 2 &&
      rightRoomPoints[1] === leftRoomPoints[leftRoomPoints.length - 2]
    ) {
      interiorWallPointPairs.push({ start: rightRoomPoints[0], end: rightRoomPoints[1] })
      rightRoomPoints.shift()
      leftRoomPoints.pop()
    }
    if (leftRoomPoints[0] !== rightRoomPoints[rightRoomPoints.length - 1]) {
      throw new Error('Invalid room boundaries after wall removal')
    }
    if (rightRoomPoints[0] !== leftRoomPoints[leftRoomPoints.length - 1]) {
      throw new Error('Invalid room boundaries after wall removal')
    }

    const combinedOuterPoints = [...leftRoomPoints.slice(1), ...rightRoomPoints.slice(1)]
    const allOriginalWalls = Array.from(
      new Set([...leftRoom.outerBoundary.wallIds, ...rightRoom.outerBoundary.wallIds])
    )
      .map(id => store.walls.get(id))
      .filter(wall => wall) as Wall[]

    const newOuterWallIds = allOriginalWalls
      .filter(wall => {
        if (wall.id === removedWall.id) return false
        if (combinedOuterPoints.indexOf(wall.startPointId) === -1) return false
        if (combinedOuterPoints.indexOf(wall.endPointId) === -1) return false
        return true
      })
      .map(wall => wall.id)

    const newInteriorWallIds = allOriginalWalls
      .filter(wall => {
        if (wall.id === removedWall.id) return false
        for (const pair of interiorWallPointPairs) {
          if (
            (wall.startPointId === pair.start && wall.endPointId === pair.end) ||
            (wall.startPointId === pair.end && wall.endPointId === pair.start)
          ) {
            return true
          }
        }
        return false
      })
      .map(wall => wall.id)

    // Create a new room definition for the merged room
    const mergedRoomDefinition: RoomDefinition = {
      name: leftRoom.name, // Keep the name of the left room
      outerBoundary: {
        wallIds: newOuterWallIds,
        pointIds: combinedOuterPoints
      },
      holes: [
        ...leftRoom.holes.map(hole => ({
          wallIds: [...hole.wallIds],
          pointIds: [...hole.pointIds]
        })),
        ...rightRoom.holes.map(hole => ({
          wallIds: [...hole.wallIds],
          pointIds: [...hole.pointIds]
        }))
      ],
      interiorWallIds: [...newInteriorWallIds, ...leftRoom.interiorWallIds, ...rightRoom.interiorWallIds]
    }

    // Clean up references from both rooms before merging
    this.cleanupRoomReferences([leftRoomId, rightRoomId])

    // Remove both original rooms
    store.removeRoom(leftRoomId)
    store.removeRoom(rightRoomId)

    // Create the merged room
    this.createRoomFromDefinition(mergedRoomDefinition, removedWall.floorId)
  }

  private shiftPointsByRemoving(cycle: PointId[], startPointId: PointId, endPointId: PointId): PointId[] {
    const startIndex = cycle.indexOf(startPointId)
    const endIndex = cycle.indexOf(endPointId)

    if (startIndex === -1 || endIndex === -1) {
      throw new Error('Start or end point not found in cycle')
    }

    // Determine the order of points in the array
    let splitIndex: number
    if ((startIndex + 1) % cycle.length === endIndex) {
      // startPointId comes before endPointId
      splitIndex = startIndex
    } else if ((endIndex + 1) % cycle.length === startIndex) {
      // endPointId comes before startPointId
      splitIndex = endIndex
    } else {
      throw new Error('Start and end points are not adjacent in cycle')
    }

    return [...cycle.slice(splitIndex + 1), ...cycle.slice(0, splitIndex + 1)]
  }

  updateRoomsAfterWallAddition(floorId: FloorId, addedWallId: WallId): void {
    const store = this.get()
    const wall = store.walls.get(addedWallId)

    if (wall == null) return

    const startPoint = store.points.get(wall.startPointId)
    const endPoint = store.points.get(wall.endPointId)

    let splitRoom: Room | null = null
    if (startPoint !== undefined && endPoint !== undefined) {
      for (const roomId of startPoint.roomIds) {
        if (endPoint.roomIds.has(roomId)) {
          const room = store.rooms.get(roomId)
          if (room !== undefined) {
            if (
              room.outerBoundary.pointIds.indexOf(wall.startPointId) !== -1 &&
              room.outerBoundary.pointIds.indexOf(wall.endPointId) !== -1
            ) {
              splitRoom = room
              break
            }
          }
        }
      }
    }

    if (splitRoom) {
      // Always split rooms when a wall would make them invalid, regardless of auto-detection setting
      this.splitRoomAfterWallAddition(wall, splitRoom, store)
    } else if (this.autoDetectionEnabled) {
      // Only create new rooms from loops when auto-detection is enabled
      const graph = this.buildRoomDetectionGraph(floorId)
      const loops = this.engine.findMinimalWallLoops(graph)

      // Look for new loops that include the added wall
      const newLoops = loops.filter(loop => loop.wallIds.includes(addedWallId))

      // Get existing rooms to avoid duplicates and generate proper names
      const existingRoomsAfterCheck = Array.from(store.rooms.values()).filter(room => room.floorId === floorId)

      newLoops.forEach(loop => {
        const roomName = this.generateUniqueRoomName(existingRoomsAfterCheck, [])
        const roomDefinition = this.engine.createRoomFromLoop(loop, roomName, graph)

        if (roomDefinition !== null) {
          this.createRoomFromDefinition(roomDefinition, floorId)
        }
      })
    }
  }

  private splitRoomAfterWallAddition(wall: Wall, splitRoom: Room, store: StoreState & StoreActions) {
    // Both endpoints of the wall are in the outer boundary of the split room
    // Find the indices of the points and split the points array accordingly to form two new rooms
    // For all holes and interior walls of the original room, check which new room they belong to
    // Remove original room and add both new rooms

    const { pointIds, wallIds } = splitRoom.outerBoundary

    // Find indices of wall endpoints in the room boundary
    const startIndex = pointIds.indexOf(wall.startPointId)
    const endIndex = pointIds.indexOf(wall.endPointId)

    if (startIndex === -1 || endIndex === -1) {
      throw new Error('Wall endpoints not found in room boundary')
    }

    // Split the boundary into two new room boundaries
    const [room1Boundary, room2Boundary] = this.splitRoomBoundary(pointIds, wallIds, startIndex, endIndex, wall, store)

    // Generate names for new rooms
    const existingRooms = Array.from(store.rooms.values()).filter(room => room.floorId === splitRoom.floorId)
    const room1Name = this.generateUniqueRoomName(existingRooms, [])
    const room2Name = this.generateUniqueRoomName(existingRooms, [{ name: room1Name }])

    // Create polygons for the new rooms
    const room1Polygon = {
      points: room1Boundary.pointIds.map(pointId => store.points.get(pointId)!.position)
    }
    const room2Polygon = {
      points: room2Boundary.pointIds.map(pointId => store.points.get(pointId)!.position)
    }

    // Distribute holes and interior walls between the new rooms
    const [room1Holes, room2Holes] = this.distributeHoles(splitRoom.holes, room1Polygon, room2Polygon, store)
    const [room1InteriorWalls, room2InteriorWalls] = this.distributeInteriorWalls(
      splitRoom.interiorWallIds,
      room1Polygon,
      room2Polygon,
      store
    )

    // Create room definitions
    const room1Definition: RoomDefinition = {
      name: room1Name,
      outerBoundary: room1Boundary,
      holes: room1Holes,
      interiorWallIds: room1InteriorWalls
    }

    const room2Definition: RoomDefinition = {
      name: room2Name,
      outerBoundary: room2Boundary,
      holes: room2Holes,
      interiorWallIds: room2InteriorWalls
    }

    // Remove the original room
    store.removeRoom(splitRoom.id)

    // Create the two new rooms using createRoomFromDefinition
    this.createRoomFromDefinition(room1Definition, splitRoom.floorId)
    this.createRoomFromDefinition(room2Definition, splitRoom.floorId)
  }

  /**
   * Helper function to split a room boundary into two new boundaries
   */
  private splitRoomBoundary(
    pointIds: PointId[],
    wallIds: Set<WallId>,
    startIndex: number,
    endIndex: number,
    newWall: Wall,
    store: StoreState & StoreActions
  ): [RoomBoundaryDefinition, RoomBoundaryDefinition] {
    // Helper function to find the wall connecting two consecutive points
    const findWallBetweenPoints = (point1Id: PointId, point2Id: PointId): WallId | null => {
      for (const wallId of wallIds) {
        const wallInRoom = store.walls.get(wallId)
        if (
          wallInRoom &&
          ((wallInRoom.startPointId === point1Id && wallInRoom.endPointId === point2Id) ||
            (wallInRoom.startPointId === point2Id && wallInRoom.endPointId === point1Id))
        ) {
          return wallId
        }
      }
      return null
    }

    const room1PointIds: PointId[] = []
    const room1WallIds: WallId[] = []
    const room2PointIds: PointId[] = []
    const room2WallIds: WallId[] = []

    // Create room1 from startIndex to endIndex (clockwise)
    let currentIndex = startIndex
    while (currentIndex !== endIndex) {
      const nextIndex = (currentIndex + 1) % pointIds.length
      room1PointIds.push(pointIds[currentIndex])

      // Find the wall connecting current point to next point
      const wallBetween = findWallBetweenPoints(pointIds[currentIndex], pointIds[nextIndex])
      if (wallBetween) {
        room1WallIds.push(wallBetween)
      }

      currentIndex = nextIndex
    }
    room1PointIds.push(pointIds[endIndex]) // Add the end point
    room1WallIds.push(newWall.id) // Add the new wall connecting back to start

    // Create room2 from endIndex to startIndex (clockwise)
    currentIndex = endIndex
    while (currentIndex !== startIndex) {
      const nextIndex = (currentIndex + 1) % pointIds.length
      room2PointIds.push(pointIds[currentIndex])

      // Find the wall connecting current point to next point
      const wallBetween = findWallBetweenPoints(pointIds[currentIndex], pointIds[nextIndex])
      if (wallBetween) {
        room2WallIds.push(wallBetween)
      }

      currentIndex = nextIndex
    }
    room2PointIds.push(pointIds[startIndex]) // Add the start point
    room2WallIds.push(newWall.id) // Add the new wall connecting back to end

    return [
      { pointIds: room1PointIds, wallIds: room1WallIds },
      { pointIds: room2PointIds, wallIds: room2WallIds }
    ]
  }

  /**
   * Helper function to distribute holes between two new rooms
   */
  private distributeHoles(
    holes: Room['holes'],
    room1Polygon: Polygon2D,
    room2Polygon: Polygon2D,
    store: StoreState & StoreActions
  ): [RoomBoundaryDefinition[], RoomBoundaryDefinition[]] {
    const room1Holes: RoomBoundaryDefinition[] = []
    const room2Holes: RoomBoundaryDefinition[] = []

    for (const hole of holes) {
      // Check which room contains the hole by testing if any hole point is inside each room
      const holePoints = hole.pointIds.map((pointId: PointId) => store.points.get(pointId)!.position)
      const samplePoint = holePoints[0] // Use first point as representative

      if (isPointInPolygon(samplePoint, room1Polygon)) {
        room1Holes.push({
          pointIds: hole.pointIds,
          wallIds: Array.from(hole.wallIds)
        })
      } else if (isPointInPolygon(samplePoint, room2Polygon)) {
        room2Holes.push({
          pointIds: hole.pointIds,
          wallIds: Array.from(hole.wallIds)
        })
      }
      // If hole isn't in either room (edge case), we'll skip it
    }

    return [room1Holes, room2Holes]
  }

  /**
   * Helper function to distribute interior walls between two new rooms
   */
  private distributeInteriorWalls(
    interiorWallIds: Set<WallId>,
    room1Polygon: Polygon2D,
    room2Polygon: Polygon2D,
    store: StoreState & StoreActions
  ): [WallId[], WallId[]] {
    const room1InteriorWalls: WallId[] = []
    const room2InteriorWalls: WallId[] = []

    for (const interiorWallId of interiorWallIds) {
      const interiorWall = store.walls.get(interiorWallId)
      if (interiorWall) {
        const startPoint = store.points.get(interiorWall.startPointId)!.position
        const endPoint = store.points.get(interiorWall.endPointId)!.position

        // Check which room contains the interior wall by testing both endpoints
        const startInRoom1 = isPointInPolygon(startPoint, room1Polygon)
        const endInRoom1 = isPointInPolygon(endPoint, room1Polygon)
        const startInRoom2 = isPointInPolygon(startPoint, room2Polygon)
        const endInRoom2 = isPointInPolygon(endPoint, room2Polygon)

        if (startInRoom1 && endInRoom1) {
          room1InteriorWalls.push(interiorWallId)
        } else if (startInRoom2 && endInRoom2) {
          room2InteriorWalls.push(interiorWallId)
        }
        // If wall spans both rooms or is on the boundary, we'll skip it
      }
    }

    return [room1InteriorWalls, room2InteriorWalls]
  }

  /**
   * Build a RoomDetectionGraph from the current store state for a given floor
   */
  private buildRoomDetectionGraph(floorId: FloorId): RoomDetectionGraph {
    const store = this.get()
    const points = new Map<PointId, Vec2>()
    const edges = new Map<PointId, Array<{ endPointId: PointId; wallId: WallId }>>()
    const walls = new Map<WallId, { startPointId: PointId; endPointId: PointId }>()

    // Collect points and walls for this floor
    for (const point of store.points.values()) {
      if (point.floorId === floorId) {
        points.set(point.id, point.position)
        edges.set(point.id, [])
      }
    }

    for (const wall of store.walls.values()) {
      if (wall.floorId === floorId) {
        walls.set(wall.id, {
          startPointId: wall.startPointId,
          endPointId: wall.endPointId
        })

        // Add bidirectional edges
        const startEdges = edges.get(wall.startPointId) ?? []
        const endEdges = edges.get(wall.endPointId) ?? []

        startEdges.push({ endPointId: wall.endPointId, wallId: wall.id })
        endEdges.push({ endPointId: wall.startPointId, wallId: wall.id })
      }
    }

    return { points, edges, walls }
  }

  /**
   * Check if two room boundaries are equal (same point IDs)
   */
  private areBoundariesEqual(loopPointIds: Set<PointId>, existingPointIds: Set<PointId>): boolean {
    // Check if sets have the same size and same elements
    if (loopPointIds.size !== existingPointIds.size) {
      return false
    }

    // Check if all points match
    for (const pointId of loopPointIds) {
      if (!existingPointIds.has(pointId)) {
        return false
      }
    }

    return true
  }

  /**
   * Generate a unique room name following the "Room {number}" pattern
   */
  private generateUniqueRoomName(
    existingRooms: Array<{ name: string }>,
    newRoomDefinitions: Array<{ name: string }>
  ): string {
    const allExistingNames = new Set([
      ...existingRooms.map(room => room.name),
      ...newRoomDefinitions.map(def => def.name)
    ])

    let roomNumber = 1
    let candidateName = `Room ${roomNumber}`

    while (allExistingNames.has(candidateName)) {
      roomNumber++
      candidateName = `Room ${roomNumber}`
    }

    return candidateName
  }

  /**
   * Clean up room references from walls and points
   */
  private cleanupRoomReferences(roomIds: RoomId[]): void {
    const store = this.get()
    const roomIdSet = new Set(roomIds)

    // Clean up wall room references
    for (const wall of store.walls.values()) {
      if (wall.leftRoomId && roomIdSet.has(wall.leftRoomId)) {
        store.updateWallLeftRoom(wall.id, null)
      }
      if (wall.rightRoomId && roomIdSet.has(wall.rightRoomId)) {
        store.updateWallRightRoom(wall.id, null)
      }
    }

    // Clean up point room references
    for (const point of store.points.values()) {
      for (const roomId of roomIds) {
        if (point.roomIds.has(roomId)) {
          store.removeRoomFromPoint(point.id, roomId)
        }
      }
    }
  }

  /**
   * Create a room in the store from a room definition
   */
  private createRoomFromDefinition(definition: RoomDefinition, floorId: FloorId): void {
    const store = this.get()

    // Use the store's addRoom method which expects arrays, not sets
    const outerWallIds = definition.outerBoundary.wallIds
    const outerPointIds = definition.outerBoundary.pointIds

    // Add the room using the store action
    const room = store.addRoom(floorId, definition.name, outerPointIds, outerWallIds)

    // Update points with room IDs
    outerPointIds.forEach(pointId => {
      store.addRoomToPoint(pointId, room.id)
    })

    // Update walls with room assignments (determine which side of each wall the room is on)
    outerWallIds.forEach(wallId => {
      const wall = store.walls.get(wallId)
      if (wall) {
        const roomSide = this.engine.determineRoomSide(definition.outerBoundary, wall)
        if (roomSide === 'left') {
          store.updateWallLeftRoom(wallId, room.id)
        } else {
          store.updateWallRightRoom(wallId, room.id)
        }
      }
    })

    // Add holes if any exist
    definition.holes.forEach((hole: { pointIds: PointId[]; wallIds: WallId[] }) => {
      store.addHoleToRoom(room.id, hole.pointIds, hole.wallIds)

      // Update hole points with room IDs
      hole.pointIds.forEach(pointId => {
        store.addRoomToPoint(pointId, room.id)
      })

      // Update hole walls with room assignments
      hole.wallIds.forEach(wallId => {
        const wall = store.walls.get(wallId)
        if (wall) {
          const roomSide = this.engine.determineRoomSide({ pointIds: hole.pointIds, wallIds: hole.wallIds }, wall)
          // Holes are counter-clockwise, so sides are inverted
          if (roomSide === 'right') {
            store.updateWallLeftRoom(wallId, room.id)
          } else {
            store.updateWallRightRoom(wallId, room.id)
          }
        }
      })
    })

    // Add interior walls if any exist
    definition.interiorWallIds.forEach(wallId => {
      store.addInteriorWallToRoom(room.id, wallId)
    })
  }
}

export const defaultRoomDetectionService = new RoomDetectionService(useModelStore.getState, useModelStore.setState)
