import type { WallId, FloorId, PointId, RoomId } from '@/types/ids'
import type { Point2D } from '@/types/geometry'
import type { StoreState, StoreActions } from '../../types'
import { useModelStore } from '../..'
import { RoomDetectionEngine } from './RoomDetectionEngine'
import type { RoomDetectionGraph, RoomDefinition } from './types'

export interface IRoomDetectionService {
  // Room detection operations
  detectRooms: (floorId: FloorId) => void
  detectRoomAtPoint: (floorId: FloorId, point: Point2D) => void

  // Room merging and splitting
  updateRoomsAfterWallRemoval: (floorId: FloorId, removedWallId: WallId) => void
  updateRoomsAfterWallAddition: (floorId: FloorId, addedWallId: WallId) => void

  // Configuration
  setAutoDetectionEnabled: (enabled: boolean) => void
  isAutoDetectionEnabled: () => boolean
}

export class RoomDetectionService implements IRoomDetectionService {
  private autoDetectionEnabled: boolean = true
  private readonly get: () => StoreState & StoreActions
  private readonly engine: RoomDetectionEngine

  constructor (get: () => StoreState & StoreActions, _set: (partial: Partial<StoreState & StoreActions>) => void) {
    this.get = get
    // _set is kept for future use but not stored as instance variable
    this.autoDetectionEnabled = true
    this.engine = new RoomDetectionEngine()
  }

  setAutoDetectionEnabled (enabled: boolean): void {
    this.autoDetectionEnabled = enabled
  }

  isAutoDetectionEnabled (): boolean {
    return this.autoDetectionEnabled
  }

  detectRooms (floorId: FloorId): void {
    // Always detect rooms, even if auto-detection is disabled
    const store = this.get()
    const graph = this.buildRoomDetectionGraph(floorId)

    // Find all minimal wall loops (potential rooms)
    const loops = this.engine.findMinimalWallLoops(graph)

    // Get existing rooms on this floor to avoid duplicates and generate proper names
    const existingRooms = Array.from(store.rooms.values())
      .filter(room => room.floorId === floorId)

    // Convert existing rooms to comparable format
    const existingRoomBoundaries = existingRooms.map(room => ({
      room,
      pointIds: new Set(room.outerBoundary.pointIds)
    }))

    // Create room definitions from detected loops
    const newRoomDefinitions: RoomDefinition[] = []

    loops.forEach((loop) => {
      const loopPointIds = new Set(loop.pointIds)

      // Check if this loop matches an existing room (compare only point IDs)
      const existingRoom = existingRoomBoundaries.find(existing =>
        this.areBoundariesEqual(loopPointIds, existing.pointIds)
      )

      // Only add if it doesn't already exist
      if (existingRoom == null) {
        const roomName = this.generateUniqueRoomName(existingRooms, newRoomDefinitions)
        const roomDefinition = this.engine.createRoomFromLoop(loop, roomName, graph)

        if (roomDefinition != null) {
          newRoomDefinitions.push(roomDefinition)
        }
      }
    })

    // Create only the new rooms
    newRoomDefinitions.forEach(definition => {
      this.createRoomFromDefinition(definition, floorId)
    })
  }

