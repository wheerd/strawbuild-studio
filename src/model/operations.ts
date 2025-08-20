import {
  type ModelState,
  type Wall,
  type Room,
  type Point,
  type Opening,
  type Floor,
  type Corner,
  type Slab,
  type Roof,
  createFloorLevel,
  type FloorLevel
} from '@/types/model'
import type {
  WallId,
  PointId,
  FloorId
} from '@/types/ids'
import {
  createWallId,
  createPointId,
  createRoomId,
  createFloorId,
  createCornerId,
  createSlabId,
  createRoofId
} from '@/types/ids'
import {
  createLength,
  createArea,
  createAngle,
  createAbsoluteOffset,
  type Point2D,
  type Bounds2D,
  type Polygon2D,
  type Length,
  type Area,
  type Angle,
  distance,
  boundsFromPoints,
  calculatePolygonArea

} from '@/types/geometry'

// Create empty model state with default ground floor
export function createEmptyModelState (): ModelState {
  const groundFloor = createFloor('Ground Floor', createFloorLevel(0), createLength(3000))

  return {
    floors: new Map([[groundFloor.id, groundFloor]]),
    walls: new Map(),
    rooms: new Map(),
    points: new Map(),
    corners: new Map(),
    slabs: new Map(),
    roofs: new Map(),
    createdAt: new Date(),
    updatedAt: new Date()
  }
}

// Factory functions for creating entities
export function createFloor (name: string, level: FloorLevel, height: Length): Floor {
  return {
    id: createFloorId(),
    name,
    level,
    height,
    wallIds: [],
    roomIds: [],
    pointIds: [],
    slabIds: [],
    roofIds: [],
    area: createArea(0)
  }
}

export function createPoint (position: Point2D): Point {
  return {
    id: createPointId(),
    position
  }
}

export function createWall (
  startPointId: PointId,
  endPointId: PointId,
  heightAtStart: Length,
  heightAtEnd: Length,
  thickness: Length,
  type: Wall['type'] = 'other',
  outsideDirection?: 'left' | 'right'
): Wall {
  // Create a simple rectangular shape for the wall
  // This is a computed property that would normally be calculated based on points and thickness
  const shape: Polygon2D = {
    points: [
      { x: createAbsoluteOffset(0), y: createAbsoluteOffset(0) },
      { x: createAbsoluteOffset(0), y: createAbsoluteOffset(0) },
      { x: createAbsoluteOffset(0), y: createAbsoluteOffset(0) },
      { x: createAbsoluteOffset(0), y: createAbsoluteOffset(0) }
    ]
  }

  return {
    id: createWallId(),
    startPointId,
    endPointId,
    heightAtStart,
    heightAtEnd,
    thickness,
    type,
    outsideDirection,
    shape
  }
}

export function createRoom (name: string, wallIds: WallId[] = []): Room {
  return {
    id: createRoomId(),
    name,
    wallIds,
    area: createArea(0)
  }
}

export function createOpening (
  type: Opening['type'],
  offsetFromStart: Length,
  width: Length,
  height: Length,
  sillHeight?: Length
): Opening {
  return {
    type,
    offsetFromStart,
    width,
    height,
    sillHeight
  }
}

export function createCorner (
  pointId: PointId,
  wall1Id: WallId,
  wall2Id: WallId,
  angle: Angle,
  type: Corner['type'],
  area: Polygon2D,
  otherWallIds?: WallId[]
): Corner {
  return {
    id: createCornerId(),
    pointId,
    wall1Id,
    wall2Id,
    otherWallIds,
    angle,
    type,
    area
  }
}

export function createSlab (polygon: Polygon2D, thickness: Length): Slab {
  return {
    id: createSlabId(),
    polygon: { outer: polygon, holes: [] },
    thickness,
    area: calculatePolygonArea(polygon)
  }
}

export function createRoof (
  polygon: Polygon2D,
  thickness: Length,
  overhang: Length,
  orientation: Roof['orientation'],
  ridgeHeight: Length,
  eaveHeight: Length
): Roof {
  return {
    id: createRoofId(),
    polygon,
    thickness,
    overhang,
    slope: createAngle(0), // Computed property
    orientation,
    ridgeHeight,
    eaveHeight,
    area: calculatePolygonArea(polygon)
  }
}

// State manipulation functions
export function addFloorToState (state: ModelState, floor: Floor): ModelState {
  const updatedState = { ...state }
  updatedState.floors = new Map(state.floors)
  updatedState.floors.set(floor.id, floor)
  updatedState.updatedAt = new Date()
  return updatedState
}

