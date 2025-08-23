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
  FloorId,
  CornerId,
  RoomId
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
  createPoint2D,
  createVector2D,
  type Point2D,
  type Bounds2D,
  type Polygon2D,
  type Length,
  type Area,
  type Angle,

  distance,
  boundsFromPoints,
  calculatePolygonArea,
  calculateCornerAngle,
  determineCornerType,
  lineIntersection,
  distanceToInfiniteLine,
  projectPointOntoLine,
  type Line2D
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
      createPoint2D(0, 0),
      createPoint2D(0, 0),
      createPoint2D(0, 0),
      createPoint2D(0, 0)
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
    shape,
    length: createLength(0) // Will be computed when wall is added to state
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

export function addWallToFloor (state: ModelState, wall: Wall, floorId: FloorId, updateRooms: boolean = true): ModelState {
  const floor = state.floors.get(floorId)
  if (floor == null) {
    throw new Error(`Floor ${floorId} not found`)
  }

  const updatedState = { ...state }
  updatedState.walls = new Map(state.walls)
  updatedState.floors = new Map(state.floors)

  // Compute the actual wall length before adding it
  const wallWithLength = {
    ...wall,
    length: getWallLength(wall, updatedState)
  }

  updatedState.walls.set(wall.id, wallWithLength)

  const updatedFloor = {
    ...floor,
    wallIds: [...floor.wallIds, wall.id]
  }

  updatedState.floors.set(floorId, updatedFloor)
  updatedState.updatedAt = new Date()
  
  // Update rooms after adding the wall (if enabled)
  if (updateRooms) {
    return updateRoomsAfterWallChange(updatedState, floorId, wall.id)
  }
  
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

// Snap configuration constants
export const SNAP_CONFIG = {
  pointSnapDistance: createLength(200), // Distance for point-to-point snapping
  lineSnapDistance: createLength(100), // Distance for snapping to alignment lines
  minWallLength: createLength(50) // Minimum wall length to prevent degenerate walls
}

export interface SnapLine {
  type: 'horizontal' | 'vertical' | 'extension' | 'perpendicular'
  line2D: Line2D // Geometric line representation for intersection calculations
}

export interface SnapResult {
  position: Point2D
  lines?: SnapLine[] // Array of 1 or 2 lines to render (1 for line snap, 2 for intersection)
}

// Find existing points for direct point snapping
function findPointSnapPosition (
  state: ModelState,
  target: Point2D,
  fromPoint: Point2D,
  activeFloorId: FloorId
): SnapResult | null {
  const activeFloor = state.floors.get(activeFloorId)
  if (activeFloor == null) return null

  let bestPosition: Point2D | null = null
  let bestDistanceSquared = Number(SNAP_CONFIG.pointSnapDistance) ** 2

  // Only check points on the active floor
  for (const pointId of activeFloor.pointIds) {
    const point = state.points.get(pointId)
    if (point == null) continue

    // Skip if this is the start point (prevent snapping end to start)
    const fromDistSq = (point.position.x - fromPoint.x) ** 2 + (point.position.y - fromPoint.y) ** 2
    if (fromDistSq < 100) continue // 10mm squared

    // Check if target is close enough to this point (using squared distances)
    const targetDistSq = (target.x - point.position.x) ** 2 + (target.y - point.position.y) ** 2

    if (targetDistSq <= bestDistanceSquared) {
      bestDistanceSquared = targetDistSq
      bestPosition = point.position
    }
  }

  return (bestPosition != null) ? { position: bestPosition } : null
}

// Step 2: Generate snap lines for architectural alignment
export function generateSnapLines (
  state: ModelState,
  fromPoint: Point2D,
  activeFloorId: FloorId,
  forStartPoint: boolean = false
): SnapLine[] {
  const snapLines: SnapLine[] = []
  const activeFloor = state.floors.get(activeFloorId)
  if (activeFloor == null) return snapLines

  // 1. Horizontal lines through existing points
  // 2. Vertical lines through existing points
  for (const pointId of activeFloor.pointIds) {
    const point = state.points.get(pointId)
    if (point == null) continue

    // Skip the current start point unless we're generating lines for start point snapping
    const fromDistSq = (point.position.x - fromPoint.x) ** 2 + (point.position.y - fromPoint.y) ** 2
    if (!forStartPoint && fromDistSq < 100) continue // 10mm squared

    // Horizontal line through this point
    snapLines.push({
      type: 'horizontal',
      line2D: {
        point: point.position,
        direction: createVector2D(1, 0)
      }
    })

    // Vertical line through this point
    snapLines.push({
      type: 'vertical',
      line2D: {
        point: point.position,
        direction: createVector2D(0, 1)
      }
    })
  }

  // 3. Extension lines from walls connected to the start point
  // 4. Perpendicular lines to walls connected to the start point
  if (!forStartPoint) {
    // Find walls that have an endpoint at the fromPoint
    for (const wallId of activeFloor.wallIds) {
      const wall = state.walls.get(wallId)
      if (wall == null) continue

      const startPoint = state.points.get(wall.startPointId)
      const endPoint = state.points.get(wall.endPointId)

      if (startPoint == null || endPoint == null) continue

      // Check if either end of the wall is at the fromPoint
      const startDistSq = (startPoint.position.x - fromPoint.x) ** 2 + (startPoint.position.y - fromPoint.y) ** 2
      const endDistSq = (endPoint.position.x - fromPoint.x) ** 2 + (endPoint.position.y - fromPoint.y) ** 2

      // Only generate lines if fromPoint is at one of the wall's endpoints
      if (startDistSq < 100 || endDistSq < 100) { // 10mm squared tolerance
        // Calculate wall direction vector
        const wallDx = endPoint.position.x - startPoint.position.x
        const wallDy = endPoint.position.y - startPoint.position.y
        const wallLengthSq = wallDx * wallDx + wallDy * wallDy

        if (wallLengthSq === 0) continue

        const wallLength = Math.sqrt(wallLengthSq)
        // Extension line (in line with wall) through start point
        snapLines.push({
          type: 'extension',
          line2D: {
            point: fromPoint,
            direction: createVector2D(wallDx / wallLength, wallDy / wallLength)
          }
        })

        // Perpendicular line through start point
        snapLines.push({
          type: 'perpendicular',
          line2D: {
            point: fromPoint,
            direction: createVector2D(-wallDy / wallLength, wallDx / wallLength)
          }
        })
      }
    }
  }

  return snapLines
}

// New simplified snapping function: filter nearby lines first, then check intersections
export function findLineSnapPosition (
  target: Point2D,
  fromPoint: Point2D,
  snapLines: SnapLine[]
): SnapResult | null {
  const lineSnapDistance = Number(SNAP_CONFIG.lineSnapDistance)
  const pointSnapDistance = Number(SNAP_CONFIG.pointSnapDistance)
  const minWallLength = Number(SNAP_CONFIG.minWallLength)

  // Step 1: Filter lines within snapping range
  const nearbyLines: Array<{ line: SnapLine, distance: number, projectedPosition: Point2D }> = []

  for (const line of snapLines) {
    const distance = Number(distanceToInfiniteLine(target, line.line2D))
    if (distance <= lineSnapDistance) {
      const projectedPosition = projectPointOntoLine(target, line.line2D)

      // Check minimum wall length
      const wallLengthSquared = (projectedPosition.x - fromPoint.x) ** 2 + (projectedPosition.y - fromPoint.y) ** 2
      if (wallLengthSquared >= minWallLength * minWallLength) {
        nearbyLines.push({ line, distance, projectedPosition })
      }
    }
  }

  if (nearbyLines.length === 0) return null

  // Step 2: Check for intersections between nearby lines first (higher priority)
  for (let i = 0; i < nearbyLines.length; i++) {
    for (let j = i + 1; j < nearbyLines.length; j++) {
      const line1 = nearbyLines[i].line
      const line2 = nearbyLines[j].line

      const intersection = lineIntersection(line1.line2D, line2.line2D)
      if (intersection === null) continue

      // Check if target is close enough to this intersection
      const targetDistSquared = (target.x - intersection.x) ** 2 + (target.y - intersection.y) ** 2
      if (targetDistSquared <= pointSnapDistance * pointSnapDistance) {
        // Check minimum wall length for intersection
        const wallLengthSquared = (intersection.x - fromPoint.x) ** 2 + (intersection.y - fromPoint.y) ** 2
        if (wallLengthSquared >= minWallLength * minWallLength) {
          return {
            position: intersection,
            lines: [line1, line2]
          }
        }
      }
    }
  }

  // Step 3: If no intersection, find best line snap
  let bestSnap: { line: SnapLine, projectedPosition: Point2D } | null = null
  let bestDistance = lineSnapDistance

  for (const { line, distance, projectedPosition } of nearbyLines) {
    if (distance < bestDistance) {
      bestDistance = distance
      bestSnap = { line, projectedPosition }
    }
  }

  if (bestSnap != null) {
    return {
      position: bestSnap.projectedPosition,
      lines: [bestSnap.line]
    }
  }

  return null
}

// Main snapping function that combines all snap types
export function findSnapPoint (
  state: ModelState,
  target: Point2D,
  fromPoint: Point2D,
  activeFloorId: FloorId,
  forStartPoint: boolean = false
): SnapResult | null {
  // Step 1: Check for existing point snapping (highest priority)
  const pointSnapResult = findPointSnapPosition(state, target, fromPoint, activeFloorId)
  if (pointSnapResult != null) return pointSnapResult

  // Step 2: Generate snap lines and check for line/intersection snapping
  const snapLines = generateSnapLines(state, fromPoint, activeFloorId, forStartPoint)
  return findLineSnapPosition(target, fromPoint, snapLines)
}

export function mergePoints (
  state: ModelState,
  targetPointId: PointId,
  sourcePointId: PointId,
  floorId: FloorId
): ModelState {
  if (targetPointId === sourcePointId) return state

  const targetPoint = state.points.get(targetPointId)
  const sourcePoint = state.points.get(sourcePointId)
  if (targetPoint == null || sourcePoint == null) return state

  const floor = state.floors.get(floorId)
  if (floor == null) return state

  // Check that both points are on the same floor
  if (!floor.pointIds.includes(targetPointId) || !floor.pointIds.includes(sourcePointId)) {
    return state
  }

  let updatedState = { ...state }
  updatedState.walls = new Map(state.walls)
  updatedState.floors = new Map(state.floors)

  // Find all walls connected to the source point and redirect them to target
  const connectedWalls = findWallsConnectedToPoint(state, sourcePointId)

  for (const wall of connectedWalls) {
    const updatedWall = {
      ...wall,
      startPointId: wall.startPointId === sourcePointId ? targetPointId : wall.startPointId,
      endPointId: wall.endPointId === sourcePointId ? targetPointId : wall.endPointId
    }

    // Check for degenerate walls (start and end are the same point)
    if (updatedWall.startPointId === updatedWall.endPointId) {
      // Find rooms containing this wall before removing it
      const roomsWithWall = findRoomsContainingWall(updatedState, wall.id)
      
      // Remove degenerate wall
      updatedState = removeWallFromFloor(updatedState, wall.id, floorId)

      // Remove rooms that contained this wall
      for (const room of roomsWithWall) {
        updatedState = removeRoomFromFloor(updatedState, room.id, floorId)
      }
    } else {
      // Check if this creates a duplicate wall (same start and end points)
      const isDuplicate = Array.from(updatedState.walls.values()).some(existingWall =>
        existingWall.id !== wall.id &&
        ((existingWall.startPointId === updatedWall.startPointId && existingWall.endPointId === updatedWall.endPointId) ||
         (existingWall.startPointId === updatedWall.endPointId && existingWall.endPointId === updatedWall.startPointId))
      )

      if (isDuplicate) {
        // Find rooms containing this wall before removing it
        const roomsWithWall = findRoomsContainingWall(updatedState, wall.id)
        
        // Remove duplicate wall
        updatedState = removeWallFromFloor(updatedState, wall.id, floorId)

        // Remove rooms that contained this wall
        for (const room of roomsWithWall) {
          updatedState = removeRoomFromFloor(updatedState, room.id, floorId)
        }
      } else {
        // Update wall with new connection
        const updatedWallWithLength = {
          ...updatedWall,
          length: getWallLength(updatedWall, updatedState)
        }
        updatedState.walls.set(wall.id, updatedWallWithLength)
      }
    }
  }

  // Remove the source point
  updatedState = removePointFromFloor(updatedState, sourcePointId, floorId)

  // Update corners at the target point
  updatedState = updateOrCreateCorner(updatedState, targetPointId)

  // Remove any corner that was at the source point
  const existingSourceCorner = findExistingCornerAtPoint(state, sourcePointId)
  if (existingSourceCorner != null) {
    updatedState = removeCornerReferences(updatedState, existingSourceCorner)
    updatedState = { ...updatedState }
    updatedState.corners = new Map(updatedState.corners)
    updatedState.corners.delete(existingSourceCorner.id)
  }

  updatedState.updatedAt = new Date()
  return updatedState
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
  updatedState.walls = new Map(state.walls)

  const updatedPoint = { ...point, position: newPosition }
  updatedState.points.set(pointId, updatedPoint)

  // Find and update all walls connected to this point
  for (const [wallId, wall] of state.walls) {
    if (wall.startPointId === pointId || wall.endPointId === pointId) {
      const updatedWall = {
        ...wall,
        length: getWallLength(wall, updatedState)
      }
      updatedState.walls.set(wallId, updatedWall)
    }
  }

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
  if (startPoint == null || endPoint == null) return state

  // Calculate wall direction vector
  const wallDx = endPoint.position.x - startPoint.position.x
  const wallDy = endPoint.position.y - startPoint.position.y
  const wallLength = Math.sqrt(wallDx * wallDx + wallDy * wallDy)

  if (wallLength === 0) return state // Degenerate wall

  // Calculate perpendicular (normal) vector to the wall
  const normalX = -wallDy / wallLength
  const normalY = wallDx / wallLength

  // Project the drag delta onto the perpendicular direction
  const projectedDistance = deltaX * normalX + deltaY * normalY

  // Apply movement only in the perpendicular direction
  const moveX = projectedDistance * normalX
  const moveY = projectedDistance * normalY

  const updatedState = { ...state }
  updatedState.points = new Map(state.points)
  updatedState.walls = new Map(state.walls)

  const newStartPosition: Point2D = createPoint2D(
    startPoint.position.x + moveX,
    startPoint.position.y + moveY
  )

  const newEndPosition: Point2D = createPoint2D(
    endPoint.position.x + moveX,
    endPoint.position.y + moveY
  )

  const updatedStartPoint = { ...startPoint, position: newStartPosition }
  const updatedEndPoint = { ...endPoint, position: newEndPosition }

  updatedState.points.set(wall.startPointId, updatedStartPoint)
  updatedState.points.set(wall.endPointId, updatedEndPoint)

  // Moving a wall perpendicular doesn't change its own length,
  // but it affects other walls connected to its endpoints.
  // Update lengths of all OTHER walls connected to the moved wall's endpoints
  for (const [otherWallId, otherWall] of state.walls) {
    if (otherWallId !== wallId &&
        (otherWall.startPointId === wall.startPointId ||
         otherWall.endPointId === wall.startPointId ||
         otherWall.startPointId === wall.endPointId ||
         otherWall.endPointId === wall.endPointId)) {
      const updatedOtherWall = {
        ...otherWall,
        length: getWallLength(otherWall, updatedState)
      }
      updatedState.walls.set(otherWallId, updatedOtherWall)
    }
  }

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
  
  // Update rooms after removing the wall
  return updateRoomsAfterWallChange(updatedState, floorId)
}

export function removePointFromFloor (state: ModelState, pointId: PointId, floorId: FloorId): ModelState {
  const point = state.points.get(pointId)
  const floor = state.floors.get(floorId)

  if (point == null || floor == null) return state

  const updatedState = { ...state }
  updatedState.points = new Map(state.points)
  updatedState.floors = new Map(state.floors)

  updatedState.points.delete(pointId)

  const updatedFloor = {
    ...floor,
    pointIds: floor.pointIds.filter(id => id !== pointId)
  }

  updatedState.floors.set(floorId, updatedFloor)
  updatedState.updatedAt = new Date()
  return updatedState
}

export function removeRoomFromFloor (state: ModelState, roomId: RoomId, floorId: FloorId): ModelState {
  const room = state.rooms.get(roomId)
  const floor = state.floors.get(floorId)

  if (room == null || floor == null) return state

  const updatedState = { ...state }
  updatedState.rooms = new Map(state.rooms)
  updatedState.floors = new Map(state.floors)

  updatedState.rooms.delete(roomId)

  const updatedFloor = {
    ...floor,
    roomIds: floor.roomIds.filter(id => id !== roomId)
  }

  updatedState.floors.set(floorId, updatedFloor)
  updatedState.updatedAt = new Date()
  return updatedState
}

export function deletePoint (state: ModelState, pointId: PointId, floorId: FloorId): ModelState {
  const point = state.points.get(pointId)
  const floor = state.floors.get(floorId)

  // Return unchanged state if point or floor doesn't exist
  if (point == null || floor == null) {
    return { ...state, updatedAt: new Date() }
  }

  // Find all walls connected to this point
  const connectedWalls = findWallsConnectedToPoint(state, pointId)

  // Start with removing the point
  let updatedState = removePointFromFloor(state, pointId, floorId)

  // Remove all connected walls (cascading deletion)
  for (const wall of connectedWalls) {
    updatedState = removeWallFromFloor(updatedState, wall.id, floorId)

    // Find rooms that contain this wall and remove them too
    const roomsWithWall = findRoomsContainingWall(updatedState, wall.id)
    for (const room of roomsWithWall) {
      updatedState = removeRoomFromFloor(updatedState, room.id, floorId)
    }

    // Update corners at the other endpoint of the wall
    const otherPointId = wall.startPointId === pointId ? wall.endPointId : wall.startPointId
    if (updatedState.points.has(otherPointId)) {
      updatedState = updateOrCreateCorner(updatedState, otherPointId)
    }
  }

  // Remove any corner at this point
  const existingCorner = findExistingCornerAtPoint(state, pointId)
  if (existingCorner != null) {
    updatedState = removeCornerReferences(updatedState, existingCorner)
    updatedState = { ...updatedState }
    updatedState.corners = new Map(updatedState.corners)
    updatedState.corners.delete(existingCorner.id)
  }

  // Update state bounds
  const bounds = calculateStateBounds(updatedState)
  updatedState = { ...updatedState, bounds: bounds ?? undefined }

  return updatedState
}

export function deleteWall (state: ModelState, wallId: WallId, floorId: FloorId): ModelState {
  const wall = state.walls.get(wallId)
  const floor = state.floors.get(floorId)

  // Return unchanged state if wall or floor doesn't exist
  if (wall == null || floor == null) {
    return { ...state, updatedAt: new Date() }
  }

  // Find rooms that contain this wall and remove them
  const roomsWithWall = findRoomsContainingWall(state, wallId)

  let updatedState = removeWallFromFloor(state, wallId, floorId)

  // Remove rooms that contained this wall
  for (const room of roomsWithWall) {
    updatedState = removeRoomFromFloor(updatedState, room.id, floorId)
  }

  // Update corners at both endpoints
  if (updatedState.points.has(wall.startPointId)) {
    updatedState = updateOrCreateCorner(updatedState, wall.startPointId)
  }
  if (updatedState.points.has(wall.endPointId)) {
    updatedState = updateOrCreateCorner(updatedState, wall.endPointId)
  }

  // Update state bounds
  const bounds = calculateStateBounds(updatedState)
  updatedState = { ...updatedState, bounds: bounds ?? undefined }

  return updatedState
}

export function deleteRoom (state: ModelState, roomId: RoomId, floorId: FloorId): ModelState {
  return removeRoomFromFloor(state, roomId, floorId)
}

export function findRoomsContainingWall (state: ModelState, wallId: WallId): Room[] {
  const roomsWithWall: Room[] = []

  for (const room of state.rooms.values()) {
    if (room.wallIds.includes(wallId)) {
      roomsWithWall.push(room)
    }
  }

  return roomsWithWall
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
      createPoint2D(start.x + perpX, start.y + perpY),
      createPoint2D(end.x + perpX, end.y + perpY),
      createPoint2D(end.x - perpX, end.y - perpY),
      createPoint2D(start.x - perpX, start.y - perpY)
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

// Corner management operations
export function findWallsConnectedToPoint (state: ModelState, pointId: PointId): Wall[] {
  const connectedWalls: Wall[] = []

  for (const wall of state.walls.values()) {
    if (wall.startPointId === pointId || wall.endPointId === pointId) {
      connectedWalls.push(wall)
    }
  }

  return connectedWalls
}

export function shouldCreateCorner (connectedWalls: Wall[]): boolean {
  return connectedWalls.length >= 2
}

export function findExistingCornerAtPoint (state: ModelState, pointId: PointId): Corner | null {
  for (const corner of state.corners.values()) {
    if (corner.pointId === pointId) {
      return corner
    }
  }
  return null
}

export function calculateCornerData (
  state: ModelState,
  pointId: PointId,
  connectedWalls: Wall[]
): { angle: Angle, type: Corner['type'], wall1Id: WallId, wall2Id: WallId, otherWallIds?: WallId[] } {
  if (connectedWalls.length < 2) {
    throw new Error('Cannot create corner with less than 2 walls')
  }

  // Get the corner point
  const cornerPoint = state.points.get(pointId)
  if (cornerPoint == null) {
    throw new Error(`Point ${pointId} not found`)
  }

  // Sort walls by their angle from the corner point to determine primary walls
  const wallAngles = connectedWalls.map(wall => {
    const otherPointId = wall.startPointId === pointId ? wall.endPointId : wall.startPointId
    const otherPoint = state.points.get(otherPointId)
    if (otherPoint == null) {
      throw new Error(`Point ${otherPointId} not found`)
    }

    return {
      wall,
      angle: Math.atan2(otherPoint.position.y - cornerPoint.position.y, otherPoint.position.x - cornerPoint.position.x)
    }
  }).sort((a, b) => a.angle - b.angle)

  // Primary walls are typically the first two in angle-sorted order
  const wall1 = wallAngles[0].wall
  const wall2 = wallAngles[1].wall
  const otherWalls = wallAngles.slice(2).map(wa => wa.wall)

  // Calculate angle between the two primary walls
  const wall1OtherPointId = wall1.startPointId === pointId ? wall1.endPointId : wall1.startPointId
  const wall2OtherPointId = wall2.startPointId === pointId ? wall2.endPointId : wall2.startPointId

  const wall1OtherPoint = state.points.get(wall1OtherPointId)
  const wall2OtherPoint = state.points.get(wall2OtherPointId)

  if (wall1OtherPoint == null || wall2OtherPoint == null) {
    throw new Error('Wall end points not found')
  }

  const angle = calculateCornerAngle(
    wall1OtherPoint.position,
    cornerPoint.position,
    wall2OtherPoint.position
  )

  const type = determineCornerType(connectedWalls.length, angle)

  return {
    angle,
    type,
    wall1Id: wall1.id,
    wall2Id: wall2.id,
    otherWallIds: otherWalls.length > 0 ? otherWalls.map(w => w.id) : undefined
  }
}

export function createCornerFromWalls (
  state: ModelState,
  pointId: PointId,
  connectedWalls: Wall[]
): Corner {
  const cornerData = calculateCornerData(state, pointId, connectedWalls)

  // Create simple corner area (for now, just a small square at the corner point)
  const cornerPoint = state.points.get(pointId)
  if (cornerPoint == null) {
    throw new Error(`Point ${pointId} not found`)
  }
  const cornerSize = 50 // 50mm corner area

  const area: Polygon2D = {
    points: [
      createPoint2D(cornerPoint.position.x - cornerSize / 2, cornerPoint.position.y - cornerSize / 2),
      createPoint2D(cornerPoint.position.x + cornerSize / 2, cornerPoint.position.y - cornerSize / 2),
      createPoint2D(cornerPoint.position.x + cornerSize / 2, cornerPoint.position.y + cornerSize / 2),
      createPoint2D(cornerPoint.position.x - cornerSize / 2, cornerPoint.position.y + cornerSize / 2)
    ]
  }

  return {
    id: createCornerId(),
    pointId,
    wall1Id: cornerData.wall1Id,
    wall2Id: cornerData.wall2Id,
    otherWallIds: cornerData.otherWallIds,
    angle: cornerData.angle,
    type: cornerData.type,
    area
  }
}

export function updateCornerReferences (state: ModelState, corner: Corner): ModelState {
  const updatedState = { ...state }
  updatedState.walls = new Map(state.walls)

  // Update wall references to include corner touches
  const updateWallTouch = (wallId: WallId, isStart: boolean): void => {
    const wall = updatedState.walls.get(wallId)
    if (wall == null) return

    const updatedWall = { ...wall }
    if (isStart) {
      updatedWall.startTouches = corner.id
    } else {
      updatedWall.endTouches = corner.id
    }

    updatedState.walls.set(wallId, updatedWall)
  }

  // Update primary walls
  const wall1 = state.walls.get(corner.wall1Id)
  const wall2 = state.walls.get(corner.wall2Id)

  if (wall1 != null) {
    updateWallTouch(corner.wall1Id, wall1.startPointId === corner.pointId)
  }
  if (wall2 != null) {
    updateWallTouch(corner.wall2Id, wall2.startPointId === corner.pointId)
  }

  // Update other walls
  if (corner.otherWallIds != null) {
    for (const wallId of corner.otherWallIds) {
      const wall = state.walls.get(wallId)
      if (wall != null) {
        updateWallTouch(wallId, wall.startPointId === corner.pointId)
      }
    }
  }

  return updatedState
}

export function removeCornerReferences (state: ModelState, corner: Corner): ModelState {
  const updatedState = { ...state }
  updatedState.walls = new Map(state.walls)

  // Remove corner references from walls
  const removeWallTouch = (wallId: WallId, isStart: boolean): void => {
    const wall = updatedState.walls.get(wallId)
    if (wall == null) return

    const updatedWall = { ...wall }
    if (isStart) {
      updatedWall.startTouches = undefined
    } else {
      updatedWall.endTouches = undefined
    }

    updatedState.walls.set(wallId, updatedWall)
  }

  // Remove from primary walls
  const wall1 = state.walls.get(corner.wall1Id)
  const wall2 = state.walls.get(corner.wall2Id)

  if (wall1 != null) {
    removeWallTouch(corner.wall1Id, wall1.startPointId === corner.pointId)
  }
  if (wall2 != null) {
    removeWallTouch(corner.wall2Id, wall2.startPointId === corner.pointId)
  }

  // Remove from other walls
  if (corner.otherWallIds != null) {
    for (const wallId of corner.otherWallIds) {
      const wall = state.walls.get(wallId)
      if (wall != null) {
        removeWallTouch(wallId, wall.startPointId === corner.pointId)
      }
    }
  }

  return updatedState
}

export function updateOrCreateCorner (state: ModelState, pointId: PointId): ModelState {
  const connectedWalls = findWallsConnectedToPoint(state, pointId)

  if (!shouldCreateCorner(connectedWalls)) {
    // Remove existing corner if it exists
    const existingCorner = findExistingCornerAtPoint(state, pointId)
    if (existingCorner != null) {
      let updatedState = removeCornerReferences(state, existingCorner)
      updatedState = { ...updatedState }
      updatedState.corners = new Map(updatedState.corners)
      updatedState.corners.delete(existingCorner.id)
      updatedState.updatedAt = new Date()
      return updatedState
    }
    return state
  }

  const existingCorner = findExistingCornerAtPoint(state, pointId)

  if (existingCorner != null) {
    // Update existing corner - but preserve main walls unless they're no longer connected
    const currentMainWalls = [existingCorner.wall1Id, existingCorner.wall2Id]
    const stillConnectedMainWalls = currentMainWalls.filter(wallId =>
      connectedWalls.some(wall => wall.id === wallId)
    )

    let wall1Id: WallId, wall2Id: WallId, otherWallIds: WallId[] | undefined

    if (stillConnectedMainWalls.length >= 2) {
      // Keep existing main walls if they're still connected
      wall1Id = stillConnectedMainWalls[0]
      wall2Id = stillConnectedMainWalls[1]
      otherWallIds = connectedWalls
        .filter(wall => !stillConnectedMainWalls.includes(wall.id))
        .map(wall => wall.id)
    } else if (stillConnectedMainWalls.length === 1) {
      // One main wall is still connected, choose another as the second main wall
      wall1Id = stillConnectedMainWalls[0]
      const remainingWalls = connectedWalls.filter(wall => wall.id !== wall1Id)
      wall2Id = remainingWalls[0].id
      otherWallIds = remainingWalls.slice(1).map(wall => wall.id)
    } else {
      // Neither main wall is connected anymore, recalculate from scratch
      const updatedCornerData = calculateCornerData(state, pointId, connectedWalls)
      wall1Id = updatedCornerData.wall1Id
      wall2Id = updatedCornerData.wall2Id
      otherWallIds = updatedCornerData.otherWallIds
    }

    // Calculate angle and type with current configuration
    const cornerPoint = state.points.get(pointId)
    if (cornerPoint == null) {
      throw new Error(`Point ${pointId} not found`)
    }

    const wall1 = connectedWalls.find(w => w.id === wall1Id)
    const wall2 = connectedWalls.find(w => w.id === wall2Id)
    if (wall1 == null || wall2 == null) {
      throw new Error('Wall not found in connected walls')
    }

    const wall1OtherPointId = wall1.startPointId === pointId ? wall1.endPointId : wall1.startPointId
    const wall2OtherPointId = wall2.startPointId === pointId ? wall2.endPointId : wall2.startPointId

    const wall1OtherPoint = state.points.get(wall1OtherPointId)
    const wall2OtherPoint = state.points.get(wall2OtherPointId)
    if (wall1OtherPoint == null || wall2OtherPoint == null) {
      throw new Error('Wall end points not found')
    }

    const angle = calculateCornerAngle(
      wall1OtherPoint.position,
      cornerPoint.position,
      wall2OtherPoint.position
    )

    const type = determineCornerType(connectedWalls.length, angle)

    const updatedCorner: Corner = {
      ...existingCorner,
      wall1Id,
      wall2Id,
      otherWallIds: (otherWallIds != null && otherWallIds.length > 0) ? otherWallIds : undefined,
      angle,
      type
    }

    // Remove old references and add new ones
    let updatedState = removeCornerReferences(state, existingCorner)
    updatedState = updateCornerReferences(updatedState, updatedCorner)
    updatedState = { ...updatedState }
    updatedState.corners = new Map(updatedState.corners)
    updatedState.corners.set(updatedCorner.id, updatedCorner)
    updatedState.updatedAt = new Date()
    return updatedState
  } else {
    // Create new corner - use first two walls as main walls
    const newCorner = createCornerFromWalls(state, pointId, connectedWalls)
    let updatedState = updateCornerReferences(state, newCorner)
    updatedState = { ...updatedState }
    updatedState.corners = new Map(updatedState.corners)
    updatedState.corners.set(newCorner.id, newCorner)
    updatedState.updatedAt = new Date()
    return updatedState
  }
}

export function switchCornerMainWalls (
  state: ModelState,
  cornerId: CornerId,
  newWall1Id: WallId,
  newWall2Id: WallId
): ModelState {
  const corner = state.corners.get(cornerId)
  if (corner == null) {
    throw new Error(`Corner ${cornerId} not found`)
  }

  const connectedWalls = findWallsConnectedToPoint(state, corner.pointId)
  const wallIds = connectedWalls.map(w => w.id)

  // Validate that the new main walls are actually connected to this corner
  if (!wallIds.includes(newWall1Id) || !wallIds.includes(newWall2Id)) {
    throw new Error('New main walls must be connected to the corner point')
  }

  if (newWall1Id === newWall2Id) {
    throw new Error('Main walls must be different')
  }

  // Calculate other walls (all connected walls except the new main walls)
  const otherWallIds = wallIds.filter(id => id !== newWall1Id && id !== newWall2Id)

  // Recalculate angle and type with new main walls
  const cornerPoint = state.points.get(corner.pointId)
  if (cornerPoint == null) {
    throw new Error(`Point ${corner.pointId} not found`)
  }

  const wall1 = connectedWalls.find(w => w.id === newWall1Id)
  const wall2 = connectedWalls.find(w => w.id === newWall2Id)
  if (wall1 == null || wall2 == null) {
    throw new Error('Wall not found in connected walls')
  }

  const wall1OtherPointId = wall1.startPointId === corner.pointId ? wall1.endPointId : wall1.startPointId
  const wall2OtherPointId = wall2.startPointId === corner.pointId ? wall2.endPointId : wall2.startPointId

  const wall1OtherPoint = state.points.get(wall1OtherPointId)
  const wall2OtherPoint = state.points.get(wall2OtherPointId)
  if (wall1OtherPoint == null || wall2OtherPoint == null) {
    throw new Error('Wall end points not found')
  }

  const angle = calculateCornerAngle(
    wall1OtherPoint.position,
    cornerPoint.position,
    wall2OtherPoint.position
  )

  const type = determineCornerType(connectedWalls.length, angle)

  const updatedCorner: Corner = {
    ...corner,
    wall1Id: newWall1Id,
    wall2Id: newWall2Id,
    otherWallIds: otherWallIds.length > 0 ? otherWallIds : undefined,
    angle,
    type
  }

  // Remove old references and add new ones
  let updatedState = removeCornerReferences(state, corner)
  updatedState = updateCornerReferences(updatedState, updatedCorner)
  updatedState = { ...updatedState }
  updatedState.corners = new Map(updatedState.corners)
  updatedState.corners.set(cornerId, updatedCorner)
  updatedState.updatedAt = new Date()

  return updatedState
}

// Room operations

// Find minimal faces (rooms) in the planar graph formed by walls
export function findWallLoops (state: ModelState, floorId: FloorId): WallId[][] {
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

    wallConnections.get(wall.startPointId)!.push(wallId)
    wallConnections.get(wall.endPointId)!.push(wallId)
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

      const face = findMinimalFace(startWallId, from, to, wallConnections, state)
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
        for (let i = 0; i < face.length; i++) {
          const wallId = face[i]
          const wall = state.walls.get(wallId)
          if (wall == null) continue
          
          const nextWallId = face[(i + 1) % face.length]
          const nextWall = state.walls.get(nextWallId)
          if (nextWall == null) continue
          
          // Find the shared point between these walls
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
    }
  }

  // Filter to keep only interior faces (actual rooms)
  return filterInteriorFaces(faces, state)
}

// Filter faces to keep only interior faces (rooms), not exterior boundaries
function filterInteriorFaces (faces: WallId[][], state: ModelState): WallId[][] {
  if (faces.length <= 1) return faces
  
  const interiorFaces: WallId[][] = []
  
  // Sort faces by area - smaller faces are more likely to be interior rooms
  const facesWithAreas = faces.map(face => ({
    face,
    area: calculateFaceArea(face, state)
  })).filter(item => item.area > 0) // Only keep valid faces with positive area
  
  facesWithAreas.sort((a, b) => a.area - b.area)
  
  // For each face, check if it's contained within any larger face
  for (const faceItem of facesWithAreas) {
    let isInterior = false
    
    // Check if this face is contained within any other face
    for (const otherFaceItem of facesWithAreas) {
      if (faceItem === otherFaceItem) continue
      if (otherFaceItem.area <= faceItem.area) continue // Only check larger faces
      
      if (isFaceContainedWithin(faceItem.face, otherFaceItem.face, state)) {
        isInterior = true
        break
      }
    }
    
    // If not contained in any larger face, it might be an exterior face
    // Interior faces should be contained within some larger boundary
    if (isInterior || facesWithAreas.length === 1) {
      interiorFaces.push(faceItem.face)
    }
  }
  
  // If no faces were deemed interior, return the smallest faces (most likely to be rooms)
  if (interiorFaces.length === 0 && facesWithAreas.length > 0) {
    const minArea = facesWithAreas[0].area
    return facesWithAreas.filter(item => item.area === minArea).map(item => item.face)
  }
  
  return interiorFaces
}

// Calculate the area of a face
function calculateFaceArea (wallIds: WallId[], state: ModelState): number {
  const points = getFacePolygonPoints(wallIds, state)
  if (points.length < 3) return 0
  
  return Number(calculatePolygonArea({ points }))
}

// Check if one face is completely contained within another
function isFaceContainedWithin (innerFace: WallId[], outerFace: WallId[], state: ModelState): boolean {
  const innerPoints = getFacePolygonPoints(innerFace, state)
  const outerPoints = getFacePolygonPoints(outerFace, state)
  
  if (innerPoints.length === 0 || outerPoints.length === 0) return false
  
  // Check if all inner points are inside the outer polygon
  for (const innerPoint of innerPoints) {
    if (!isPointInPolygon(innerPoint, outerPoints)) {
      return false
    }
  }
  
  return true
}

// Get the ordered polygon points for a face
function getFacePolygonPoints (wallIds: WallId[], state: ModelState): Point2D[] {
  if (wallIds.length === 0) return []
  
  const points: Point2D[] = []
  
  for (let i = 0; i < wallIds.length; i++) {
    const currentWall = state.walls.get(wallIds[i])
    const nextWall = state.walls.get(wallIds[(i + 1) % wallIds.length])
    
    if (currentWall == null || nextWall == null) continue
    
    // Find the connection point between current and next wall
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

// Find the minimal face starting from a specific wall and direction
function findMinimalFace (
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
    const connectedWalls = wallConnections.get(currentPoint) || []
    if (connectedWalls.length < 2) return null // Dead end
    
    // Find the next wall by taking the rightmost turn (clockwise)
    let nextWall: WallId | null = null
    let bestAngle = -Math.PI * 2 // Start with worst possible angle
    
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

// Check if a wall loop forms a valid room (clockwise winding, no self-intersections)
export function isValidRoomLoop (wallIds: WallId[], state: ModelState): boolean {
  if (wallIds.length < 3) return false

  // Check that all walls connect properly to form a closed loop
  const points: PointId[] = []
  
  for (let i = 0; i < wallIds.length; i++) {
    const currentWall = state.walls.get(wallIds[i])
    const nextWall = state.walls.get(wallIds[(i + 1) % wallIds.length])
    
    if (currentWall == null || nextWall == null) return false

    // Check if walls connect properly
    const connectionPoint = 
      currentWall.endPointId === nextWall.startPointId ? currentWall.endPointId :
      currentWall.endPointId === nextWall.endPointId ? currentWall.endPointId :
      currentWall.startPointId === nextWall.startPointId ? currentWall.startPointId :
      currentWall.startPointId === nextWall.endPointId ? currentWall.startPointId :
      null

    if (connectionPoint == null) return false

    points.push(connectionPoint)
  }

  // Calculate the area to ensure it's a valid polygon (area > 0)
  const positions: Point2D[] = []
  for (const pointId of points) {
    const point = state.points.get(pointId)
    if (point == null) return false
    positions.push(point.position)
  }

  if (positions.length < 3) return false

  const area = calculatePolygonArea({ points: positions })
  return Number(area) > 0
}

// Create a room from a valid wall loop
export function createRoomFromWallLoop (wallIds: WallId[], name?: string): Room {
  return createRoom(name || `Room ${Date.now()}`, wallIds)
}

// Find existing rooms that would be affected by adding a new wall
export function findRoomsIntersectedByWall (
  state: ModelState, 
  startPointId: PointId, 
  endPointId: PointId,
  floorId: FloorId
): Room[] {
  const floor = state.floors.get(floorId)
  if (floor == null) return []

  const intersectedRooms: Room[] = []
  const startPoint = state.points.get(startPointId)
  const endPoint = state.points.get(endPointId)
  
  if (startPoint == null || endPoint == null) return []

  for (const roomId of floor.roomIds) {
    const room = state.rooms.get(roomId)
    if (room == null) continue

    // Check if the new wall would pass through this room
    if (isWallInsideRoom(startPoint.position, endPoint.position, room, state)) {
      intersectedRooms.push(room)
    }
  }

  return intersectedRooms
}

// Check if a wall passes through the interior of a room
function isWallInsideRoom (
  wallStart: Point2D,
  wallEnd: Point2D,
  room: Room,
  state: ModelState
): boolean {
  // Get room polygon points
  const roomPoints: Point2D[] = []
  
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
  
  return isPointInPolygon(wallMidPoint, roomPoints)
}

// Simple point-in-polygon test using ray casting
function isPointInPolygon (point: Point2D, polygon: Point2D[]): boolean {
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

// Split a room when a new wall divides it
export function splitRoomWithWall (
  state: ModelState,
  roomId: RoomId,
  dividingWallId: WallId,
  floorId: FloorId
): ModelState {
  const room = state.rooms.get(roomId)
  if (room == null) return state

  let updatedState = removeRoomFromFloor(state, roomId, floorId)

  // Find new wall loops after adding the dividing wall
  const wallLoops = findWallLoops(updatedState, floorId)
  
  // Create new rooms from the resulting loops
  for (const wallLoop of wallLoops) {
    if (!isValidRoomLoop(wallLoop, updatedState)) continue

    // Only create rooms that include walls from the original room or the new dividing wall
    const includesOriginalWalls = wallLoop.some(wallId => 
      room.wallIds.includes(wallId) || wallId === dividingWallId
    )
    
    if (includesOriginalWalls) {
      const roomName = `Room ${updatedState.rooms.size + 1}`
      const newRoom = createRoomFromWallLoop(wallLoop, roomName)
      updatedState = addRoomToFloor(updatedState, newRoom, floorId)
    }
  }

  return updatedState
}

// Update rooms when walls are added or removed
export function updateRoomsAfterWallChange (
  state: ModelState,
  floorId: FloorId,
  addedWallId?: WallId
): ModelState {
  let updatedState = { ...state }
  
  // If a wall was added, check if it splits any existing rooms
  if (addedWallId != null) {
    const addedWall = updatedState.walls.get(addedWallId)
    if (addedWall != null) {
      const intersectedRooms = findRoomsIntersectedByWall(
        updatedState, 
        addedWall.startPointId, 
        addedWall.endPointId, 
        floorId
      )
      
      // Split any intersected rooms
      for (const room of intersectedRooms) {
        updatedState = splitRoomWithWall(updatedState, room.id, addedWallId, floorId)
      }
    }
  }
  
  // Find all current wall loops
  const wallLoops = findWallLoops(updatedState, floorId)
  
  // Remove existing rooms on this floor that are no longer valid
  const floor = updatedState.floors.get(floorId)
  if (floor == null) return updatedState

  const currentRoomIds = [...floor.roomIds]
  for (const roomId of currentRoomIds) {
    const room = updatedState.rooms.get(roomId)
    if (room == null) continue

    // Check if room's walls still form a valid loop
    if (!isValidRoomLoop(room.wallIds, updatedState)) {
      updatedState = removeRoomFromFloor(updatedState, roomId, floorId)
    }
  }

  // Create new rooms for valid wall loops that don't already have rooms
  for (const wallLoop of wallLoops) {
    if (!isValidRoomLoop(wallLoop, updatedState)) continue

    // Check if a room already exists for this wall combination
    const existingRoom = Array.from(updatedState.rooms.values()).find(room => {
      if (room.wallIds.length !== wallLoop.length) return false
      return wallLoop.every(wallId => room.wallIds.includes(wallId))
    })

    if (existingRoom == null) {
      // Create new room
      const roomName = `Room ${updatedState.rooms.size + 1}`
      const newRoom = createRoomFromWallLoop(wallLoop, roomName)
      updatedState = addRoomToFloor(updatedState, newRoom, floorId)
    }
  }

  return updatedState
}
