import type { ModelState, Room } from '@/types/model'
import type { WallId, PointId, FloorId, RoomId } from '@/types/ids'
import { createRoomId } from '@/types/ids'
import { createPoint2D } from '@/types/geometry'
import { RoomDetectionEngine } from './RoomDetectionEngine'
import {
  type RoomDetectionResult,
  type RoomDetectionContext,
  type RoomDetectionConfig,
  type RoomValidationResult,
  type RoomDefinition,
  DEFAULT_ROOM_DETECTION_CONFIG
} from './types'

/**
 * Service interface for room detection operations
 */
export interface IRoomDetectionService {
  /**
   * Detect all rooms on a floor and return what changes need to be made
   */
  detectRooms: (state: ModelState, floorId: FloorId) => RoomDetectionResult

  /**
   * Handle room changes when a wall is added
   */
  handleWallAddition: (state: ModelState, wallId: WallId, floorId: FloorId) => RoomDetectionResult

  /**
   * Handle room changes when a wall is removed
   */
  handleWallRemoval: (state: ModelState, wallId: WallId, floorId: FloorId) => RoomDetectionResult

  /**
   * Validate room consistency and return what needs to be fixed
   */
  validateRoomConsistency: (state: ModelState, floorId: FloorId) => RoomValidationResult
}

/**
 * Default implementation of room detection service
 */
export class RoomDetectionService implements IRoomDetectionService {
  private readonly engine: RoomDetectionEngine
  private readonly config: RoomDetectionConfig

  constructor (config?: Partial<RoomDetectionConfig>) {
    this.config = { ...DEFAULT_ROOM_DETECTION_CONFIG, ...config }
    this.engine = new RoomDetectionEngine()
  }

  detectRooms (state: ModelState, floorId: FloorId): RoomDetectionResult {
    const context: RoomDetectionContext = { floorId }
    return this.performRoomDetection(state, context)
  }

  handleWallAddition (state: ModelState, wallId: WallId, floorId: FloorId): RoomDetectionResult {
    const wall = state.walls.get(wallId)
    if (wall == null) {
      return this.createEmptyResult()
    }

    // Find if this wall completes any loops or splits existing rooms
    const context: RoomDetectionContext = {
      floorId,
      affectedWallIds: new Set([wallId]),
      affectedPointIds: new Set([wall.startPointId, wall.endPointId])
    }

    // Check if this wall intersects any existing rooms (room splitting case)
    const intersectedRooms = this.findRoomsIntersectedByWall(state, wall, floorId)
    
    const result = this.performRoomDetection(state, context)

    // Handle room splitting
    if (intersectedRooms.length > 0) {
      for (const room of intersectedRooms) {
        result.roomsToDelete.push(room.id)
        
        // Try to create new rooms from the split
        const splitRooms = this.createRoomsFromSplitWall(state, wallId, room)
        result.roomsToCreate.push(...splitRooms)
      }
    }

    return result
  }

  handleWallRemoval (state: ModelState, wallId: WallId, _floorId: FloorId): RoomDetectionResult {
    const wall = state.walls.get(wallId)
    if (wall == null) {
      return this.createEmptyResult()
    }

    const result = this.createEmptyResult()

    // Find rooms that contain this wall
    const affectedRooms = this.engine.findRoomsWithWall(state, wallId)

    if (affectedRooms.length === 2) {
      // Two rooms share this wall - merge them
      const [room1, room2] = affectedRooms
      result.roomsToDelete.push(room1.id, room2.id)
      
      const mergedRoom = this.createMergedRoom(room1, room2, wallId, state)
      if (mergedRoom != null) {
        result.roomsToCreate.push(mergedRoom)
      }
    } else if (affectedRooms.length === 1) {
      // One room contains this wall - check if room is still valid
      const room = affectedRooms[0]
      const updatedWallIds = Array.from(room.wallIds).filter(id => id !== wallId)
      
      const roomDef: RoomDefinition = {
        name: room.name,
        wallIds: updatedWallIds,
        pointIds: room.pointIds ?? []
      }
      
      if (!this.engine.validateRoom(roomDef, state)) {
        // Room becomes invalid, remove it
        result.roomsToDelete.push(room.id)
      } else {
        // Room is still valid, update it
        result.roomsToUpdate.push({
          roomId: room.id,
          definition: roomDef
        })
      }
    }

    // Update wall and point assignments
    this.updateAssignmentsAfterWallRemoval(result, wallId, state)

    return result
  }

