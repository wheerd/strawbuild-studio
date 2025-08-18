import { describe, it, expect } from 'vitest'
import {
  createEmptyBuilding,
  createFloor,
  createWall,
  createRoom,
  createConnectionPoint,
  createOpening,
  getOpeningPosition,
  isOpeningValidOnWall,
  calculateRoomArea,
  getWallLength,
  getWallAngle,
  calculateBuildingBounds,
  addFloorToBuilding,
  addWallToBuilding,
  addConnectionPointToBuilding,
  addRoomToBuilding,
  addOpeningToBuilding,
  removeWallFromBuilding
} from '../operations'
import type { Building } from '../../types/model'

describe('Model Operations', () => {
  describe('Factory Functions', () => {
    it('should create empty building with ground floor', () => {
      const building = createEmptyBuilding()

      expect(building.floors.size).toBe(1)
      const groundFloor = Array.from(building.floors.values())[0]
      expect(groundFloor.name).toBe('Ground Floor')
      expect(groundFloor.level).toBe(0)
      expect(groundFloor.height).toBe(3000)
      expect(building.walls.size).toBe(0)
      expect(building.rooms.size).toBe(0)
      expect(building.connectionPoints.size).toBe(0)
      expect(building.openings.size).toBe(0)
      expect(building.createdAt).toBeInstanceOf(Date)
      expect(building.updatedAt).toBeInstanceOf(Date)
    })

    it('should create floor with correct properties', () => {
      const floor = createFloor('First Floor', 1, 2800)

      expect(floor.name).toBe('First Floor')
      expect(floor.level).toBe(1)
      expect(floor.height).toBe(2800)
      expect(floor.wallIds).toEqual([])
      expect(floor.roomIds).toEqual([])
      expect(floor.connectionPointIds).toEqual([])
      expect(floor.openingIds).toEqual([])
    })

    it('should create connection point with position', () => {
      const point = createConnectionPoint({ x: 100, y: 200 })

      expect(point.position.x).toBe(100)
      expect(point.position.y).toBe(200)
      expect(point.connectedWallIds).toEqual([])
    })

    it('should create wall with default properties', () => {
      const point1 = createConnectionPoint({ x: 0, y: 0 })
      const point2 = createConnectionPoint({ x: 1000, y: 0 })
      const wall = createWall(point1.id, point2.id)

      expect(wall.startPointId).toBe(point1.id)
      expect(wall.endPointId).toBe(point2.id)
      expect(wall.thickness).toBe(200)
      expect(wall.height).toBe(3000)
      expect(wall.openingIds).toEqual([])
    })

    it('should create wall with custom properties', () => {
      const point1 = createConnectionPoint({ x: 0, y: 0 })
      const point2 = createConnectionPoint({ x: 1000, y: 0 })
      const wall = createWall(point1.id, point2.id, 150, 2700)

      expect(wall.thickness).toBe(150)
      expect(wall.height).toBe(2700)
    })

    it('should create room with properties', () => {
      const wallIds = ['wall_1', 'wall_2'] as any
      const room = createRoom('Living Room', wallIds)

      expect(room.name).toBe('Living Room')
      expect(room.wallIds).toEqual(wallIds)
      expect(room.area).toBe(0)
    })

    it('should create opening with offset positioning', () => {
      const opening = createOpening('wall_1' as any, 'door', 500, 800, 2100, 100)

      expect(opening.wallId).toBe('wall_1')
      expect(opening.type).toBe('door')
      expect(opening.offsetFromStart).toBe(500)
      expect(opening.width).toBe(800)
      expect(opening.height).toBe(2100)
      expect(opening.sillHeight).toBe(100)
    })
  })

  describe('Geometric Calculations', () => {
    it('should calculate wall length correctly', () => {
      const building = createEmptyBuilding()
      const point1 = createConnectionPoint({ x: 0, y: 0 })
      const point2 = createConnectionPoint({ x: 300, y: 400 })
      const wall = createWall(point1.id, point2.id)

      building.connectionPoints.set(point1.id, point1)
      building.connectionPoints.set(point2.id, point2)

      const length = getWallLength(wall, building)
      expect(length).toBe(500) // 3-4-5 triangle
    })

    it('should return 0 for wall with missing connection points', () => {
      const building = createEmptyBuilding()
      const point1 = createConnectionPoint({ x: 0, y: 0 })
      const point2 = createConnectionPoint({ x: 100, y: 0 })
      const wall = createWall(point1.id, point2.id)

      // Don't add connection points to building
      const length = getWallLength(wall, building)
      expect(length).toBe(0)
    })

    it('should calculate wall angle correctly', () => {
      const building = createEmptyBuilding()
      const point1 = createConnectionPoint({ x: 0, y: 0 })
      const point2 = createConnectionPoint({ x: 100, y: 100 })
      const wall = createWall(point1.id, point2.id)

      building.connectionPoints.set(point1.id, point1)
      building.connectionPoints.set(point2.id, point2)

      const angle = getWallAngle(wall, building)
      expect(angle).toBeCloseTo(Math.PI / 4) // 45 degrees in radians
    })

    it('should calculate building bounds correctly', () => {
      const building = createEmptyBuilding()
      const points = [
        createConnectionPoint({ x: -100, y: -200 }),
        createConnectionPoint({ x: 300, y: 150 }),
        createConnectionPoint({ x: 0, y: 400 })
      ]

      points.forEach(p => building.connectionPoints.set(p.id, p))

      const bounds = calculateBuildingBounds(building)
      expect(bounds).toEqual({
        minX: -100,
        minY: -200,
        maxX: 300,
        maxY: 400
      })
    })

    it('should return null bounds for empty building', () => {
      const building = createEmptyBuilding()
      const bounds = calculateBuildingBounds(building)
      expect(bounds).toBeNull()
    })

    it('should calculate room area using shoelace formula', () => {
      const building = createEmptyBuilding()

      // Create a simple square room (1000x1000mm)
      const points = [
        createConnectionPoint({ x: 0, y: 0 }),
        createConnectionPoint({ x: 1000, y: 0 }),
        createConnectionPoint({ x: 1000, y: 1000 }),
        createConnectionPoint({ x: 0, y: 1000 })
      ]

      const walls = [
        createWall(points[0].id, points[1].id),
        createWall(points[1].id, points[2].id),
        createWall(points[2].id, points[3].id),
        createWall(points[3].id, points[0].id)
      ]

      points.forEach(p => building.connectionPoints.set(p.id, p))
      walls.forEach(w => building.walls.set(w.id, w))

      const room = createRoom('Square Room', walls.map(w => w.id))
      const area = calculateRoomArea(room, building)

      expect(area).toBe(1000000) // 1 square meter in mm²
    })

    it('should return 0 area for room with less than 3 walls', () => {
      const building = createEmptyBuilding()
      const room = createRoom('Invalid Room', ['wall1', 'wall2'] as any)

      const area = calculateRoomArea(room, building)
      expect(area).toBe(0)
    })
  })

  describe('Opening Position Calculations', () => {
    it('should calculate opening absolute position from offset', () => {
      const building = createEmptyBuilding()
      const point1 = createConnectionPoint({ x: 0, y: 0 })
      const point2 = createConnectionPoint({ x: 1000, y: 0 })
      const wall = createWall(point1.id, point2.id)
      const opening = createOpening(wall.id, 'door', 250, 800, 2100)

      building.connectionPoints.set(point1.id, point1)
      building.connectionPoints.set(point2.id, point2)
      building.walls.set(wall.id, wall)

      const position = getOpeningPosition(opening, building)

      expect(position).toEqual({ x: 250, y: 0 })
    })

    it('should calculate opening position on angled wall', () => {
      const building = createEmptyBuilding()
      const point1 = createConnectionPoint({ x: 0, y: 0 })
      const point2 = createConnectionPoint({ x: 300, y: 400 }) // 5-unit length wall
      const wall = createWall(point1.id, point2.id)
      const opening = createOpening(wall.id, 'door', 250, 800, 2100) // Half way (250/500)

      building.connectionPoints.set(point1.id, point1)
      building.connectionPoints.set(point2.id, point2)
      building.walls.set(wall.id, wall)

      const position = getOpeningPosition(opening, building)

      expect(position?.x).toBeCloseTo(150) // 300 * 0.5
      expect(position?.y).toBeCloseTo(200) // 400 * 0.5
    })

    it('should return null for opening with invalid wall', () => {
      const building = createEmptyBuilding()
      const opening = createOpening('invalid_wall' as any, 'door', 250, 800, 2100)

      const position = getOpeningPosition(opening, building)
      expect(position).toBeNull()
    })

    it('should validate opening within wall bounds', () => {
      const building = createEmptyBuilding()
      const point1 = createConnectionPoint({ x: 0, y: 0 })
      const point2 = createConnectionPoint({ x: 1000, y: 0 })
      const wall = createWall(point1.id, point2.id)

      building.connectionPoints.set(point1.id, point1)
      building.connectionPoints.set(point2.id, point2)
      building.walls.set(wall.id, wall)

      // Valid opening within bounds
      const validOpening = createOpening(wall.id, 'door', 100, 800, 2100)
      expect(isOpeningValidOnWall(validOpening, building)).toBe(true)

      // Invalid opening - exceeds wall length
      const invalidOpening1 = createOpening(wall.id, 'door', 500, 800, 2100)
      expect(isOpeningValidOnWall(invalidOpening1, building)).toBe(false)

      // Invalid opening - starts before wall
      const invalidOpening2 = createOpening(wall.id, 'door', -100, 800, 2100)
      expect(isOpeningValidOnWall(invalidOpening2, building)).toBe(false)
    })

    it('should detect overlapping openings', () => {
      const building = createEmptyBuilding()
      const point1 = createConnectionPoint({ x: 0, y: 0 })
      const point2 = createConnectionPoint({ x: 2000, y: 0 })
      const wall = createWall(point1.id, point2.id)

      building.connectionPoints.set(point1.id, point1)
      building.connectionPoints.set(point2.id, point2)
      building.walls.set(wall.id, wall)

      // Add first opening
      const opening1 = createOpening(wall.id, 'door', 200, 800, 2100)
      wall.openingIds.push(opening1.id)
      building.openings.set(opening1.id, opening1)

      // Non-overlapping opening should be valid
      const opening2 = createOpening(wall.id, 'window', 1100, 600, 1200)
      expect(isOpeningValidOnWall(opening2, building)).toBe(true)

      // Overlapping opening should be invalid
      const opening3 = createOpening(wall.id, 'window', 500, 600, 1200)
      expect(isOpeningValidOnWall(opening3, building)).toBe(false)
    })
  })

  describe('Building Operations', () => {
    let building: Building

    beforeEach(() => {
      building = createEmptyBuilding()
    })

    it('should add floor to building', () => {
      const floor = createFloor('Second Floor', 1, 3200)
      const updatedBuilding = addFloorToBuilding(building, floor)

      expect(updatedBuilding.floors.size).toBe(2)
      expect(updatedBuilding.floors.get(floor.id)).toEqual(floor)
      expect(updatedBuilding.updatedAt.getTime()).toBeGreaterThanOrEqual(building.updatedAt.getTime())
    })

    it('should add connection point to building', () => {
      const point = createConnectionPoint({ x: 100, y: 200 })
      const updatedBuilding = addConnectionPointToBuilding(building, point)

      expect(updatedBuilding.connectionPoints.size).toBe(1)
      expect(updatedBuilding.connectionPoints.get(point.id)).toEqual(point)
    })

    it('should add wall to building', () => {
      const point1 = createConnectionPoint({ x: 0, y: 0 })
      const point2 = createConnectionPoint({ x: 1000, y: 0 })
      const wall = createWall(point1.id, point2.id)

      const updatedBuilding = addWallToBuilding(building, wall)

      expect(updatedBuilding.walls.size).toBe(1)
      expect(updatedBuilding.walls.get(wall.id)).toEqual(wall)
    })

    it('should add room to building', () => {
      const room = createRoom('Living Room', [])
      const updatedBuilding = addRoomToBuilding(building, room)

      expect(updatedBuilding.rooms.size).toBe(1)
      expect(updatedBuilding.rooms.get(room.id)).toEqual(room)
    })

    it('should add valid opening to building', () => {
      // Setup wall first
      const point1 = createConnectionPoint({ x: 0, y: 0 })
      const point2 = createConnectionPoint({ x: 1000, y: 0 })
      const wall = createWall(point1.id, point2.id)

      building.connectionPoints.set(point1.id, point1)
      building.connectionPoints.set(point2.id, point2)
      building.walls.set(wall.id, wall)

      const opening = createOpening(wall.id, 'door', 100, 800, 2100)
      const updatedBuilding = addOpeningToBuilding(building, opening)

      expect(updatedBuilding.openings.size).toBe(1)
      expect(updatedBuilding.openings.get(opening.id)).toEqual(opening)
      expect(updatedBuilding.walls.get(wall.id)?.openingIds).toContain(opening.id)
    })

    it('should throw error for invalid opening', () => {
      // Setup wall first
      const point1 = createConnectionPoint({ x: 0, y: 0 })
      const point2 = createConnectionPoint({ x: 1000, y: 0 })
      const wall = createWall(point1.id, point2.id)

      building.connectionPoints.set(point1.id, point1)
      building.connectionPoints.set(point2.id, point2)
      building.walls.set(wall.id, wall)

      // Invalid opening that exceeds wall bounds
      const opening = createOpening(wall.id, 'door', 500, 800, 2100)

      expect(() => addOpeningToBuilding(building, opening)).toThrow('Invalid opening position')
    })

    it('should remove wall and clean up related entities', () => {
      // Setup
      const point1 = createConnectionPoint({ x: 0, y: 0 })
      const point2 = createConnectionPoint({ x: 1000, y: 0 })
      const wall = createWall(point1.id, point2.id)
      const opening = createOpening(wall.id, 'door', 100, 800, 2100)

      point1.connectedWallIds.push(wall.id)
      point2.connectedWallIds.push(wall.id)
      wall.openingIds.push(opening.id)

      building.connectionPoints.set(point1.id, point1)
      building.connectionPoints.set(point2.id, point2)
      building.walls.set(wall.id, wall)
      building.openings.set(opening.id, opening)

      const updatedBuilding = removeWallFromBuilding(building, wall.id)

      expect(updatedBuilding.walls.size).toBe(0)
      expect(updatedBuilding.openings.size).toBe(0)
      expect(updatedBuilding.connectionPoints.size).toBe(0) // Should be cleaned up
    })
  })
})
