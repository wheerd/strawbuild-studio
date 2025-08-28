import type { WallId, FloorId, PointId } from '@/types/ids'
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
    if (!this.autoDetectionEnabled) return

    const graph = this.buildRoomDetectionGraph(floorId)

    // Find all minimal wall loops (potential rooms)
    const loops = this.engine.findMinimalWallLoops(graph)

    // Clear existing rooms on this floor first
    const store = this.get()
    const existingRooms = Array.from(store.rooms.values())
      .filter(room => room.floorId === floorId)

    existingRooms.forEach(room => {
      store.removeRoom(room.id)
    })

    // Create rooms from detected loops
    loops.forEach((loop, index) => {
      const roomName = `Room ${index + 1}`
      const roomDefinition = this.engine.createRoomFromLoop(loop, roomName, graph)

      if (roomDefinition != null) {
        this.createRoomFromDefinition(roomDefinition, floorId)
      }
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
      // Trigger full room detection for the floor
      this.detectRooms(floorId)
    }
  }

  updateRoomsAfterWallAddition (floorId: FloorId, addedWallId: WallId): void {
    if (!this.autoDetectionEnabled) return

    const store = this.get()
    const wall = store.walls.get(addedWallId)

    if (wall == null) return

    // Check if adding this wall creates new room boundaries
    const graph = this.buildRoomDetectionGraph(floorId)
    const loops = this.engine.findMinimalWallLoops(graph)

    // Look for new loops that include the added wall
    const newLoops = loops.filter(loop => loop.wallIds.includes(addedWallId))

    newLoops.forEach((loop, index) => {
      const roomName = `Room ${Date.now()}-${index}`
      const roomDefinition = this.engine.createRoomFromLoop(loop, roomName, graph)

      if (roomDefinition != null) {
        this.createRoomFromDefinition(roomDefinition, floorId)
      }
    })
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
   * Create a room in the store from a room definition
   */
  private createRoomFromDefinition (definition: RoomDefinition, floorId: FloorId): void {
    const store = this.get()

    // Use the store's addRoom method which expects arrays, not sets
    const outerWallIds = definition.outerBoundary.wallIds
    const outerPointIds = definition.outerBoundary.pointIds

    // Add the room using the store action
    const room = store.addRoom(floorId, definition.name, outerPointIds, outerWallIds)

    // Add holes if any exist
    definition.holes.forEach((hole: { pointIds: PointId[], wallIds: WallId[] }) => {
      store.addHoleToRoom(room.id, hole.pointIds, hole.wallIds)
    })

    // Add interior walls if any exist
    definition.interiorWallIds.forEach(wallId => {
      store.addInteriorWallToRoom(room.id, wallId)
    })
  }
}

export const defaultRoomDetectionService = new RoomDetectionService(useModelStore.getState, useModelStore.setState)