  validateRoomConsistency (state: ModelState, floorId: FloorId): RoomValidationResult {
    const floor = state.floors.get(floorId)
    if (floor == null) {
      return {
        validRooms: [],
        invalidRooms: [],
        orphanedWalls: [],
        orphanedPoints: []
      }
    }

    const validRooms: RoomId[] = []
    const invalidRooms: RoomId[] = []
    const orphanedWalls: WallId[] = []
    const orphanedPoints: PointId[] = []

    // Validate each room
    for (const roomId of floor.roomIds) {
      const room = state.rooms.get(roomId)
      if (room == null) {
        invalidRooms.push(roomId)
        continue
      }

      const roomDef: RoomDefinition = {
        name: room.name,
        wallIds: Array.from(room.wallIds),
        pointIds: room.pointIds ?? []
      }

      if (this.engine.validateRoom(roomDef, state)) {
        validRooms.push(roomId)
      } else {
        invalidRooms.push(roomId)
      }
    }

    // Find orphaned walls (not referenced by any valid room)
    for (const wallId of floor.wallIds) {
      const wall = state.walls.get(wallId)
      if (wall == null) continue

      const hasValidRoom = validRooms.some(roomId => {
        const room = state.rooms.get(roomId)
        return room?.wallIds.has(wallId) === true
      })

      if (!hasValidRoom) {
        orphanedWalls.push(wallId)
      }
    }

    // Find orphaned points (not referenced by any valid room)
    for (const pointId of floor.pointIds) {
      const point = state.points.get(pointId)
      if (point == null) continue

      const hasValidRoom = validRooms.some(roomId => {
        const room = state.rooms.get(roomId)
        return room?.pointIds?.includes(pointId) === true
      })

      if (!hasValidRoom) {
        orphanedPoints.push(pointId)
      }
    }

    return {
      validRooms,
      invalidRooms,
      orphanedWalls,
      orphanedPoints
    }
  }

  // Private helper methods

  private performRoomDetection (state: ModelState, context: RoomDetectionContext): RoomDetectionResult {
    const result = this.createEmptyResult()

    // Find all wall loops on the floor
    const wallLoops = this.engine.findWallLoops(state, context.floorId)

    // Convert loops to room definitions
    for (const wallLoop of wallLoops) {
      const roomName = this.generateRoomName(result.roomsToCreate.length + 1)
      const roomDef = this.engine.createRoomFromLoop(wallLoop, roomName, state)
      
      if (roomDef != null) {
        result.roomsToCreate.push(roomDef)
      }
    }

    // Generate wall and point assignments
    this.generateWallAssignments(result, state, context.floorId)
    this.generatePointAssignments(result, state, context.floorId)

    return result
  }

  private createEmptyResult (): RoomDetectionResult {
    return {
      roomsToCreate: [],
      roomsToUpdate: [],
      roomsToDelete: [],
      wallAssignments: [],
      pointAssignments: []
    }
  }

  private generateRoomName (index: number): string {
    return this.config.roomNamePattern.replace('{index}', index.toString())
  }

  private findRoomsIntersectedByWall (state: ModelState, wall: import('@/types/model').Wall, floorId: FloorId): Room[] {
    const floor = state.floors.get(floorId)
    if (floor == null) return []

    const intersectedRooms: Room[] = []
    const startPoint = state.points.get(wall.startPointId)
    const endPoint = state.points.get(wall.endPointId)

    if (startPoint == null || endPoint == null) return []

    for (const roomId of floor.roomIds) {
      const room = state.rooms.get(roomId)
      if (room == null) continue

      // Check if the new wall would pass through this room
      if (this.isWallInsideRoom(startPoint.position, endPoint.position, room, state)) {
        intersectedRooms.push(room)
      }
    }

    return intersectedRooms
  }

  private isWallInsideRoom (
    wallStart: import('@/types/geometry').Point2D,
    wallEnd: import('@/types/geometry').Point2D,
    room: Room,
    state: ModelState
  ): boolean {
    // Get room polygon points
    const roomPoints: import('@/types/geometry').Point2D[] = []

    for (const wallId of room.wallIds) {
      const wall = state.walls.get(wallId)
      if (wall == null) continue

      const startPoint = state.points.get(wall.startPointId)
      const endPoint = state.points.get(wall.endPointId)

      if (startPoint != null && !roomPoints.some(p => p.x === startPoint.position.x && p.y === startPoint.position.y)) {
        roomPoints.push(startPoint.position)
      }
      if (endPoint != null && !roomPoints.some(p => p.x === endPoint.position.x && p.y === endPoint.position.y)) {
        roomPoints.push(endPoint.position)
      }
    }

    if (roomPoints.length < 3) return false

    // Simple point-in-polygon test for wall midpoint
    const wallMidPoint = createPoint2D(
      (wallStart.x + wallEnd.x) / 2,
      (wallStart.y + wallEnd.y) / 2
    )

    return this.isPointInPolygon(wallMidPoint, roomPoints)
  }