  detectRoomAtPoint (floorId: FloorId, point: Point2D): void {
    if (!this.autoDetectionEnabled) return

    const graph = this.buildRoomDetectionGraph(floorId)

    // Find the nearest point in the graph
    let nearestPointId: PointId | null = null
    let minDistance = Infinity

    for (const [pointId, graphPoint] of graph.points) {
      const distance = Math.sqrt(
        Math.pow(point.x - graphPoint.x, 2) +
        Math.pow(point.y - graphPoint.y, 2)
      )
      if (distance < minDistance) {
        minDistance = distance
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

    if (loop != null) {
      const roomName = 'Detected Room'
      const roomDefinition = this.engine.createRoomFromLoop(loop, roomName, graph)

      if (roomDefinition != null) {
        this.createRoomFromDefinition(roomDefinition, floorId)
      }
    }
  }

  updateRoomsAfterWallRemoval (floorId: FloorId, removedWallId: WallId): void {
    if (!this.autoDetectionEnabled) return

    // When a wall is removed, rooms may need to be merged
    const store = this.get()
    const affectedRooms = Array.from(store.rooms.values())
      .filter(room =>
        room.floorId === floorId &&
        (room.outerBoundary.wallIds.has(removedWallId) ||
         room.holes.some(hole => hole.wallIds.has(removedWallId)) ||
         room.interiorWallIds.has(removedWallId))
      )

    if (affectedRooms.length > 0) {
      // Clean up references from affected rooms before re-detection
      this.cleanupRoomReferences(affectedRooms.map(room => room.id))

      // Remove affected rooms
      affectedRooms.forEach(room => {
        store.removeRoom(room.id)
      })

      // Trigger full room detection for the floor
      this.detectRooms(floorId)
    }
  }

  updateRoomsAfterWallAddition (floorId: FloorId, addedWallId: WallId): void {
    if (!this.autoDetectionEnabled) return

    const store = this.get()
    const wall = store.walls.get(addedWallId)

    if (wall == null) return

    // Check if adding this wall affects existing rooms (might split them)
    const existingRooms = Array.from(store.rooms.values())
      .filter(room => room.floorId === floorId)

    const affectedRooms = existingRooms.filter(room => {
      // Check if the new wall might be inside this room or affect its boundary
      const wallStartPoint = store.points.get(wall.startPointId)
      const wallEndPoint = store.points.get(wall.endPointId)

      if (wallStartPoint == null || wallEndPoint == null) return false

      // Simple check: if either endpoint of the new wall is associated with this room
      return wallStartPoint.roomIds.has(room.id) || wallEndPoint.roomIds.has(room.id)
    })

    if (affectedRooms.length > 0) {
      // Clean up affected rooms and re-detect
      this.cleanupRoomReferences(affectedRooms.map(room => room.id))
      affectedRooms.forEach(room => {
        store.removeRoom(room.id)
      })

      // Trigger full room detection for the floor
      this.detectRooms(floorId)
    } else {
      // Check if adding this wall creates new room boundaries
      const graph = this.buildRoomDetectionGraph(floorId)
      const loops = this.engine.findMinimalWallLoops(graph)

      // Look for new loops that include the added wall
      const newLoops = loops.filter(loop => loop.wallIds.includes(addedWallId))

      // Get existing rooms to avoid duplicates and generate proper names
      const existingRoomsAfterCheck = Array.from(store.rooms.values())
        .filter(room => room.floorId === floorId)

      newLoops.forEach((loop) => {
        const roomName = this.generateUniqueRoomName(existingRoomsAfterCheck, [])
        const roomDefinition = this.engine.createRoomFromLoop(loop, roomName, graph)

        if (roomDefinition != null) {
          this.createRoomFromDefinition(roomDefinition, floorId)
        }
      })
    }
  }

  /**
   * Build a RoomDetectionGraph from the current store state for a given floor
   */
  private buildRoomDetectionGraph (floorId: FloorId): RoomDetectionGraph {
    const store = this.get()
    const points = new Map<PointId, Point2D>()
    const edges = new Map<PointId, Array<{ endPointId: PointId, wallId: WallId }>>()
    const walls = new Map<WallId, { startPointId: PointId, endPointId: PointId }>()

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
  private areBoundariesEqual (
    loopPointIds: Set<PointId>,
    existingPointIds: Set<PointId>
  ): boolean {
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
  private generateUniqueRoomName (
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
  private cleanupRoomReferences (roomIds: RoomId[]): void {
    const store = this.get()
    const roomIdSet = new Set(roomIds)

    // Clean up wall room references
    for (const wall of store.walls.values()) {
      if (wall.leftRoomId != null && roomIdSet.has(wall.leftRoomId)) {
        store.updateWallLeftRoom(wall.id, null)
      }
      if (wall.rightRoomId != null && roomIdSet.has(wall.rightRoomId)) {
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
  private createRoomFromDefinition (definition: RoomDefinition, floorId: FloorId): void {
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
      if (wall != null) {
        const roomSide = this.engine.determineRoomSide(definition.outerBoundary, wall)
        if (roomSide === 'left') {
          store.updateWallLeftRoom(wallId, room.id)
        } else {
          store.updateWallRightRoom(wallId, room.id)
        }
      }
    })

    // Add holes if any exist
    definition.holes.forEach((hole: { pointIds: PointId[], wallIds: WallId[] }) => {
      store.addHoleToRoom(room.id, hole.pointIds, hole.wallIds)

      // Update hole points with room IDs
      hole.pointIds.forEach(pointId => {
        store.addRoomToPoint(pointId, room.id)
      })

      // Update hole walls with room assignments
      hole.wallIds.forEach(wallId => {
        const wall = store.walls.get(wallId)
        if (wall != null) {
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
