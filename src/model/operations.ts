import type {
  Building,
  Wall,
  Room,
  ConnectionPoint,
  Opening,
  Floor,
  Point2D,
  Bounds
} from '../types/model'
import type {
  WallId,
  ConnectionPointId,
  FloorId
} from '../types/ids'
import {
  createWallId,
  createConnectionPointId,
  createRoomId,
  createOpeningId,
  createFloorId
} from '../types/ids'

export function createEmptyBuilding (): Building {
  const groundFloor = createFloor('Ground Floor', 0, 3000)

  return {
    floors: new Map([[groundFloor.id, groundFloor]]),
    walls: new Map(),
    rooms: new Map(),
    connectionPoints: new Map(),
    openings: new Map(),
    createdAt: new Date(),
    updatedAt: new Date()
  }
}

export function createFloor (name: string, level: number, height: number = 3000): Floor {
  return {
    id: createFloorId(),
    name,
    level,
    height,
    wallIds: [],
    roomIds: [],
    connectionPointIds: [],
    openingIds: []
  }
}

export function createConnectionPoint (position: Point2D): ConnectionPoint {
  return {
    id: createConnectionPointId(),
    position,
    connectedWallIds: []
  }
}

export function createWall (
  startPointId: ConnectionPointId,
  endPointId: ConnectionPointId,
  thickness: number = 200,
  height: number = 3000
): Wall {
  return {
    id: createWallId(),
    startPointId,
    endPointId,
    thickness,
    height,
    openingIds: []
  }
}

export function createRoom (
  name: string,
  wallIds: WallId[] = []
): Room {
  return {
    id: createRoomId(),
    name,
    wallIds,
    area: 0
  }
}

export function createOpening (
  wallId: WallId,
  type: Opening['type'],
  offsetFromStart: number,
  width: number,
  height: number,
  sillHeight?: number
): Opening {
  return {
    id: createOpeningId(),
    wallId,
    type,
    offsetFromStart,
    width,
    height,
    sillHeight
  }
}

export function addFloorToBuilding (building: Building, floor: Floor): Building {
  const updatedBuilding = { ...building }
  updatedBuilding.floors = new Map(building.floors)
  updatedBuilding.floors.set(floor.id, floor)
  updatedBuilding.updatedAt = new Date()
  return updatedBuilding
}

export function addWallToBuilding (building: Building, wall: Wall): Building {
  const updatedBuilding = { ...building }
  updatedBuilding.walls = new Map(building.walls)
  updatedBuilding.walls.set(wall.id, wall)
  updatedBuilding.updatedAt = new Date()
  return updatedBuilding
}

export function addConnectionPointToBuilding (building: Building, connectionPoint: ConnectionPoint): Building {
  const updatedBuilding = { ...building }
  updatedBuilding.connectionPoints = new Map(building.connectionPoints)
  updatedBuilding.connectionPoints.set(connectionPoint.id, connectionPoint)
  updatedBuilding.updatedAt = new Date()
  return updatedBuilding
}

export function calculateBuildingBounds (building: Building): Bounds | null {
  if (building.connectionPoints.size === 0) return null

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const point of building.connectionPoints.values()) {
    minX = Math.min(minX, point.position.x)
    minY = Math.min(minY, point.position.y)
    maxX = Math.max(maxX, point.position.x)
    maxY = Math.max(maxY, point.position.y)
  }

  return { minX, minY, maxX, maxY }
}

export function getWallLength (wall: Wall, building: Building): number {
  const startPoint = building.connectionPoints.get(wall.startPointId)
  const endPoint = building.connectionPoints.get(wall.endPointId)

  if ((startPoint == null) || (endPoint == null)) return 0

  const dx = endPoint.position.x - startPoint.position.x
  const dy = endPoint.position.y - startPoint.position.y

  return Math.sqrt(dx * dx + dy * dy)
}

export function getWallAngle (wall: Wall, building: Building): number {
  const startPoint = building.connectionPoints.get(wall.startPointId)
  const endPoint = building.connectionPoints.get(wall.endPointId)

  if ((startPoint == null) || (endPoint == null)) return 0

  const dx = endPoint.position.x - startPoint.position.x
  const dy = endPoint.position.y - startPoint.position.y

  return Math.atan2(dy, dx)
}