  private isPointInPolygon (point: import('@/types/geometry').Point2D, polygon: import('@/types/geometry').Point2D[]): boolean {
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

  private createRoomsFromSplitWall (state: ModelState, wallId: WallId, originalRoom: Room): RoomDefinition[] {
    // Try to trace loops starting from the splitting wall
    const leftLoop = this.engine.traceWallLoop(wallId, 'left', state)
    const rightLoop = this.engine.traceWallLoop(wallId, 'right', state)

    const rooms: RoomDefinition[] = []

    if (leftLoop?.isValid === true) {
      const roomDef = this.engine.createRoomFromLoop(leftLoop.wallIds, `${originalRoom.name} A`, state)
      if (roomDef != null) {
        rooms.push(roomDef)
      }
    }

    if (rightLoop?.isValid === true && rightLoop.wallIds.join(',') !== leftLoop?.wallIds.join(',')) {
      const roomDef = this.engine.createRoomFromLoop(rightLoop.wallIds, `${originalRoom.name} B`, state)
      if (roomDef != null) {
        rooms.push(roomDef)
      }
    }

    return rooms
  }

  private createMergedRoom (room1: Room, room2: Room, deletedWallId: WallId, state: ModelState): RoomDefinition | null {
    // Combine walls from both rooms, excluding the deleted wall
    const allWallIds = [
      ...Array.from(room1.wallIds),
      ...Array.from(room2.wallIds)
    ].filter(wallId => wallId !== deletedWallId)

    // Remove duplicates
    const uniqueWallIds = [...new Set(allWallIds)]

    // Try to create a valid room from these walls
    const roomDef = this.engine.createRoomFromLoop(uniqueWallIds, room1.name, state)
    return roomDef
  }

  private generateWallAssignments (result: RoomDetectionResult, state: ModelState, floorId: FloorId): void {
    const floor = state.floors.get(floorId)
    if (floor == null) return

    // Create a map of room definitions by their wall IDs for quick lookup
    const roomDefsByWall = new Map<WallId, RoomDefinition[]>()
    
    for (const roomDef of result.roomsToCreate) {
      for (const wallId of roomDef.wallIds) {
        if (!roomDefsByWall.has(wallId)) {
          roomDefsByWall.set(wallId, [])
        }
        roomDefsByWall.get(wallId)?.push(roomDef)
      }
    }

    // Generate assignments for each wall
    for (const wallId of floor.wallIds) {
      const wall = state.walls.get(wallId)
      if (wall == null) continue

      const roomDefs = roomDefsByWall.get(wallId) ?? []
      
      let leftRoomId: RoomId | undefined
      let rightRoomId: RoomId | undefined

      if (roomDefs.length === 1) {
        // Single room - determine which side
        const roomDef = roomDefs[0]
        const side = this.engine.determineRoomSide(roomDef, wall, state)
        const tempRoomId = createRoomId() // Temporary ID for assignment
        
        if (side === 'left') {
          leftRoomId = tempRoomId
        } else {
          rightRoomId = tempRoomId
        }
      } else if (roomDefs.length === 2) {
        // Two rooms share this wall
        const [roomDef1, roomDef2] = roomDefs
        const side1 = this.engine.determineRoomSide(roomDef1, wall, state)
        const side2 = this.engine.determineRoomSide(roomDef2, wall, state)
        
        const tempRoomId1 = createRoomId()
        const tempRoomId2 = createRoomId()
        
        if (side1 === 'left') {
          leftRoomId = tempRoomId1
          rightRoomId = side2 === 'right' ? tempRoomId2 : undefined
        } else {
          rightRoomId = tempRoomId1
          leftRoomId = side2 === 'left' ? tempRoomId2 : undefined
        }
      }

      result.wallAssignments.push({
        wallId,
        leftRoomId,
        rightRoomId
      })
    }
  }

  private generatePointAssignments (result: RoomDetectionResult, state: ModelState, floorId: FloorId): void {
    const floor = state.floors.get(floorId)
    if (floor == null) return

    for (const pointId of floor.pointIds) {
      const roomIds = new Set<RoomId>()
      
      // Find which room definitions include this point
      for (const roomDef of result.roomsToCreate) {
        if (roomDef.pointIds.includes(pointId)) {
          // Use temporary room ID - will be replaced when rooms are actually created
          roomIds.add(createRoomId())
        }
      }

      result.pointAssignments.push({
        pointId,
        roomIds
      })
    }
  }

  private updateAssignmentsAfterWallRemoval (result: RoomDetectionResult, wallId: WallId, state: ModelState): void {
    const wall = state.walls.get(wallId)
    if (wall == null) return

    // Clear assignments for the removed wall
    result.wallAssignments.push({
      wallId,
      leftRoomId: undefined,
      rightRoomId: undefined
    })

    // Update point assignments to remove references to deleted rooms
    const deletedRoomIds = new Set(result.roomsToDelete)
    
    for (const pointId of [wall.startPointId, wall.endPointId]) {
      const point = state.points.get(pointId)
      if (point == null) continue

      const updatedRoomIds = new Set<RoomId>()
      for (const roomId of point.roomIds) {
        if (!deletedRoomIds.has(roomId)) {
          updatedRoomIds.add(roomId)
        }
      }

      result.pointAssignments.push({
        pointId,
        roomIds: updatedRoomIds
      })
    }
  }
}

// Create a default singleton instance
export const defaultRoomDetectionService = new RoomDetectionService()