export function addPointToFloor (state: ModelState, point: Point, floorId: FloorId): ModelState {
  const floor = state.floors.get(floorId)
  if (floor == null) {
    throw new Error(`Floor ${floorId} not found`)
  }

  const updatedState = { ...state }
  updatedState.points = new Map(state.points)
  updatedState.floors = new Map(state.floors)

  updatedState.points.set(point.id, point)

  const updatedFloor = {
    ...floor,
    pointIds: [...floor.pointIds, point.id]
  }

  // Update floor bounds
  const floorPoints = updatedFloor.pointIds
    .map(id => updatedState.points.get(id))
    .filter((p): p is Point => p !== undefined)
    .map(p => p.position)

  if (floorPoints.length > 0) {
    const bounds = boundsFromPoints(floorPoints)
    if (bounds != null) {
      updatedFloor.bounds = bounds
      updatedState.bounds = bounds
    }
  }

  updatedState.floors.set(floorId, updatedFloor)
  updatedState.updatedAt = new Date()
  return updatedState
}

export function addWallToFloor (state: ModelState, wall: Wall, floorId: FloorId): ModelState {
  const floor = state.floors.get(floorId)
  if (floor == null) {
    throw new Error(`Floor ${floorId} not found`)
  }

  const updatedState = { ...state }
  updatedState.walls = new Map(state.walls)
  updatedState.floors = new Map(state.floors)

  updatedState.walls.set(wall.id, wall)

  const updatedFloor = {
    ...floor,
    wallIds: [...floor.wallIds, wall.id]
  }

  updatedState.floors.set(floorId, updatedFloor)
  updatedState.updatedAt = new Date()
  return updatedState
}

export function addRoomToFloor (state: ModelState, room: Room, floorId: FloorId): ModelState {
  const floor = state.floors.get(floorId)
  if (floor == null) {
    throw new Error(`Floor ${floorId} not found`)
  }

  const updatedState = { ...state }
  updatedState.rooms = new Map(state.rooms)
  updatedState.floors = new Map(state.floors)

  updatedState.rooms.set(room.id, room)

  const updatedFloor = {
    ...floor,
    roomIds: [...floor.roomIds, room.id]
  }

  updatedState.floors.set(floorId, updatedFloor)
  updatedState.updatedAt = new Date()
  return updatedState
}

export function addSlabToFloor (state: ModelState, slab: Slab, floorId: FloorId): ModelState {
  const floor = state.floors.get(floorId)
  if (floor == null) {
    throw new Error(`Floor ${floorId} not found`)
  }

  const updatedState = { ...state }
  updatedState.slabs = new Map(state.slabs)
  updatedState.floors = new Map(state.floors)

  updatedState.slabs.set(slab.id, slab)

  const updatedFloor = {
    ...floor,
    slabIds: [...floor.slabIds, slab.id]
  }

  updatedState.floors.set(floorId, updatedFloor)
  updatedState.updatedAt = new Date()
  return updatedState
}

export function addRoofToFloor (state: ModelState, roof: Roof, floorId: FloorId): ModelState {
  const floor = state.floors.get(floorId)
  if (floor == null) {
    throw new Error(`Floor ${floorId} not found`)
  }

  const updatedState = { ...state }
  updatedState.roofs = new Map(state.roofs)
  updatedState.floors = new Map(state.floors)

  updatedState.roofs.set(roof.id, roof)

  const updatedFloor = {
    ...floor,
    roofIds: [...floor.roofIds, roof.id]
  }

  updatedState.floors.set(floorId, updatedFloor)
  updatedState.updatedAt = new Date()
  return updatedState
}

// Utility functions
export function calculateStateBounds (state: ModelState): Bounds2D | null {
  if (state.points.size === 0) return null

  const allPoints = Array.from(state.points.values()).map(point => point.position)
  return boundsFromPoints(allPoints)
}

export function calculateFloorBounds (floorId: FloorId, state: ModelState): Bounds2D | null {
  const floor = state.floors.get(floorId)
  if (floor == null || floor.pointIds.length === 0) return null

  const floorPoints = floor.pointIds
    .map(id => state.points.get(id))
    .filter((p): p is Point => p !== undefined)
    .map(p => p.position)

  return boundsFromPoints(floorPoints)
}

export function getWallLength (wall: Wall, state: ModelState): Length {
  const startPoint = state.points.get(wall.startPointId)
  const endPoint = state.points.get(wall.endPointId)

  if (startPoint == null || endPoint == null) return createLength(0)

  return distance(startPoint.position, endPoint.position)
}

export function calculateRoomArea (room: Room, state: ModelState): Area {
  if (room.wallIds.length < 3) return createArea(0)

  // Simplified room area calculation
  // In a real implementation, this would trace the wall connections to form a polygon
  const points: Point2D[] = []

  for (const wallId of room.wallIds) {
    const wall = state.walls.get(wallId)
    if (wall == null) continue

    const startPoint = state.points.get(wall.startPointId)
    const endPoint = state.points.get(wall.endPointId)

    if (startPoint != null && !points.some(p => p.x === startPoint.position.x && p.y === startPoint.position.y)) {
      points.push(startPoint.position)
    }
    if (endPoint != null && !points.some(p => p.x === endPoint.position.x && p.y === endPoint.position.y)) {
      points.push(endPoint.position)
    }
  }

  if (points.length < 3) return createArea(0)

  return calculatePolygonArea({ points })
}