export function getOpeningPosition (opening: Opening, building: Building): Point2D | null {
  const wall = building.walls.get(opening.wallId)
  if (wall == null) return null

  const startPoint = building.connectionPoints.get(wall.startPointId)
  const endPoint = building.connectionPoints.get(wall.endPointId)

  if ((startPoint == null) || (endPoint == null)) return null

  const wallLength = getWallLength(wall, building)
  if (wallLength === 0) return startPoint.position

  // Calculate position along wall using offset
  const t = opening.offsetFromStart / wallLength

  return {
    x: startPoint.position.x + (endPoint.position.x - startPoint.position.x) * t,
    y: startPoint.position.y + (endPoint.position.y - startPoint.position.y) * t
  }
}

export function isOpeningValidOnWall (opening: Opening, building: Building): boolean {
  const wall = building.walls.get(opening.wallId)
  if (wall == null) return false

  const wallLength = getWallLength(wall, building)

  // Check if opening fits within wall bounds
  if (opening.offsetFromStart < 0 || opening.offsetFromStart + opening.width > wallLength) {
    return false
  }

  // Check for overlaps with other openings on the same wall
  for (const otherOpeningId of wall.openingIds) {
    const otherOpening = building.openings.get(otherOpeningId)
    if ((otherOpening == null) || otherOpening.id === opening.id) continue

    const startA = opening.offsetFromStart
    const endA = opening.offsetFromStart + opening.width
    const startB = otherOpening.offsetFromStart
    const endB = otherOpening.offsetFromStart + otherOpening.width

    // Check for overlap
    if (startA < endB && endA > startB) {
      return false
    }
  }

  return true
}

export function removeWallFromBuilding (building: Building, wallId: WallId): Building {
  const wall = building.walls.get(wallId)
  if (wall == null) return building

  const updatedBuilding = { ...building }
  updatedBuilding.walls = new Map(building.walls)
  updatedBuilding.connectionPoints = new Map(building.connectionPoints)
  updatedBuilding.openings = new Map(building.openings)

  updatedBuilding.walls.delete(wallId)

  // Remove wall from connection points
  const startPoint = updatedBuilding.connectionPoints.get(wall.startPointId)
  const endPoint = updatedBuilding.connectionPoints.get(wall.endPointId)

  if (startPoint != null) {
    startPoint.connectedWallIds = startPoint.connectedWallIds.filter(id => id !== wallId)
    if (startPoint.connectedWallIds.length === 0) {
      updatedBuilding.connectionPoints.delete(wall.startPointId)
    }
  }

  if (endPoint != null) {
    endPoint.connectedWallIds = endPoint.connectedWallIds.filter(id => id !== wallId)
    if (endPoint.connectedWallIds.length === 0) {
      updatedBuilding.connectionPoints.delete(wall.endPointId)
    }
  }

  // Remove openings associated with this wall
  for (const openingId of wall.openingIds) {
    updatedBuilding.openings.delete(openingId)
  }

  updatedBuilding.updatedAt = new Date()
  return updatedBuilding
}

export function addRoomToBuilding (building: Building, room: Room): Building {
  const updatedBuilding = { ...building }
  updatedBuilding.rooms = new Map(building.rooms)
  updatedBuilding.rooms.set(room.id, room)
  updatedBuilding.updatedAt = new Date()
  return updatedBuilding
}

export function addOpeningToBuilding (building: Building, opening: Opening): Building {
  // Validate opening before adding
  if (!isOpeningValidOnWall(opening, building)) {
    throw new Error('Invalid opening position: would overlap with existing opening or exceed wall bounds')
  }

  const updatedBuilding = { ...building }
  updatedBuilding.openings = new Map(building.openings)
  updatedBuilding.walls = new Map(building.walls)

  updatedBuilding.openings.set(opening.id, opening)

  // Add opening to wall's opening list
  const wall = updatedBuilding.walls.get(opening.wallId)
  if (wall != null) {
    const updatedWall = { ...wall }
    updatedWall.openingIds = [...wall.openingIds, opening.id]
    updatedBuilding.walls.set(wall.id, updatedWall)
  }

  updatedBuilding.updatedAt = new Date()
  return updatedBuilding
}

