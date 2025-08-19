import type {
  ModelState,
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

export function createEmptyModelState (): ModelState {
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

export function addFloorToState (state: ModelState, floor: Floor): ModelState {
  const updatedState = { ...state }
  updatedState.floors = new Map(state.floors)
  updatedState.floors.set(floor.id, floor)
  updatedState.updatedAt = new Date()
  return updatedState
}

export function addWallToState (state: ModelState, wall: Wall): ModelState {
  const updatedState = { ...state }
  updatedState.walls = new Map(state.walls)
  updatedState.walls.set(wall.id, wall)
  updatedState.updatedAt = new Date()
  return updatedState
}

export function addConnectionPointToState (state: ModelState, connectionPoint: ConnectionPoint): ModelState {
  const updatedState = { ...state }
  updatedState.connectionPoints = new Map(state.connectionPoints)
  updatedState.connectionPoints.set(connectionPoint.id, connectionPoint)
  updatedState.updatedAt = new Date()
  return updatedState
}

export function calculateStateBounds (state: ModelState): Bounds | null {
  if (state.connectionPoints.size === 0) return null

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const point of state.connectionPoints.values()) {
    minX = Math.min(minX, point.position.x)
    minY = Math.min(minY, point.position.y)
    maxX = Math.max(maxX, point.position.x)
    maxY = Math.max(maxY, point.position.y)
  }

  return { minX, minY, maxX, maxY }
}

export function getWallLength (wall: Wall, state: ModelState): number {
  const startPoint = state.connectionPoints.get(wall.startPointId)
  const endPoint = state.connectionPoints.get(wall.endPointId)

  if ((startPoint == null) || (endPoint == null)) return 0

  const dx = endPoint.position.x - startPoint.position.x
  const dy = endPoint.position.y - startPoint.position.y

  return Math.sqrt(dx * dx + dy * dy)
}

export function getWallAngle (wall: Wall, state: ModelState): number {
  const startPoint = state.connectionPoints.get(wall.startPointId)
  const endPoint = state.connectionPoints.get(wall.endPointId)

  if ((startPoint == null) || (endPoint == null)) return 0

  const dx = endPoint.position.x - startPoint.position.x
  const dy = endPoint.position.y - startPoint.position.y

  return Math.atan2(dy, dx)
}

export function getOpeningPosition (opening: Opening, state: ModelState): Point2D | null {
  const wall = state.walls.get(opening.wallId)
  if (wall == null) return null

  const startPoint = state.connectionPoints.get(wall.startPointId)
  const endPoint = state.connectionPoints.get(wall.endPointId)

  if ((startPoint == null) || (endPoint == null)) return null

  const wallLength = getWallLength(wall, state)
  if (wallLength === 0) return startPoint.position

  const t = opening.offsetFromStart / wallLength

  return {
    x: startPoint.position.x + (endPoint.position.x - startPoint.position.x) * t,
    y: startPoint.position.y + (endPoint.position.y - startPoint.position.y) * t
  }
}

export function isOpeningValidOnWall (opening: Opening, state: ModelState): boolean {
  const wall = state.walls.get(opening.wallId)
  if (wall == null) return false

  const wallLength = getWallLength(wall, state)

  if (opening.offsetFromStart < 0 || opening.offsetFromStart + opening.width > wallLength) {
    return false
  }

  for (const otherOpeningId of wall.openingIds) {
    const otherOpening = state.openings.get(otherOpeningId)
    if ((otherOpening == null) || otherOpening.id === opening.id) continue

    const startA = opening.offsetFromStart
    const endA = opening.offsetFromStart + opening.width
    const startB = otherOpening.offsetFromStart
    const endB = otherOpening.offsetFromStart + otherOpening.width

    if (startA < endB && endA > startB) {
      return false
    }
  }

  return true
}

export function removeWallFromState (state: ModelState, wallId: WallId): ModelState {
  const wall = state.walls.get(wallId)
  if (wall == null) return state

  const updatedState = { ...state }
  updatedState.walls = new Map(state.walls)
  updatedState.connectionPoints = new Map(state.connectionPoints)
  updatedState.openings = new Map(state.openings)

  updatedState.walls.delete(wallId)

  const startPoint = updatedState.connectionPoints.get(wall.startPointId)
  const endPoint = updatedState.connectionPoints.get(wall.endPointId)

  if (startPoint != null) {
    startPoint.connectedWallIds = startPoint.connectedWallIds.filter(id => id !== wallId)
    if (startPoint.connectedWallIds.length === 0) {
      updatedState.connectionPoints.delete(wall.startPointId)
    }
  }

  if (endPoint != null) {
    endPoint.connectedWallIds = endPoint.connectedWallIds.filter(id => id !== wallId)
    if (endPoint.connectedWallIds.length === 0) {
      updatedState.connectionPoints.delete(wall.endPointId)
    }
  }

  for (const openingId of wall.openingIds) {
    updatedState.openings.delete(openingId)
  }

  updatedState.updatedAt = new Date()
  return updatedState
}

export function addRoomToState (state: ModelState, room: Room): ModelState {
  const updatedState = { ...state }
  updatedState.rooms = new Map(state.rooms)
  updatedState.rooms.set(room.id, room)
  updatedState.updatedAt = new Date()
  return updatedState
}

export function addOpeningToState (state: ModelState, opening: Opening): ModelState {
  if (!isOpeningValidOnWall(opening, state)) {
    throw new Error('Invalid opening position: would overlap with existing opening or exceed wall bounds')
  }

  const updatedState = { ...state }
  updatedState.openings = new Map(state.openings)
  updatedState.walls = new Map(state.walls)

  updatedState.openings.set(opening.id, opening)

  const wall = updatedState.walls.get(opening.wallId)
  if (wall != null) {
    const updatedWall = { ...wall }
    updatedWall.openingIds = [...wall.openingIds, opening.id]
    updatedState.walls.set(wall.id, updatedWall)
  }

  updatedState.updatedAt = new Date()
  return updatedState
}

export function connectWalls (state: ModelState, wallId1: WallId, wallId2: WallId): ModelState {
  const wall1 = state.walls.get(wallId1)
  const wall2 = state.walls.get(wallId2)

  if ((wall1 == null) || (wall2 == null)) return state

  const updatedState = { ...state }
  updatedState.connectionPoints = new Map(state.connectionPoints)
  updatedState.walls = new Map(state.walls)

  const wall1End = updatedState.connectionPoints.get(wall1.endPointId)
  const wall2Start = updatedState.connectionPoints.get(wall2.startPointId)

  if ((wall1End != null) && (wall2Start != null) &&
      Math.abs(wall1End.position.x - wall2Start.position.x) < 0.01 &&
      Math.abs(wall1End.position.y - wall2Start.position.y) < 0.01) {
    wall1End.connectedWallIds = [...new Set([...wall1End.connectedWallIds, ...wall2Start.connectedWallIds])]

    const updatedWall2 = { ...wall2, startPointId: wall1.endPointId }
    updatedState.walls.set(wallId2, updatedWall2)

    updatedState.connectionPoints.delete(wall2.startPointId)
  }

  updatedState.updatedAt = new Date()
  return updatedState
}

export function calculateRoomArea (room: Room, state: ModelState): number {
  if (room.wallIds.length < 3) return 0

  const points: Point2D[] = []

  for (const wallId of room.wallIds) {
    const wall = state.walls.get(wallId)
    if (wall == null) continue

    const startPoint = state.connectionPoints.get(wall.startPointId)
    const endPoint = state.connectionPoints.get(wall.endPointId)

    if ((startPoint != null) && (points.find(p => p.x === startPoint.position.x && p.y === startPoint.position.y) == null)) {
      points.push(startPoint.position)
    }
    if ((endPoint != null) && (points.find(p => p.x === endPoint.position.x && p.y === endPoint.position.y) == null)) {
      points.push(endPoint.position)
    }
  }

  if (points.length < 3) return 0

  let area = 0
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length
    area += points[i].x * points[j].y
    area -= points[j].x * points[i].y
  }

  return Math.abs(area) / 2
}