export function findNearestPoint (
  state: ModelState,
  target: Point2D,
  maxDistance: Length = createLength(50)
): Point | null {
  let nearest: Point | null = null
  let minDistance = maxDistance

  for (const point of state.points.values()) {
    const dist = distance(point.position, target)
    if (dist < minDistance) {
      minDistance = dist
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

export function removeWallFromFloor (state: ModelState, wallId: WallId, floorId: FloorId): ModelState {
  const wall = state.walls.get(wallId)
  const floor = state.floors.get(floorId)

  if (wall == null || floor == null) return state

  const updatedState = { ...state }
  updatedState.walls = new Map(state.walls)
  updatedState.floors = new Map(state.floors)

  updatedState.walls.delete(wallId)

  const updatedFloor = {
    ...floor,
    wallIds: floor.wallIds.filter(id => id !== wallId)
  }

  updatedState.floors.set(floorId, updatedFloor)
  updatedState.updatedAt = new Date()
  return updatedState
}

// Wall shape calculation (computed property implementation)
export function calculateWallShape (wall: Wall, state: ModelState): Polygon2D {
  const startPoint = state.points.get(wall.startPointId)
  const endPoint = state.points.get(wall.endPointId)

  if (startPoint == null || endPoint == null) {
    return { points: [] }
  }

  // Simplified wall shape calculation
  // In reality, this would create a proper polygon considering wall thickness and connections
  const start = startPoint.position
  const end = endPoint.position

  // Create a simple rectangular shape
  const thickness = Number(wall.thickness) / 2
  const dx = end.x - start.x
  const dy = end.y - start.y
  const length = Math.sqrt(dx * dx + dy * dy)

  if (length === 0) {
    return { points: [] }
  }

  // Perpendicular vector for wall thickness
  const perpX = -dy / length * thickness
  const perpY = dx / length * thickness

  return {
    points: [
      { x: createAbsoluteOffset(start.x + perpX), y: createAbsoluteOffset(start.y + perpY) },
      { x: createAbsoluteOffset(end.x + perpX), y: createAbsoluteOffset(end.y + perpY) },
      { x: createAbsoluteOffset(end.x - perpX), y: createAbsoluteOffset(end.y - perpY) },
      { x: createAbsoluteOffset(start.x - perpX), y: createAbsoluteOffset(start.y - perpY) }
    ]
  }
}

// Helper function to get entities on a floor
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

export function getPointsOnFloor (state: ModelState, floorId: FloorId): Point[] {
  const floor = state.floors.get(floorId)
  if (floor == null) return []

  return floor.pointIds
    .map(id => state.points.get(id))
    .filter((point): point is Point => point !== undefined)
}

export function getSlabsOnFloor (state: ModelState, floorId: FloorId): Slab[] {
  const floor = state.floors.get(floorId)
  if (floor == null) return []

  return floor.slabIds
    .map(id => state.slabs.get(id))
    .filter((slab): slab is Slab => slab !== undefined)
}

export function getRoofsOnFloor (state: ModelState, floorId: FloorId): Roof[] {
  const floor = state.floors.get(floorId)
  if (floor == null) return []

  return floor.roofIds
    .map(id => state.roofs.get(id))
    .filter((roof): roof is Roof => roof !== undefined)
}

// Opening validation for walls
export function isOpeningValidOnWall (
  wall: Wall,
  opening: Opening,
  state: ModelState
): boolean {
  const wallLength = getWallLength(wall, state)

  if (opening.offsetFromStart < createLength(0) ||
      Number(opening.offsetFromStart) + Number(opening.width) > Number(wallLength)) {
    return false
  }

  // Check for overlapping openings in the wall
  if (wall.openings != null) {
    for (const existingOpening of wall.openings) {
      if (existingOpening === opening) continue

      const startA = Number(opening.offsetFromStart)
      const endA = Number(opening.offsetFromStart) + Number(opening.width)
      const startB = Number(existingOpening.offsetFromStart)
      const endB = Number(existingOpening.offsetFromStart) + Number(existingOpening.width)

      if (startA < endB && endA > startB) {
        return false
      }
    }
  }

  return true
}

// Helper function to add opening to wall
export function addOpeningToWall (wall: Wall, opening: Opening, state: ModelState): Wall {
  if (!isOpeningValidOnWall(wall, opening, state)) {
    throw new Error('Invalid opening position: would overlap with existing opening or exceed wall bounds')
  }

  return {
    ...wall,
    openings: (wall.openings != null) ? [...wall.openings, opening] : [opening]
  }
}