export function connectWalls (building: Building, wallId1: WallId, wallId2: WallId): Building {
  const wall1 = building.walls.get(wallId1)
  const wall2 = building.walls.get(wallId2)

  if ((wall1 == null) || (wall2 == null)) return building

  const updatedBuilding = { ...building }
  updatedBuilding.connectionPoints = new Map(building.connectionPoints)
  updatedBuilding.walls = new Map(building.walls)

  // Find connection points to merge
  const wall1End = updatedBuilding.connectionPoints.get(wall1.endPointId)
  const wall2Start = updatedBuilding.connectionPoints.get(wall2.startPointId)

  // Connect walls at shared connection points
  if ((wall1End != null) && (wall2Start != null) &&
      Math.abs(wall1End.position.x - wall2Start.position.x) < 0.01 &&
      Math.abs(wall1End.position.y - wall2Start.position.y) < 0.01) {
    // Merge connection points
    wall1End.connectedWallIds = [...new Set([...wall1End.connectedWallIds, ...wall2Start.connectedWallIds])]

    // Update wall2 to use wall1's end point
    const updatedWall2 = { ...wall2, startPointId: wall1.endPointId }
    updatedBuilding.walls.set(wallId2, updatedWall2)

    // Remove redundant connection point
    updatedBuilding.connectionPoints.delete(wall2.startPointId)
  }

  updatedBuilding.updatedAt = new Date()
  return updatedBuilding
}

export function calculateRoomArea (room: Room, building: Building): number {
  if (room.wallIds.length < 3) return 0

  const points: Point2D[] = []

  // Get all connection points from room walls to form polygon
  for (const wallId of room.wallIds) {
    const wall = building.walls.get(wallId)
    if (wall == null) continue

    const startPoint = building.connectionPoints.get(wall.startPointId)
    const endPoint = building.connectionPoints.get(wall.endPointId)

    if ((startPoint != null) && (points.find(p => p.x === startPoint.position.x && p.y === startPoint.position.y) == null)) {
      points.push(startPoint.position)
    }
    if ((endPoint != null) && (points.find(p => p.x === endPoint.position.x && p.y === endPoint.position.y) == null)) {
      points.push(endPoint.position)
    }
  }

  if (points.length < 3) return 0

  // Calculate polygon area using shoelace formula
  let area = 0
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length
    area += points[i].x * points[j].y
    area -= points[j].x * points[i].y
  }

  return Math.abs(area) / 2
}

export function findNearestConnectionPoint (
  building: Building,
  target: Point2D,
  maxDistance: number = 50
): ConnectionPoint | null {
  let nearest: ConnectionPoint | null = null
  let minDistance = maxDistance

  for (const point of building.connectionPoints.values()) {
    const dx = point.position.x - target.x
    const dy = point.position.y - target.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance < minDistance) {
      minDistance = distance
      nearest = point
    }
  }

  return nearest
}

export function getWallsOnFloor (building: Building, floorId: FloorId): Wall[] {
  const floor = building.floors.get(floorId)
  if (floor == null) return []

  return floor.wallIds
    .map(id => building.walls.get(id))
    .filter((wall): wall is Wall => wall !== undefined)
}

export function getRoomsOnFloor (building: Building, floorId: FloorId): Room[] {
  const floor = building.floors.get(floorId)
  if (floor == null) return []

  return floor.roomIds
    .map((id: any) => building.rooms.get(id))
    .filter((room: any): room is Room => room !== undefined)
}

// Helper function to add room to active floor
export function addRoomToFloor (building: Building, room: Room, floorId: FloorId): Building {
  const updatedBuilding = addRoomToBuilding(building, room)
  const updatedFloors = new Map(updatedBuilding.floors)
  const floor = updatedFloors.get(floorId)
  
  if (floor != null) {
    const updatedFloor = {
      ...floor,
      roomIds: [...floor.roomIds, room.id]
    }
    updatedFloors.set(floorId, updatedFloor)
    updatedBuilding.floors = updatedFloors
  }
  
  return updatedBuilding
}

// Helper function to add wall to active floor
export function addWallToFloor (building: Building, wall: Wall, floorId: FloorId): Building {
  const updatedBuilding = addWallToBuilding(building, wall)
  const updatedFloors = new Map(updatedBuilding.floors)
  const floor = updatedFloors.get(floorId)
  
  if (floor != null) {
    const updatedFloor = {
      ...floor,
      wallIds: [...floor.wallIds, wall.id]
    }
    updatedFloors.set(floorId, updatedFloor)
    updatedBuilding.floors = updatedFloors
  }
  
  return updatedBuilding
}

// Helper function to add connection point to active floor
export function addConnectionPointToFloor (building: Building, point: ConnectionPoint, floorId: FloorId): Building {
  const updatedBuilding = addConnectionPointToBuilding(building, point)
  const updatedFloors = new Map(updatedBuilding.floors)
  const floor = updatedFloors.get(floorId)
  
  if (floor != null) {
    const updatedFloor = {
      ...floor,
      connectionPointIds: [...floor.connectionPointIds, point.id]
    }
    updatedFloors.set(floorId, updatedFloor)
    updatedBuilding.floors = updatedFloors
  }
  
  return updatedBuilding
}
