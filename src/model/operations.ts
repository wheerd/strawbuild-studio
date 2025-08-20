import type {
  ModelState,
  Wall,
  Room,
  Point,
  Opening,
  Floor,
  Point2D,
  Bounds2D
} from '../types/model'
import type {
  WallId,
  PointId,
  FloorId
} from '../types/ids'
import {
  createWallId,
  createPointId,
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
    points: new Map(),
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
    pointIds: [],
    openingIds: []
  }
}

export function createPoint (position: Point2D, floorId: FloorId): Point {
  return {
    id: createPointId(),
    floorId,
    position,
    connectedWallIds: []
  }
}

export function createWall (
  startPointId: PointId,
  endPointId: PointId,
  floorId: FloorId,
  thickness: number = 200,
  height: number = 3000
): Wall {
  return {
    id: createWallId(),
    floorId,
    startPointId,
    endPointId,
    thickness,
    height,
    openingIds: []
  }
}

export function createRoom (
  name: string,
  floorId: FloorId,
  wallIds: WallId[] = []
): Room {
  return {
    id: createRoomId(),
    floorId,
    name,
    wallIds,
    area: 0
  }
}

export function createOpening (
  wallId: WallId,
  floorId: FloorId,
  type: Opening['type'],
  offsetFromStart: number,
  width: number,
  height: number,
  sillHeight?: number
): Opening {
  return {
    id: createOpeningId(),
    floorId,
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

  // Add wall to the floor's wall collection
  const updatedFloors = new Map(state.floors)
  const floor = updatedFloors.get(wall.floorId)

  if (floor != null) {
    const updatedFloor = {
      ...floor,
      wallIds: [...floor.wallIds, wall.id]
    }

    // Calculate new bounds for the floor
    const tempState = { ...updatedState, floors: new Map(updatedFloors).set(wall.floorId, updatedFloor) }
    const bounds = calculateFloorBounds(wall.floorId, tempState)
    updatedFloor.bounds = bounds ?? undefined

    updatedFloors.set(wall.floorId, updatedFloor)
    updatedState.floors = updatedFloors
  }

  updatedState.updatedAt = new Date()
  return updatedState
}

export function addPointToState (state: ModelState, point: Point): ModelState {
  const updatedState = { ...state }
  updatedState.points = new Map(state.points)
  updatedState.points.set(point.id, point)
  updatedState.updatedAt = new Date()
  return updatedState
}

export function calculateStateBounds (state: ModelState): Bounds2D | null {
  if (state.points.size === 0) return null

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const point of state.points.values()) {
    minX = Math.min(minX, point.position.x)
    minY = Math.min(minY, point.position.y)
    maxX = Math.max(maxX, point.position.x)
    maxY = Math.max(maxY, point.position.y)
  }

  return { minX, minY, maxX, maxY }
}

export function calculateFloorBounds (floorId: FloorId, state: ModelState): Bounds2D | null {
  const floor = state.floors.get(floorId)
  if ((floor == null) || floor.pointIds.length === 0) return null

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const pointId of floor.pointIds) {
    const point = state.points.get(pointId)
    if (point != null) {
      minX = Math.min(minX, point.position.x)
      minY = Math.min(minY, point.position.y)
      maxX = Math.max(maxX, point.position.x)
      maxY = Math.max(maxY, point.position.y)
    }
  }

  if (minX === Infinity) return null
  return { minX, minY, maxX, maxY }
}

export function getWallLength (wall: Wall, state: ModelState): number {
  const startPoint = state.points.get(wall.startPointId)
  const endPoint = state.points.get(wall.endPointId)

  if ((startPoint == null) || (endPoint == null)) return 0

  const dx = endPoint.position.x - startPoint.position.x
  const dy = endPoint.position.y - startPoint.position.y

  return Math.sqrt(dx * dx + dy * dy)
}

export function getWallAngle (wall: Wall, state: ModelState): number {
  const startPoint = state.points.get(wall.startPointId)
  const endPoint = state.points.get(wall.endPointId)

  if ((startPoint == null) || (endPoint == null)) return 0

  const dx = endPoint.position.x - startPoint.position.x
  const dy = endPoint.position.y - startPoint.position.y

  return Math.atan2(dy, dx)
}

