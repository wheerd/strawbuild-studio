import { describe, it, expect } from 'vitest'
import {
  createEmptyModelState,
  createFloor,
  createWall,
  createRoom,
  createPoint,
  createOpening,
  isOpeningValidOnWall,
  calculateRoomArea,
  getWallLength,
  calculateStateBounds,
  addFloorToState,
  addWallToFloor,
  addPointToFloor,
  removeWallFromFloor,
  findSnapPoint,
  generateSnapLines,
  SNAP_CONFIG,
  updateOrCreateCorner,
  findWallsConnectedToPoint,
  switchCornerMainWalls
} from '@/model/operations'
import { createLength, createPoint2D, createVector2D, lineIntersection, radiansToDegrees } from '@/types/geometry'
import { createFloorLevel } from '@/types/model'
import type { ModelState } from '@/types/model'
import type { FloorId } from '@/types/ids'

describe('Model Operations', () => {
  describe('Factory Functions', () => {
    it('should create empty model state with ground floor', () => {
      const state = createEmptyModelState()

      expect(state.floors.size).toBe(1)
      const groundFloor = Array.from(state.floors.values())[0]
      expect(groundFloor.name).toBe('Ground Floor')
      expect(Number(groundFloor.level)).toBe(0)
      expect(Number(groundFloor.height)).toBe(3000)
      expect(state.walls.size).toBe(0)
      expect(state.rooms.size).toBe(0)
      expect(state.points.size).toBe(0)
      expect(state.createdAt).toBeInstanceOf(Date)
      expect(state.updatedAt).toBeInstanceOf(Date)
    })

    it('should create floor with correct properties', () => {
      const floor = createFloor('First Floor', createFloorLevel(1), createLength(2800))

      expect(floor.name).toBe('First Floor')
      expect(Number(floor.level)).toBe(1)
      expect(Number(floor.height)).toBe(2800)
      expect(floor.wallIds).toEqual([])
      expect(floor.roomIds).toEqual([])
      expect(floor.pointIds).toEqual([])
      expect(floor.slabIds).toEqual([])
      expect(floor.roofIds).toEqual([])
    })

    it('should validate floor level is integer', () => {
      // Valid levels (any integers)
      expect(() => createFloorLevel(0)).not.toThrow()
      expect(() => createFloorLevel(-10)).not.toThrow()
      expect(() => createFloorLevel(20)).not.toThrow()
      expect(() => createFloorLevel(5)).not.toThrow()
      expect(() => createFloorLevel(-100)).not.toThrow()
      expect(() => createFloorLevel(100)).not.toThrow()

      // Invalid levels - non-integers
      expect(() => createFloorLevel(1.5)).toThrow('Floor level must be an integer')
      expect(() => createFloorLevel(-2.3)).toThrow('Floor level must be an integer')
      expect(() => createFloorLevel(0.1)).toThrow('Floor level must be an integer')
    })

    it('should create connection point at position', () => {
      const point = createPoint(createPoint2D(100, 200))

      expect(Number(point.position.x)).toBe(100)
      expect(Number(point.position.y)).toBe(200)
    })

    it('should create wall between connection points', () => {
      const point1 = createPoint(createPoint2D(0, 0))
      const point2 = createPoint(createPoint2D(100, 0))
      const wall = createWall(
        point1.id,
        point2.id,
        createLength(2700),
        createLength(2700),
        createLength(150)
      )

      expect(wall.startPointId).toBe(point1.id)
      expect(wall.endPointId).toBe(point2.id)
      expect(Number(wall.thickness)).toBe(150)
      expect(Number(wall.heightAtStart)).toBe(2700)
      expect(Number(wall.heightAtEnd)).toBe(2700)
    })

    it('should create room with wall references', () => {
      const point1 = createPoint(createPoint2D(0, 0))
      const point2 = createPoint(createPoint2D(100, 0))
      const wall = createWall(
        point1.id,
        point2.id,
        createLength(2700),
        createLength(2700),
        createLength(200)
      )
      const room = createRoom('Living Room', [wall.id])

      expect(room.name).toBe('Living Room')
      expect(room.wallIds).toEqual([wall.id])
      expect(Number(room.area)).toBe(0)
    })

    it('should create opening on wall', () => {
      const opening = createOpening(
        'door',
        createLength(200),
        createLength(800),
        createLength(2100)
      )

      expect(opening.type).toBe('door')
      expect(Number(opening.offsetFromStart)).toBe(200)
      expect(Number(opening.width)).toBe(800)
      expect(Number(opening.height)).toBe(2100)
    })
  })

  describe('State Operations', () => {
    it('should add floor to state', () => {
      const state = createEmptyModelState()
      const floor = createFloor('First Floor', createFloorLevel(1), createLength(3000))
      const newState = addFloorToState(state, floor)

      expect(newState.floors.size).toBe(2)
      expect(newState.floors.has(floor.id)).toBe(true)
      expect(newState.updatedAt.getTime()).toBeGreaterThanOrEqual(state.updatedAt.getTime())
    })

    it('should add wall to floor', () => {
      let state = createEmptyModelState()
      const groundFloorId = Array.from(state.floors.keys())[0]
      const point1 = createPoint(createPoint2D(0, 0))
      const point2 = createPoint(createPoint2D(100, 0))
      state = addPointToFloor(state, point1, groundFloorId)
      state = addPointToFloor(state, point2, groundFloorId)

      const wall = createWall(
        point1.id,
        point2.id,
        createLength(2700),
        createLength(2700),
        createLength(200)
      )
      const newState = addWallToFloor(state, wall, groundFloorId)

      expect(newState.walls.size).toBe(1)
      expect(newState.walls.has(wall.id)).toBe(true)
    })

    it('should remove wall from floor', () => {
      let state = createEmptyModelState()
      const groundFloorId = Array.from(state.floors.keys())[0]
      const point1 = createPoint(createPoint2D(0, 0))
      const point2 = createPoint(createPoint2D(1000, 0))
      const wall = createWall(
        point1.id,
        point2.id,
        createLength(2700),
        createLength(2700),
        createLength(200)
      )

      state = addPointToFloor(state, point1, groundFloorId)
      state = addPointToFloor(state, point2, groundFloorId)
      state = addWallToFloor(state, wall, groundFloorId)

      expect(state.walls.size).toBe(1)

      const finalState = removeWallFromFloor(state, wall.id, groundFloorId)

      expect(finalState.walls.size).toBe(0)
    })
  })

  describe('Utility Functions', () => {
    it('should calculate wall length', () => {
      let state = createEmptyModelState()
      const groundFloorId = Array.from(state.floors.keys())[0]
      const point1 = createPoint(createPoint2D(0, 0))
      const point2 = createPoint(createPoint2D(300, 400))
      const wall = createWall(
        point1.id,
        point2.id,
        createLength(2700),
        createLength(2700),
        createLength(200)
      )

      state = addPointToFloor(state, point1, groundFloorId)
      state = addPointToFloor(state, point2, groundFloorId)
      state = addWallToFloor(state, wall, groundFloorId)

      const length = getWallLength(wall, state)
      expect(Number(length)).toBe(500) // 3-4-5 triangle
    })

    it('should calculate state bounds', () => {
      let state = createEmptyModelState()
      const groundFloorId = Array.from(state.floors.keys())[0]
      const point1 = createPoint(createPoint2D(10, 20))
      const point2 = createPoint(createPoint2D(100, 150))

      state = addPointToFloor(state, point1, groundFloorId)
      state = addPointToFloor(state, point2, groundFloorId)

      const bounds = calculateStateBounds(state)
      expect(Number(bounds!.minX)).toBe(10)
      expect(Number(bounds!.minY)).toBe(20)
      expect(Number(bounds!.maxX)).toBe(100)
      expect(Number(bounds!.maxY)).toBe(150)
    })

    it('should return null bounds for empty state', () => {
      const state = createEmptyModelState()
      const bounds = calculateStateBounds(state)
      expect(bounds).toBeNull()
    })

    it('should calculate room area', () => {
      let state = createEmptyModelState()
      const groundFloorId = Array.from(state.floors.keys())[0]

      // Create a simple square room
      const p1 = createPoint(createPoint2D(0, 0))
      const p2 = createPoint(createPoint2D(100, 0))
      const p3 = createPoint(createPoint2D(100, 100))
      const p4 = createPoint(createPoint2D(0, 100))

      const w1 = createWall(p1.id, p2.id, createLength(2700), createLength(2700), createLength(200))
      const w2 = createWall(p2.id, p3.id, createLength(2700), createLength(2700), createLength(200))
      const w3 = createWall(p3.id, p4.id, createLength(2700), createLength(2700), createLength(200))
      const w4 = createWall(p4.id, p1.id, createLength(2700), createLength(2700), createLength(200))

      const room = createRoom('Square Room', [w1.id, w2.id, w3.id, w4.id])

      state = addPointToFloor(state, p1, groundFloorId)
      state = addPointToFloor(state, p2, groundFloorId)
      state = addPointToFloor(state, p3, groundFloorId)
      state = addPointToFloor(state, p4, groundFloorId)
      state = addWallToFloor(state, w1, groundFloorId)
      state = addWallToFloor(state, w2, groundFloorId)
      state = addWallToFloor(state, w3, groundFloorId)
      state = addWallToFloor(state, w4, groundFloorId)

      const area = calculateRoomArea(room, state)
      expect(Number(area)).toBe(10000) // 100 * 100
    })

    it('should validate opening placement', () => {
      let state = createEmptyModelState()
      const groundFloorId = Array.from(state.floors.keys())[0]
      const point1 = createPoint(createPoint2D(0, 0))
      const point2 = createPoint(createPoint2D(1000, 0))
      const wall = createWall(
        point1.id,
        point2.id,
        createLength(2700),
        createLength(2700),
        createLength(200)
      )

      state = addPointToFloor(state, point1, groundFloorId)
      state = addPointToFloor(state, point2, groundFloorId)
      state = addWallToFloor(state, wall, groundFloorId)

      const validOpening = createOpening(
        'door',
        createLength(100),
        createLength(800),
        createLength(2100)
      )
      expect(isOpeningValidOnWall(wall, validOpening, state)).toBe(true)

      const invalidOpening = createOpening(
        'window',
        createLength(900),
        createLength(800),
        createLength(1200)
      )
      expect(isOpeningValidOnWall(wall, invalidOpening, state)).toBe(false)
    })
  })
})
describe('Intersection Snapping', () => {
  it('should calculate line intersection correctly', () => {
    const line1 = {
      point: createPoint2D(0, 0),
      direction: createVector2D(1, 0) // Horizontal line through origin
    }

    const line2 = {
      point: createPoint2D(0, 0),
      direction: createVector2D(0, 1) // Vertical line through origin
    }

    const intersection = lineIntersection(line1, line2)
    expect(intersection).toEqual(createPoint2D(0, 0))
  })

  it('should detect parallel lines and return null', () => {
    const line1 = {
      point: createPoint2D(0, 0),
      direction: createVector2D(1, 0) // Horizontal line
    }

    const line2 = {
      point: createPoint2D(0, 1),
      direction: createVector2D(1, 0) // Parallel horizontal line
    }

    const intersection = lineIntersection(line1, line2)
    expect(intersection).toBeNull()
  })

  it('should find intersection between perpendicular snap lines', () => {
    const state = createEmptyModelState()
    const floorId = Array.from(state.floors.keys())[0]

    // Create a simple L-shape with two perpendicular walls
    const point1 = createPoint(createPoint2D(0, 0))
    const point2 = createPoint(createPoint2D(1000, 0))
    const point3 = createPoint(createPoint2D(1000, 1000))

    let updatedState = addPointToFloor(state, point1, floorId)
    updatedState = addPointToFloor(updatedState, point2, floorId)
    updatedState = addPointToFloor(updatedState, point3, floorId)

    const wall1 = createWall(point1.id, point2.id, createLength(2500), createLength(2500), createLength(200))
    const wall2 = createWall(point2.id, point3.id, createLength(2500), createLength(2500), createLength(200))

    updatedState = addWallToFloor(updatedState, wall1, floorId)
    updatedState = addWallToFloor(updatedState, wall2, floorId)

    // Test from the corner point
    const startPoint = createPoint2D(1000, 1000) // From corner

    // Target a point that should be near an intersection
    const targetPoint = createPoint2D(100, 100) // Should be close to intersection at (0, 0)

    // Use the full findSnapPoint function which now includes intersection detection
    const snapResult = findSnapPoint(updatedState, targetPoint, startPoint, floorId, false)

    // Should find some snap result (could be point or intersection)
    expect(snapResult).toBeDefined()
  })

  it('should return intersection result when target is far from existing points', () => {
    const state = createEmptyModelState()
    const floorId = Array.from(state.floors.keys())[0]

    // Create two separate walls
    const point1 = createPoint(createPoint2D(0, 500))
    const point2 = createPoint(createPoint2D(1000, 500))
    const point3 = createPoint(createPoint2D(500, 0))
    const point4 = createPoint(createPoint2D(500, 1000))

    let updatedState = addPointToFloor(state, point1, floorId)
    updatedState = addPointToFloor(updatedState, point2, floorId)
    updatedState = addPointToFloor(updatedState, point3, floorId)
    updatedState = addPointToFloor(updatedState, point4, floorId)

    const wall1 = createWall(point1.id, point2.id, createLength(2500), createLength(2500), createLength(200)) // Horizontal at y=500
    const wall2 = createWall(point3.id, point4.id, createLength(2500), createLength(2500), createLength(200)) // Vertical at x=500

    updatedState = addWallToFloor(updatedState, wall1, floorId)
    updatedState = addWallToFloor(updatedState, wall2, floorId)

    // Start from far away from existing walls
    const startPoint = createPoint2D(2000, 2000)

    // Target very close to intersection at (500, 500) where the two walls cross
    // but far from the existing endpoints
    const targetPoint = createPoint2D(520, 520) // Close to intersection at (500, 500)

    const snapResult = findSnapPoint(updatedState, targetPoint, startPoint, floorId, false)

    expect(snapResult).toBeDefined()
    // Should have 2 lines for intersection snapping (the two intersecting lines)
    expect(snapResult?.lines).toBeDefined()
    expect(snapResult?.lines).toHaveLength(2)
  })

  it('should respect minimum wall length for intersection snapping', () => {
    const state = createEmptyModelState()
    const floorId = Array.from(state.floors.keys())[0]

    const point1 = createPoint(createPoint2D(0, 0))
    const point2 = createPoint(createPoint2D(1000, 0))

    let updatedState = addPointToFloor(state, point1, floorId)
    updatedState = addPointToFloor(updatedState, point2, floorId)

    const wall1 = createWall(point1.id, point2.id, createLength(2500), createLength(2500), createLength(200))
    updatedState = addWallToFloor(updatedState, wall1, floorId)

    // Start point very close to an intersection point (should be rejected due to min wall length)
    const startPoint = createPoint2D(10, 0)
    const targetPoint = createPoint2D(20, 20) // Very close to start point

    const snapResult = findSnapPoint(updatedState, targetPoint, startPoint, floorId, false)

    // Should not snap to intersection because it would create a wall shorter than minimum length
    // (intersection snapping would have 2 lines, so we check it's not an intersection)
    expect(snapResult?.lines?.length).not.toBe(2)
  })

  it('should generate snap lines with proper Line2D geometry', () => {
    const state = createEmptyModelState()
    const floorId = Array.from(state.floors.keys())[0]

    const point1 = createPoint(createPoint2D(500, 500))
    const updatedState = addPointToFloor(state, point1, floorId)

    const snapLines = generateSnapLines(updatedState, createPoint2D(100, 100), floorId, true)

    expect(snapLines.length).toBeGreaterThan(0)

    // Check that each snap line has a valid Line2D representation
    for (const snapLine of snapLines) {
      expect(snapLine.line2D).toBeDefined()
      expect(snapLine.line2D.point).toBeDefined()
      expect(snapLine.line2D.direction).toBeDefined()

      // Direction should be normalized (length close to 1)
      const dirLength = Math.sqrt(
        snapLine.line2D.direction.x * snapLine.line2D.direction.x +
        snapLine.line2D.direction.y * snapLine.line2D.direction.y
      )
      expect(dirLength).toBeCloseTo(1, 5)
    }
  })
})
describe('Snapping System Improvements', () => {
  test('should only consider points on active floor for point snapping', () => {
    const state = createEmptyModelState()
    const groundFloorId = Array.from(state.floors.keys())[0]

    // Add point on ground floor
    const point1 = createPoint(createPoint2D(100, 100))
    const stateWithPoint = addPointToFloor(state, point1, groundFloorId)

    // Test point snapping within range on active floor
    const target = createPoint2D(120, 100) // 20mm away
    const fromPoint = createPoint2D(0, 0)

    const snapResult = findSnapPoint(stateWithPoint, target, fromPoint, groundFloorId, false)
    expect(snapResult).toBeDefined()
    expect(snapResult?.position).toEqual(point1.position)
  })

  test('should only generate extension/perpendicular lines for walls connected to start point', () => {
    const state = createEmptyModelState()
    const groundFloorId = Array.from(state.floors.keys())[0]

    // Create two points
    const point1 = createPoint(createPoint2D(0, 0))
    const point2 = createPoint(createPoint2D(100, 0))
    const point3 = createPoint(createPoint2D(200, 100))

    let newState = addPointToFloor(state, point1, groundFloorId)
    newState = addPointToFloor(newState, point2, groundFloorId)
    newState = addPointToFloor(newState, point3, groundFloorId)

    // Create wall between point1 and point2
    const wall = createWall(
      point1.id,
      point2.id,
      createLength(3000),
      createLength(3000),
      createLength(200)
    )
    newState = addWallToFloor(newState, wall, groundFloorId)

    // Generate snap lines from point1 (connected to wall)
    const fromPoint1 = point1.position
    const snapLinesFromPoint1 = generateSnapLines(newState, fromPoint1, groundFloorId, false)

    // Should include extension and perpendicular lines since point1 is connected to wall
    const extensionLines = snapLinesFromPoint1.filter(line => line.type === 'extension')
    const perpendicularLines = snapLinesFromPoint1.filter(line => line.type === 'perpendicular')
    expect(extensionLines.length).toBeGreaterThan(0)
    expect(perpendicularLines.length).toBeGreaterThan(0)

    // Generate snap lines from point3 (NOT connected to wall)
    const fromPoint3 = point3.position
    const snapLinesFromPoint3 = generateSnapLines(newState, fromPoint3, groundFloorId, false)

    // Should NOT include extension and perpendicular lines since point3 is not connected to any wall
    const extensionLinesFromPoint3 = snapLinesFromPoint3.filter(line => line.type === 'extension')
    const perpendicularLinesFromPoint3 = snapLinesFromPoint3.filter(line => line.type === 'perpendicular')
    expect(extensionLinesFromPoint3).toHaveLength(0)
    expect(perpendicularLinesFromPoint3).toHaveLength(0)
  })

  test('should use squared distances for performance', () => {
    const state = createEmptyModelState()
    const groundFloorId = Array.from(state.floors.keys())[0]

    // Add a point
    const point1 = createPoint(createPoint2D(100, 100))
    const stateWithPoint = addPointToFloor(state, point1, groundFloorId)

    // Test with target just outside point snap distance
    const snapDistanceValue = Number(SNAP_CONFIG.pointSnapDistance)
    const target = createPoint2D(100 + snapDistanceValue + 1, 100) // Just outside point snap range
    const fromPoint = createPoint2D(0, 0)

    const snapResult = findSnapPoint(stateWithPoint, target, fromPoint, groundFloorId, false)
    // Should not do point snapping (would be line snapping if anything), so no direct position match
    expect(snapResult?.position).not.toEqual(point1.position)

    // Test with target just inside snap distance - should snap directly to point
    const targetInside = createPoint2D(100 + snapDistanceValue - 1, 100) // Just inside range
    const snapResultInside = findSnapPoint(stateWithPoint, targetInside, fromPoint, groundFloorId, false)
    expect(snapResultInside).toBeDefined() // Should snap
    expect(snapResultInside?.position).toEqual(point1.position) // Should snap to exact point
  })

  test('should prevent snapping end point to start point', () => {
    const state = createEmptyModelState()
    const groundFloorId = Array.from(state.floors.keys())[0]

    // Add a point that will be the start point
    const startPoint = createPoint(createPoint2D(100, 100))
    const stateWithPoint = addPointToFloor(state, startPoint, groundFloorId)

    // Try to snap to the same position (end point snapping to start point)
    const target = createPoint2D(101, 100) // Very close to start point
    const fromPoint = startPoint.position

    const snapResult = findSnapPoint(stateWithPoint, target, fromPoint, groundFloorId, false)
    expect(snapResult).toBeNull() // Should not snap to itself
  })

  test('should work with complete findSnapPoint function', () => {
    const state = createEmptyModelState()
    const groundFloorId = Array.from(state.floors.keys())[0]

    // Add a point
    const point1 = createPoint(createPoint2D(100, 100))
    const stateWithPoint = addPointToFloor(state, point1, groundFloorId)

    // Test point snapping (should have priority)
    const target = createPoint2D(120, 100) // Close to point1
    const fromPoint = createPoint2D(0, 0)

    const snapResult = findSnapPoint(stateWithPoint, target, fromPoint, groundFloorId, false)
    expect(snapResult).not.toBeNull()
    // Point snapping should result in no lines array (direct point snap)
    expect(snapResult!.lines).toBeUndefined()
    expect(snapResult!.position).toEqual(point1.position)
  })
})