export function findNearestConnectionPoint (
  state: ModelState,
  target: Point2D,
  maxDistance: number = 50
): ConnectionPoint | null {
  let nearest: ConnectionPoint | null = null
  let minDistance = maxDistance

  for (const point of state.connectionPoints.values()) {
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

export function getWallsOnFloor (state: ModelState, floorId: FloorId): Wall[] {
  const floor = state.floors.get(floorId)
  if (floor == null) return []

  return floor.wallIds
    .map(id => state.walls.get(id))
    .filter((wall): wall is Wall => wall !== undefined)
}

export function getRoomsOnFloor (state: ModelState, floorId: FloorId): Room[] {
  const floor = state.floors.get(floorId)
  if (floor == null) return []

  return floor.roomIds
    .map(id => state.rooms.get(id))
    .filter((room): room is Room => room !== undefined)
}

export function addRoomToFloor (state: ModelState, room: Room, floorId: FloorId): ModelState {
  const updatedState = addRoomToState(state, room)
  const updatedFloors = new Map(updatedState.floors)
  const floor = updatedFloors.get(floorId)
  
  if (floor != null) {
    const updatedFloor = {
      ...floor,
      roomIds: [...floor.roomIds, room.id]
    }
    updatedFloors.set(floorId, updatedFloor)
    updatedState.floors = updatedFloors
  }
  
  return updatedState
}

export function addWallToFloor (state: ModelState, wall: Wall, floorId: FloorId): ModelState {
  const updatedState = addWallToState(state, wall)
  const updatedFloors = new Map(updatedState.floors)
  const floor = updatedFloors.get(floorId)
  
  if (floor != null) {
    const updatedFloor = {
      ...floor,
      wallIds: [...floor.wallIds, wall.id]
    }
    updatedFloors.set(floorId, updatedFloor)
    updatedState.floors = updatedFloors
  }
  
  return updatedState
}

export function addConnectionPointToFloor (state: ModelState, point: ConnectionPoint, floorId: FloorId): ModelState {
  const updatedState = addConnectionPointToState(state, point)
  const updatedFloors = new Map(updatedState.floors)
  const floor = updatedFloors.get(floorId)
  
  if (floor != null) {
    const updatedFloor = {
      ...floor,
      connectionPointIds: [...floor.connectionPointIds, point.id]
    }
    updatedFloors.set(floorId, updatedFloor)
    updatedState.floors = updatedFloors
  }
  
  return updatedState
}