export function getOpeningPosition (opening: Opening, state: ModelState): Point2D | null {
  const wall = state.walls.get(opening.wallId)
  if (wall == null) return null

  const startPoint = state.points.get(wall.startPointId)
  const endPoint = state.points.get(wall.endPointId)

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
  updatedState.points = new Map(state.points)
  updatedState.openings = new Map(state.openings)

  updatedState.walls.delete(wallId)

  const startPoint = updatedState.points.get(wall.startPointId)
  const endPoint = updatedState.points.get(wall.endPointId)

  if (startPoint != null) {
    startPoint.connectedWallIds = startPoint.connectedWallIds.filter(id => id !== wallId)
    if (startPoint.connectedWallIds.length === 0) {
      updatedState.points.delete(wall.startPointId)
    }
  }

  if (endPoint != null) {
    endPoint.connectedWallIds = endPoint.connectedWallIds.filter(id => id !== wallId)
    if (endPoint.connectedWallIds.length === 0) {
      updatedState.points.delete(wall.endPointId)
    }
  }

  for (const openingId of wall.openingIds) {
    updatedState.openings.delete(openingId)
  }

  // Remove wall and its openings from floor collections
  const updatedFloors = new Map(state.floors)
  const floor = updatedFloors.get(wall.floorId)

  if (floor != null) {
    const updatedFloor = {
      ...floor,
      wallIds: floor.wallIds.filter(id => id !== wallId),
      openingIds: floor.openingIds.filter(id => !wall.openingIds.includes(id)),
      pointIds: floor.pointIds.filter(id => {
        // Keep connection points that are still connected to other walls
        const point = updatedState.points.get(id)
        return point != null && point.connectedWallIds.length > 0
      })
    }

    // Calculate new bounds for the floor
    const tempState = { ...updatedState, floors: new Map(updatedFloors).set(wall.floorId, updatedFloor) }
    const bounds = calculateFloorBounds(wall.floorId, tempState)
    updatedFloor.bounds = bounds ?? undefined

    updatedFloors.set(wall.floorId, updatedFloor)
    updatedState.floors = updatedFloors
  }

  updatedState.updatedAt = new Date()
  return updatedState
}

export function addRoomToState (state: ModelState, room: Room): ModelState {
  const updatedState = { ...state }
  updatedState.rooms = new Map(state.rooms)
  updatedState.rooms.set(room.id, room)

  // Add room to the floor's room collection
  const updatedFloors = new Map(state.floors)
  const floor = updatedFloors.get(room.floorId)

  if (floor != null) {
    const updatedFloor = {
      ...floor,
      roomIds: [...floor.roomIds, room.id]
    }
    updatedFloors.set(room.floorId, updatedFloor)
    updatedState.floors = updatedFloors
  }

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

    // Add opening to the floor's opening collection
    const updatedFloors = new Map(state.floors)
    const floor = updatedFloors.get(opening.floorId)

    if (floor != null) {
      const updatedFloor = {
        ...floor,
        openingIds: [...floor.openingIds, opening.id]
      }
      updatedFloors.set(opening.floorId, updatedFloor)
      updatedState.floors = updatedFloors
    }
  }

  updatedState.updatedAt = new Date()
  return updatedState
}