describe('Corner Management', () => {
  let state: ModelState
  let floorId: FloorId

  beforeEach(() => {
    state = createEmptyModelState()
    const floor = createFloor('Test Floor', createFloorLevel(0), createLength(3000))
    floorId = floor.id
    state.floors.set(floorId, floor)
  })

  describe('findWallsConnectedToPoint', () => {
    it('should find walls connected to a point', () => {
      // Add three points
      const point1 = createPoint(createPoint2D(0, 0))
      const point2 = createPoint(createPoint2D(1000, 0))
      const point3 = createPoint(createPoint2D(0, 1000))

      state = addPointToFloor(state, point1, floorId)
      state = addPointToFloor(state, point2, floorId)
      state = addPointToFloor(state, point3, floorId)

      // Add two walls sharing point1
      const wall1 = createWall(point1.id, point2.id, createLength(3000), createLength(3000), createLength(200))
      const wall2 = createWall(point1.id, point3.id, createLength(3000), createLength(3000), createLength(200))

      state = addWallToFloor(state, wall1, floorId)
      state = addWallToFloor(state, wall2, floorId)

      const connectedWalls = findWallsConnectedToPoint(state, point1.id)

      expect(connectedWalls).toHaveLength(2)
      expect(connectedWalls.map(w => w.id)).toContain(wall1.id)
      expect(connectedWalls.map(w => w.id)).toContain(wall2.id)
    })
  })

  describe('updateOrCreateCorner', () => {
    it('should create a corner when two walls meet', () => {
      // Create an L-shaped configuration
      const point1 = createPoint(createPoint2D(0, 0))
      const point2 = createPoint(createPoint2D(1000, 0))
      const point3 = createPoint(createPoint2D(0, 1000))

      state = addPointToFloor(state, point1, floorId)
      state = addPointToFloor(state, point2, floorId)
      state = addPointToFloor(state, point3, floorId)

      const wall1 = createWall(point1.id, point2.id, createLength(3000), createLength(3000), createLength(200))
      const wall2 = createWall(point1.id, point3.id, createLength(3000), createLength(3000), createLength(200))

      state = addWallToFloor(state, wall1, floorId)
      state = addWallToFloor(state, wall2, floorId)

      // Update corner at point1
      const updatedState = updateOrCreateCorner(state, point1.id)

      expect(updatedState.corners.size).toBe(1)
      const corner = Array.from(updatedState.corners.values())[0]
      expect(corner.pointId).toBe(point1.id)
      expect(corner.type).toBe('corner')
      expect([corner.wall1Id, corner.wall2Id]).toContain(wall1.id)
      expect([corner.wall1Id, corner.wall2Id]).toContain(wall2.id)
    })

    it('should create a corner (not straight) when two walls meet at any significant angle', () => {
      // Create an L-shaped configuration - with the new tolerance, this will be a corner, not straight
      const point1 = createPoint(createPoint2D(0, 0))
      const point2 = createPoint(createPoint2D(500, 0))
      const point3 = createPoint(createPoint2D(500, 500))

      state = addPointToFloor(state, point1, floorId)
      state = addPointToFloor(state, point2, floorId)
      state = addPointToFloor(state, point3, floorId)

      const wall1 = createWall(point1.id, point2.id, createLength(3000), createLength(3000), createLength(200))
      const wall2 = createWall(point2.id, point3.id, createLength(3000), createLength(3000), createLength(200))

      state = addWallToFloor(state, wall1, floorId)
      state = addWallToFloor(state, wall2, floorId)

      // Update corner at point2
      const updatedState = updateOrCreateCorner(state, point2.id)

      expect(updatedState.corners.size).toBe(1)
      const corner = Array.from(updatedState.corners.values())[0]
      expect(corner.pointId).toBe(point2.id)
      expect(corner.type).toBe('corner') // Should be corner, not straight

      // Angle should be 90 degrees
      const angleInDegrees = radiansToDegrees(corner.angle)
      expect(Math.abs(angleInDegrees - 90)).toBeLessThan(1) // Allow for small floating point errors
    })

    it('should create a tee corner when three walls meet', () => {
      // Create a T-shaped configuration - center point where 3 walls meet
      const centerPoint = createPoint(createPoint2D(500, 500)) // center of T
      const topPoint = createPoint(createPoint2D(500, 0)) // top
      const leftPoint = createPoint(createPoint2D(0, 500)) // left
      const rightPoint = createPoint(createPoint2D(1000, 500)) // right

      state = addPointToFloor(state, centerPoint, floorId)
      state = addPointToFloor(state, topPoint, floorId)
      state = addPointToFloor(state, leftPoint, floorId)
      state = addPointToFloor(state, rightPoint, floorId)

      // Three walls meeting at the center point
      const wall1 = createWall(centerPoint.id, topPoint.id, createLength(3000), createLength(3000), createLength(200)) // vertical up
      const wall2 = createWall(centerPoint.id, leftPoint.id, createLength(3000), createLength(3000), createLength(200)) // horizontal left
      const wall3 = createWall(centerPoint.id, rightPoint.id, createLength(3000), createLength(3000), createLength(200)) // horizontal right

      state = addWallToFloor(state, wall1, floorId)
      state = addWallToFloor(state, wall2, floorId)
      state = addWallToFloor(state, wall3, floorId)

      // Update corner at center point where three walls meet
      const updatedState = updateOrCreateCorner(state, centerPoint.id)

      expect(updatedState.corners.size).toBe(1)
      const corner = Array.from(updatedState.corners.values())[0]
      expect(corner.pointId).toBe(centerPoint.id)
      expect(corner.type).toBe('tee')
      expect(corner.otherWallIds!).toHaveLength(1)
    })

    it('should update wall references to include corner touches', () => {
      const point1 = createPoint(createPoint2D(0, 0))
      const point2 = createPoint(createPoint2D(1000, 0))
      const point3 = createPoint(createPoint2D(0, 1000))

      state = addPointToFloor(state, point1, floorId)
      state = addPointToFloor(state, point2, floorId)
      state = addPointToFloor(state, point3, floorId)

      const wall1 = createWall(point1.id, point2.id, createLength(3000), createLength(3000), createLength(200))
      const wall2 = createWall(point1.id, point3.id, createLength(3000), createLength(3000), createLength(200))

      state = addWallToFloor(state, wall1, floorId)
      state = addWallToFloor(state, wall2, floorId)

      const updatedState = updateOrCreateCorner(state, point1.id)
      const corner = Array.from(updatedState.corners.values())[0]

      // Check that walls now reference the corner
      const updatedWall1 = updatedState.walls.get(wall1.id)!
      const updatedWall2 = updatedState.walls.get(wall2.id)!

      expect(updatedWall1.startTouches).toBe(corner.id)
      expect(updatedWall2.startTouches).toBe(corner.id)
    })

    it('should remove corner when only one wall remains', () => {
      // First create a corner with two walls
      const point1 = createPoint(createPoint2D(0, 0))
      const point2 = createPoint(createPoint2D(1000, 0))
      const point3 = createPoint(createPoint2D(0, 1000))

      state = addPointToFloor(state, point1, floorId)
      state = addPointToFloor(state, point2, floorId)
      state = addPointToFloor(state, point3, floorId)

      const wall1 = createWall(point1.id, point2.id, createLength(3000), createLength(3000), createLength(200))
      const wall2 = createWall(point1.id, point3.id, createLength(3000), createLength(3000), createLength(200))

      state = addWallToFloor(state, wall1, floorId)
      state = addWallToFloor(state, wall2, floorId)
      state = updateOrCreateCorner(state, point1.id)

      expect(state.corners.size).toBe(1)

      // Remove one wall
      const updatedStateMap = new Map(state.walls)
      updatedStateMap.delete(wall2.id)
      const stateAfterRemoval = { ...state, walls: updatedStateMap }

      // Update corner - should be removed since only one wall remains
      const finalState = updateOrCreateCorner(stateAfterRemoval, point1.id)

      expect(finalState.corners.size).toBe(0)
    })
  })

  describe('switchCornerMainWalls', () => {
    it('should switch the main walls of a corner', () => {
      // Create a T-shaped configuration with 3 walls
      const centerPoint = createPoint(createPoint2D(500, 500))
      const topPoint = createPoint(createPoint2D(500, 0))
      const leftPoint = createPoint(createPoint2D(0, 500))
      const rightPoint = createPoint(createPoint2D(1000, 500))

      state = addPointToFloor(state, centerPoint, floorId)
      state = addPointToFloor(state, topPoint, floorId)
      state = addPointToFloor(state, leftPoint, floorId)
      state = addPointToFloor(state, rightPoint, floorId)

      const wall1 = createWall(centerPoint.id, topPoint.id, createLength(3000), createLength(3000), createLength(200))
      const wall2 = createWall(centerPoint.id, leftPoint.id, createLength(3000), createLength(3000), createLength(200))
      const wall3 = createWall(centerPoint.id, rightPoint.id, createLength(3000), createLength(3000), createLength(200))

      state = addWallToFloor(state, wall1, floorId)
      state = addWallToFloor(state, wall2, floorId)
      state = addWallToFloor(state, wall3, floorId)

      // Create corner
      state = updateOrCreateCorner(state, centerPoint.id)
      const corner = Array.from(state.corners.values())[0]

      expect(corner.type).toBe('tee')

      // Switch main walls - use wall2 and wall3 as new main walls
      const updatedState = switchCornerMainWalls(state, corner.id, wall2.id, wall3.id)
      const updatedCorner = Array.from(updatedState.corners.values())[0]

      expect(updatedCorner.wall1Id).toBe(wall2.id)
      expect(updatedCorner.wall2Id).toBe(wall3.id)
      expect(updatedCorner.otherWallIds).toContain(wall1.id)
      expect(updatedCorner.type).toBe('tee') // Still a tee
    })

    it('should throw error when switching to non-connected walls', () => {
      // Create a simple corner
      const point1 = createPoint(createPoint2D(0, 0))
      const point2 = createPoint(createPoint2D(1000, 0))
      const point3 = createPoint(createPoint2D(0, 1000))
      const point4 = createPoint(createPoint2D(2000, 0)) // Disconnected

      state = addPointToFloor(state, point1, floorId)
      state = addPointToFloor(state, point2, floorId)
      state = addPointToFloor(state, point3, floorId)
      state = addPointToFloor(state, point4, floorId)

      const wall1 = createWall(point1.id, point2.id, createLength(3000), createLength(3000), createLength(200))
      const wall2 = createWall(point1.id, point3.id, createLength(3000), createLength(3000), createLength(200))
      const wall3 = createWall(point2.id, point4.id, createLength(3000), createLength(3000), createLength(200)) // Not connected to point1

      state = addWallToFloor(state, wall1, floorId)
      state = addWallToFloor(state, wall2, floorId)
      state = addWallToFloor(state, wall3, floorId)

      state = updateOrCreateCorner(state, point1.id)
      const corner = Array.from(state.corners.values())[0]

      // Try to switch to wall3 which is not connected to the corner point
      expect(() => {
        switchCornerMainWalls(state, corner.id, wall1.id, wall3.id)
      }).toThrow('New main walls must be connected to the corner point')
    })
  })
})