export function connectWalls (state: ModelState, wallId1: WallId, wallId2: WallId): ModelState {
  const wall1 = state.walls.get(wallId1)
  const wall2 = state.walls.get(wallId2)

  if ((wall1 == null) || (wall2 == null)) return state

  const updatedState = { ...state }
  updatedState.points = new Map(state.points)
  updatedState.walls = new Map(state.walls)

  const wall1End = updatedState.points.get(wall1.endPointId)
  const wall2Start = updatedState.points.get(wall2.startPointId)

  if ((wall1End != null) && (wall2Start != null) &&
      Math.abs(wall1End.position.x - wall2Start.position.x) < 0.01 &&
      Math.abs(wall1End.position.y - wall2Start.position.y) < 0.01) {
    wall1End.connectedWallIds = [...new Set([...wall1End.connectedWallIds, ...wall2Start.connectedWallIds])]

    const updatedWall2 = { ...wall2, startPointId: wall1.endPointId }
    updatedState.walls.set(wallId2, updatedWall2)

    updatedState.points.delete(wall2.startPointId)
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

    const startPoint = state.points.get(wall.startPointId)
    const endPoint = state.points.get(wall.endPointId)

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

export function findNearestPoint (
  state: ModelState,
  target: Point2D,
  maxDistance: number = 50
): Point | null {
  let nearest: Point | null = null
  let minDistance = maxDistance

  for (const point of state.points.values()) {
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

export function movePoint (
  state: ModelState,
  pointId: PointId,
  newPosition: Point2D
): ModelState {
  const point = state.points.get(pointId)
  if (point == null) return state

  const updatedState = { ...state }
  updatedState.points = new Map(state.points)

  const updatedPoint = { ...point, position: newPosition }
  updatedState.points.set(pointId, updatedPoint)

  updatedState.updatedAt = new Date()
  return updatedState
}

export function moveWall (
  state: ModelState,
  wallId: WallId,
  deltaX: number,
  deltaY: number
): ModelState {
  const wall = state.walls.get(wallId)
  if (wall == null) return state

  const startPoint = state.points.get(wall.startPointId)
  const endPoint = state.points.get(wall.endPointId)

  if ((startPoint == null) || (endPoint == null)) return state

  let updatedState = state

  // Move start point
  updatedState = movePoint(updatedState, wall.startPointId, {
    x: startPoint.position.x + deltaX,
    y: startPoint.position.y + deltaY
  })

  // Move end point
  updatedState = movePoint(updatedState, wall.endPointId, {
    x: endPoint.position.x + deltaX,
    y: endPoint.position.y + deltaY
  })

  return updatedState
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

    // Calculate new bounds for the floor (walls depend on connection points)
    const tempState = { ...updatedState, floors: new Map(updatedFloors).set(floorId, updatedFloor) }
    const bounds = calculateFloorBounds(floorId, tempState)
    updatedFloor.bounds = bounds ?? undefined

    updatedFloors.set(floorId, updatedFloor)
    updatedState.floors = updatedFloors
  }

  return updatedState
}

export function addPointToFloor (state: ModelState, point: Point, floorId: FloorId): ModelState {
  const updatedState = addPointToState(state, point)
  const updatedFloors = new Map(updatedState.floors)
  const floor = updatedFloors.get(floorId)

  if (floor != null) {
    const updatedFloor = {
      ...floor,
      pointIds: [...floor.pointIds, point.id]
    }

    // Calculate new bounds for the floor
    const tempState = { ...updatedState, floors: new Map(updatedFloors).set(floorId, updatedFloor) }
    const bounds = calculateFloorBounds(floorId, tempState)
    updatedFloor.bounds = bounds ?? undefined

    updatedFloors.set(floorId, updatedFloor)
    updatedState.floors = updatedFloors
  }

  return updatedState
}

// Validation functions for floor ID consistency
export function validateFloorConsistency (state: ModelState): { valid: boolean, errors: string[] } {
  const errors: string[] = []

  // Check that all connection points reference valid floors and are listed in their floors
  for (const [pointId, point] of state.points.entries()) {
    const floor = state.floors.get(point.floorId)
    if (floor == null) {
      errors.push(`Connection point ${pointId} references non-existent floor ${point.floorId}`)
    } else if (!floor.pointIds.includes(pointId)) {
      errors.push(`Floor ${point.floorId} missing connection point ${pointId} in its pointIds array`)
    }
  }

  // Check that all walls reference valid floors and are listed in their floors
  for (const [wallId, wall] of state.walls.entries()) {
    const floor = state.floors.get(wall.floorId)
    if (floor == null) {
      errors.push(`Wall ${wallId} references non-existent floor ${wall.floorId}`)
    } else if (!floor.wallIds.includes(wallId)) {
      errors.push(`Floor ${wall.floorId} missing wall ${wallId} in its wallIds array`)
    }

    // Check that wall's connection points are on the same floor
    const startPoint = state.points.get(wall.startPointId)
    const endPoint = state.points.get(wall.endPointId)
    if ((startPoint != null) && startPoint.floorId !== wall.floorId) {
      errors.push(`Wall ${wallId} start point is on floor ${startPoint.floorId} but wall is on floor ${wall.floorId}`)
    }
    if ((endPoint != null) && endPoint.floorId !== wall.floorId) {
      errors.push(`Wall ${wallId} end point is on floor ${endPoint.floorId} but wall is on floor ${wall.floorId}`)
    }
  }

  // Check that all rooms reference valid floors and are listed in their floors
  for (const [roomId, room] of state.rooms.entries()) {
    const floor = state.floors.get(room.floorId)
    if (floor == null) {
      errors.push(`Room ${roomId} references non-existent floor ${room.floorId}`)
    } else if (!floor.roomIds.includes(roomId)) {
      errors.push(`Floor ${room.floorId} missing room ${roomId} in its roomIds array`)
    }

    // Check that room's walls are on the same floor
    for (const wallId of room.wallIds) {
      const wall = state.walls.get(wallId)
      if ((wall != null) && wall.floorId !== room.floorId) {
        errors.push(`Room ${roomId} references wall ${wallId} on different floor (room: ${room.floorId}, wall: ${wall.floorId})`)
      }
    }
  }

  // Check that all openings reference valid floors and are listed in their floors
  for (const [openingId, opening] of state.openings.entries()) {
    const floor = state.floors.get(opening.floorId)
    if (floor == null) {
      errors.push(`Opening ${openingId} references non-existent floor ${opening.floorId}`)
    } else if (!floor.openingIds.includes(openingId)) {
      errors.push(`Floor ${opening.floorId} missing opening ${openingId} in its openingIds array`)
    }

    // Check that opening's wall is on the same floor
    const wall = state.walls.get(opening.wallId)
    if ((wall != null) && wall.floorId !== opening.floorId) {
      errors.push(`Opening ${openingId} is on floor ${opening.floorId} but its wall ${opening.wallId} is on floor ${wall.floorId}`)
    }
  }

  // Check that floors don't reference non-existent entities
  for (const [floorId, floor] of state.floors.entries()) {
    for (const pointId of floor.pointIds) {
      if (!state.points.has(pointId)) {
        errors.push(`Floor ${floorId} references non-existent connection point ${pointId}`)
      }
    }

    for (const wallId of floor.wallIds) {
      if (!state.walls.has(wallId)) {
        errors.push(`Floor ${floorId} references non-existent wall ${wallId}`)
      }
    }

    for (const roomId of floor.roomIds) {
      if (!state.rooms.has(roomId)) {
        errors.push(`Floor ${floorId} references non-existent room ${roomId}`)
      }
    }

    for (const openingId of floor.openingIds) {
      if (!state.openings.has(openingId)) {
        errors.push(`Floor ${floorId} references non-existent opening ${openingId}`)
      }
    }
  }

  return { valid: errors.length === 0, errors }
}
