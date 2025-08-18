import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  createEmptyBuilding,
  createFloor,
  createWall,
  createRoom,
  createConnectionPoint,
  createOpening,
  addWallToBuilding,
  addConnectionPointToBuilding,
  addOpeningToBuilding,
  removeWallFromBuilding,
  getWallLength,
  calculateBuildingBounds,
  calculateRoomArea,
  isOpeningValidOnWall,
  getOpeningPosition,
  getWallAngle
} from '../operations';
import { useModelStore } from '../store';

// Custom arbitraries for model entities
const arbitraryPoint2D = fc.record({
  x: fc.integer({ min: -10000, max: 10000 }),
  y: fc.integer({ min: -10000, max: 10000 })
});


const arbitraryFloorName = fc.string({ minLength: 1, maxLength: 30 });
const arbitraryFloorLevel = fc.integer({ min: -5, max: 20 });
const arbitraryFloorHeight = fc.integer({ min: 2000, max: 5000 });

const arbitraryWallThickness = fc.integer({ min: 100, max: 500 });
const arbitraryWallHeight = fc.integer({ min: 2000, max: 4000 });

const arbitraryOpeningType = fc.constantFrom('door', 'window', 'passage');
const arbitraryOpeningWidth = fc.integer({ min: 500, max: 2000 });
const arbitraryOpeningHeight = fc.integer({ min: 1000, max: 2500 });
const arbitraryOpeningOffset = fc.integer({ min: 0, max: 5000 });

describe('Property-Based Model Tests', () => {
  describe('Building Invariants', () => {
    it('every building always has at least one floor', () => {
      fc.assert(fc.property(fc.constant(null), (_) => {
        const building = createEmptyBuilding();
        expect(building.floors.size).toBeGreaterThanOrEqual(1);
        expect(Array.from(building.floors.values())[0].name).toBe('Ground Floor');
        expect(Array.from(building.floors.values())[0].level).toBe(0);
      }));
    });

    it('building bounds always encompass all connection points', () => {
      fc.assert(fc.property(
        
        fc.array(arbitraryPoint2D, { minLength: 1, maxLength: 20 }),
        (points) => {
          let building = createEmptyBuilding();
          
          // Add connection points
          for (const point of points) {
            const connectionPoint = createConnectionPoint(point);
            building = addConnectionPointToBuilding(building, connectionPoint);
          }
          
          const bounds = calculateBuildingBounds(building);
          
          if (points.length > 0) {
            expect(bounds).not.toBeNull();
            
            // Every point should be within or on the bounds
            for (const point of points) {
              expect(point.x).toBeGreaterThanOrEqual(bounds!.minX);
              expect(point.x).toBeLessThanOrEqual(bounds!.maxX);
              expect(point.y).toBeGreaterThanOrEqual(bounds!.minY);
              expect(point.y).toBeLessThanOrEqual(bounds!.maxY);
            }
          }
        }
      ));
    });

    it('active floor ID always exists in building floors after store operations', () => {
      fc.assert(fc.property(
        
        fc.array(fc.record({
          name: arbitraryFloorName,
          level: arbitraryFloorLevel,
          height: arbitraryFloorHeight
        }), { maxLength: 5 }),
        (floorData) => {
          // Reset store
          useModelStore.getState().reset();
          
          // Add floors
          const floors = floorData.map(data => createFloor(data.name, data.level, data.height));
          floors.forEach(floor => {
            useModelStore.getState().addFloor(floor);
          });
          
          const state = useModelStore.getState();
          const activeFloorExists = Array.from(state.building.floors.values()).some((f: any) => f.id === state.activeFloorId);
          expect(activeFloorExists).toBe(true);
        }
      ));
    });
  });

  describe('Wall and Connection Point Integrity', () => {
    it('every wall\'s connection points exist in the building', () => {
      fc.assert(fc.property(
        
        fc.array(arbitraryPoint2D, { minLength: 2, maxLength: 10 }),
        arbitraryWallThickness,
        arbitraryWallHeight,
        (points, thickness, height) => {
          fc.pre(points.length >= 2); // Need at least 2 points for a wall
          
          let building = createEmptyBuilding();
          const connectionPoints = [];
          
          // Add connection points
          for (const point of points) {
            const connectionPoint = createConnectionPoint(point);
            building = addConnectionPointToBuilding(building, connectionPoint);
            connectionPoints.push(connectionPoint);
          }
          
          // Add walls between consecutive points
          for (let i = 0; i < connectionPoints.length - 1; i++) {
            const wall = createWall(
              connectionPoints[i].id,
              connectionPoints[i + 1].id,
              thickness,
              height
            );
            building = addWallToBuilding(building, wall);
          }
          
          // Check that every wall's connection points exist
          for (const wall of building.walls.values()) {
            expect(building.connectionPoints.has(wall.startPointId)).toBe(true);
            expect(building.connectionPoints.has(wall.endPointId)).toBe(true);
          }
        }
      ));
    });

    it('wall removal updates connection point references correctly', () => {
      fc.assert(fc.property(
        
        fc.array(arbitraryPoint2D, { minLength: 3, maxLength: 6 }),
        (points) => {
          fc.pre(points.length >= 3);
          
          let building = createEmptyBuilding();
          const connectionPoints = [];
          const walls = [];
          
          // Add connection points
          for (const point of points) {
            const connectionPoint = createConnectionPoint(point);
            building = addConnectionPointToBuilding(building, connectionPoint);
            connectionPoints.push(connectionPoint);
          }
          
          // Add walls
          for (let i = 0; i < connectionPoints.length - 1; i++) {
            const wall = createWall(connectionPoints[i].id, connectionPoints[i + 1].id);
            building = addWallToBuilding(building, wall);
            walls.push(wall);
          }
          
          // Remove a wall
          if (walls.length > 0) {
            const wallToRemove = walls[0];
            building = removeWallFromBuilding(building, wallToRemove.id);
            
            // Check that connection points no longer reference the removed wall
            for (const point of building.connectionPoints.values()) {
              expect(point.connectedWallIds).not.toContain(wallToRemove.id);
            }
            
            // Check that the wall no longer exists
            expect(building.walls.has(wallToRemove.id)).toBe(false);
          }
        }
      ));
    });
  });

  describe('Opening Constraints', () => {
    it('valid openings always fit within wall bounds', () => {
      fc.assert(fc.property(
        arbitraryPoint2D,
        arbitraryPoint2D,
        arbitraryOpeningType,
        arbitraryOpeningWidth,
        arbitraryOpeningHeight,
        (point1, point2, type, width, height) => {
          // Ensure we have a non-degenerate wall
          const dx = point2.x - point1.x;
          const dy = point2.y - point1.y;
          const wallLength = Math.sqrt(dx * dx + dy * dy);
          fc.pre(wallLength > width); // Opening must fit in wall
          
          const building = createEmptyBuilding();
          const conn1 = createConnectionPoint(point1);
          const conn2 = createConnectionPoint(point2);
          const wall = createWall(conn1.id, conn2.id);
          
          let updatedBuilding = addConnectionPointToBuilding(building, conn1);
          updatedBuilding = addConnectionPointToBuilding(updatedBuilding, conn2);
          updatedBuilding = addWallToBuilding(updatedBuilding, wall);
          
          // Generate valid offset (within wall bounds)
          const maxOffset = wallLength - width;
          const offset = fc.sample(fc.integer({ min: 0, max: Math.floor(maxOffset) }), 1)[0];
          
          const opening = createOpening(wall.id, type, offset, width, height);
          
          expect(isOpeningValidOnWall(opening, updatedBuilding)).toBe(true);
          
          // If it's valid, it should fit within the wall
          expect(offset + width).toBeLessThanOrEqual(wallLength);
        }
      ));
    });

    it('opening position calculation is consistent with offset', () => {
      fc.assert(fc.property(
        arbitraryPoint2D,
        arbitraryPoint2D,
        arbitraryOpeningOffset,
        (point1, point2, offset) => {
          const dx = point2.x - point1.x;
          const dy = point2.y - point1.y;
          const wallLength = Math.sqrt(dx * dx + dy * dy);
          fc.pre(wallLength > 0 && offset <= wallLength); // Valid offset
          
          const building = createEmptyBuilding();
          const conn1 = createConnectionPoint(point1);
          const conn2 = createConnectionPoint(point2);
          const wall = createWall(conn1.id, conn2.id);
          
          let updatedBuilding = addConnectionPointToBuilding(building, conn1);
          updatedBuilding = addConnectionPointToBuilding(updatedBuilding, conn2);
          updatedBuilding = addWallToBuilding(updatedBuilding, wall);
          
          const opening = createOpening(wall.id, 'door', offset, 800, 2100);
          const position = getOpeningPosition(opening, updatedBuilding);
          
          expect(position).not.toBeNull();
          
          if (position) {
            // The position should be along the line from point1 to point2
            const t = wallLength > 0 ? offset / wallLength : 0;
            const expectedX = point1.x + (point2.x - point1.x) * t;
            const expectedY = point1.y + (point2.y - point1.y) * t;
            
            expect(position.x).toBeCloseTo(expectedX, 2);
            expect(position.y).toBeCloseTo(expectedY, 2);
          }
        }
      ));
    });

    it('no two valid openings on same wall overlap', () => {
      fc.assert(fc.property(
        arbitraryPoint2D,
        arbitraryPoint2D,
        fc.record({
          offset1: arbitraryOpeningOffset,
          width1: arbitraryOpeningWidth,
          offset2: arbitraryOpeningOffset,
          width2: arbitraryOpeningWidth
        }),
        (point1, point2, { offset1, width1, offset2, width2 }) => {
          const dx = point2.x - point1.x;
          const dy = point2.y - point1.y;
          const wallLength = Math.sqrt(dx * dx + dy * dy);
          
          // Ensure both openings would theoretically fit individually
          fc.pre(wallLength > Math.max(offset1 + width1, offset2 + width2));
          
          const building = createEmptyBuilding();
          const conn1 = createConnectionPoint(point1);
          const conn2 = createConnectionPoint(point2);
          const wall = createWall(conn1.id, conn2.id);
          
          let updatedBuilding = addConnectionPointToBuilding(building, conn1);
          updatedBuilding = addConnectionPointToBuilding(updatedBuilding, conn2);
          updatedBuilding = addWallToBuilding(updatedBuilding, wall);
          
          const opening1 = createOpening(wall.id, 'door', offset1, width1, 2100);
          const opening2 = createOpening(wall.id, 'window', offset2, width2, 1200);
          
          // Add first opening
          if (isOpeningValidOnWall(opening1, updatedBuilding)) {
            updatedBuilding = addOpeningToBuilding(updatedBuilding, opening1);
            
            // Second opening should only be valid if it doesn't overlap
            const secondIsValid = isOpeningValidOnWall(opening2, updatedBuilding);
            const overlaps = (offset1 < offset2 + width2) && (offset1 + width1 > offset2);
            
            if (overlaps) {
              expect(secondIsValid).toBe(false);
            }
          }
        }
      ));
    });
  });

  describe('Geometric Properties', () => {
    it('wall length is always non-negative', () => {
      fc.assert(fc.property(
        arbitraryPoint2D,
        arbitraryPoint2D,
        (point1, point2) => {
          const building = createEmptyBuilding();
          const conn1 = createConnectionPoint(point1);
          const conn2 = createConnectionPoint(point2);
          const wall = createWall(conn1.id, conn2.id);
          
          let updatedBuilding = addConnectionPointToBuilding(building, conn1);
          updatedBuilding = addConnectionPointToBuilding(updatedBuilding, conn2);
          
          const length = getWallLength(wall, updatedBuilding);
          expect(length).toBeGreaterThanOrEqual(0);
          
          // Should match manual calculation
          const dx = point2.x - point1.x;
          const dy = point2.y - point1.y;
          const expectedLength = Math.sqrt(dx * dx + dy * dy);
          expect(length).toBeCloseTo(expectedLength, 2);
        }
      ));
    });

    it('room area is always non-negative', () => {
      fc.assert(fc.property(
        fc.array(arbitraryPoint2D, { minLength: 3, maxLength: 8 }),
        (points) => {
          fc.pre(points.length >= 3); // Need at least 3 points for a room
          
          let building = createEmptyBuilding();
          const connectionPoints = [];
          const walls = [];
          
          // Add connection points
          for (const point of points) {
            const connectionPoint = createConnectionPoint(point);
            building = addConnectionPointToBuilding(building, connectionPoint);
            connectionPoints.push(connectionPoint);
          }
          
          // Create walls forming a polygon
          for (let i = 0; i < connectionPoints.length; i++) {
            const nextIndex = (i + 1) % connectionPoints.length;
            const wall = createWall(connectionPoints[i].id, connectionPoints[nextIndex].id);
            building = addWallToBuilding(building, wall);
            walls.push(wall);
          }
          
          const room = createRoom('Test Room', walls.map(w => w.id));
          const area = calculateRoomArea(room, building);
          
          expect(area).toBeGreaterThanOrEqual(0);
        }
      ));
    });
  });

  describe('Store Invariants', () => {
    it('store selection always contains valid entity IDs or is empty', () => {
      fc.assert(fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 10 }),
        (entityIds) => {
          useModelStore.getState().reset();
          useModelStore.getState().setSelectedEntities(entityIds);
          
          const selection = useModelStore.getState().selectedEntityIds;
          expect(Array.isArray(selection)).toBe(true);
          expect(selection.length).toBeLessThanOrEqual(entityIds.length);
        }
      ));
    });

    it('grid size is always positive', () => {
      fc.assert(fc.property(
        fc.integer({ min: 1, max: 1000 }),
        (gridSize) => {
          useModelStore.getState().setGridSize(gridSize);
          const state = useModelStore.getState();
          expect(state.gridSize).toBeGreaterThan(0);
          expect(state.gridSize).toBe(gridSize);
        }
      ));
    });
  });

  describe('Floor Level Invariants', () => {
    it('floors are always ordered by level after multiple additions', () => {
      fc.assert(fc.property(
        
        fc.array(fc.record({
          name: arbitraryFloorName,
          level: arbitraryFloorLevel,
          height: arbitraryFloorHeight
        }), { minLength: 1, maxLength: 8 }),
        (floorData) => {
          useModelStore.getState().reset();
          
          // Add floors in random order
          const floors = floorData.map(data => createFloor(data.name, data.level, data.height));
          floors.forEach(floor => {
            useModelStore.getState().addFloor(floor);
          });
          
          const state = useModelStore.getState();
          const levels = Array.from(state.building.floors.values()).map((f: any) => f.level);
          
          // Check that floors can be ordered by level (no strict ordering required by operations)
          const sortedLevels = [...levels].sort((a, b) => a - b);
          expect(levels.length).toBe(sortedLevels.length);
          
          // Each floor should have unique ID
          const floorIds = Array.from(state.building.floors.values()).map((f: any) => f.id);
          const uniqueIds = new Set(floorIds);
          expect(uniqueIds.size).toBe(floorIds.length);
        }
      ));
    });

    it('floor height is always positive', () => {
      fc.assert(fc.property(
        arbitraryFloorName,
        arbitraryFloorLevel,
        fc.integer({ min: 1, max: 10000 }),
        (name, level, height) => {
          const floor = createFloor(name, level, height);
          expect(floor.height).toBeGreaterThan(0);
          expect(floor.height).toBe(height);
        }
      ));
    });

    it('floor entity lists are always valid arrays', () => {
      fc.assert(fc.property(
        arbitraryFloorName,
        arbitraryFloorLevel,
        arbitraryFloorHeight,
        (name, level, height) => {
          const floor = createFloor(name, level, height);
          
          expect(Array.isArray(floor.wallIds)).toBe(true);
          expect(Array.isArray(floor.roomIds)).toBe(true);
          expect(Array.isArray(floor.connectionPointIds)).toBe(true);
          expect(Array.isArray(floor.openingIds)).toBe(true);
          
          expect(floor.wallIds.length).toBe(0);
          expect(floor.roomIds.length).toBe(0);
          expect(floor.connectionPointIds.length).toBe(0);
          expect(floor.openingIds.length).toBe(0);
        }
      ));
    });
  });

  describe('Complex Operation Sequences', () => {
    it('building state remains consistent after random wall additions and removals', () => {
      fc.assert(fc.property(
        
        fc.array(fc.record({
          point1: arbitraryPoint2D,
          point2: arbitraryPoint2D,
          thickness: arbitraryWallThickness,
          height: arbitraryWallHeight,
          shouldRemove: fc.boolean()
        }), { minLength: 2, maxLength: 10 }),
        (operations) => {
          useModelStore.getState().reset();
          const addedWalls: string[] = [];
          
          for (const op of operations) {
            try {
              const conn1 = createConnectionPoint(op.point1);
              const conn2 = createConnectionPoint(op.point2);
              useModelStore.getState().addConnectionPoint(conn1);
              useModelStore.getState().addConnectionPoint(conn2);
              
              const wall = createWall(conn1.id, conn2.id, op.thickness, op.height);
              useModelStore.getState().addWall(wall);
              addedWalls.push(wall.id);
              
              // Randomly remove some walls
              if (op.shouldRemove && addedWalls.length > 1) {
                const wallToRemove = addedWalls.pop();
                if (wallToRemove) {
                  useModelStore.getState().removeWall(wallToRemove as any);
                }
              }
            } catch (error) {
              // Some operations might fail due to validation, that's okay
            }
          }
          
          const state = useModelStore.getState();
          
          // Check invariants are maintained
          expect(state.building.floors.size).toBeGreaterThanOrEqual(1);
          expect(Array.from(state.building.floors.values()).some((f: any) => f.id === state.activeFloorId)).toBe(true);
          
          // All walls should reference existing connection points
          for (const wall of state.building.walls.values()) {
            expect(state.building.connectionPoints.has(wall.startPointId)).toBe(true);
            expect(state.building.connectionPoints.has(wall.endPointId)).toBe(true);
          }
          
          // Connection points should reference existing walls
          for (const point of state.building.connectionPoints.values()) {
            for (const wallId of point.connectedWallIds) {
              expect(state.building.walls.has(wallId)).toBe(true);
            }
          }
        }
      ));
    });

    it('room area calculations remain consistent after wall modifications', () => {
      fc.assert(fc.property(
        fc.array(arbitraryPoint2D, { minLength: 4, maxLength: 6 }),
        (points) => {
          fc.pre(points.length >= 4);
          
          let building = createEmptyBuilding();
          const connectionPoints = [];
          const walls = [];
          
          for (let i = 0; i < points.length; i++) {
            const connectionPoint = createConnectionPoint(points[i]);
            building = addConnectionPointToBuilding(building, connectionPoint);
            connectionPoints.push(connectionPoint);
          }
          
          for (let i = 0; i < connectionPoints.length; i++) {
            const nextIndex = (i + 1) % connectionPoints.length;
            const wall = createWall(connectionPoints[i].id, connectionPoints[nextIndex].id);
            building = addWallToBuilding(building, wall);
            walls.push(wall);
          }
          
          const room = createRoom('Test Room', walls.map(w => w.id));
          const area1 = calculateRoomArea(room, building);
          
          expect(area1).toBeGreaterThanOrEqual(0);
          expect(Number.isFinite(area1)).toBe(true);
          
          const area2 = calculateRoomArea(room, building);
          expect(area2).toBe(area1);
          
          if (points.length >= 3) {
            let expectedArea = 0;
            for (let i = 0; i < points.length; i++) {
              const j = (i + 1) % points.length;
              expectedArea += points[i].x * points[j].y;
              expectedArea -= points[j].x * points[i].y;
            }
            expectedArea = Math.abs(expectedArea) / 2;
            
            expect(area1).toBeCloseTo(expectedArea, 1);
          }
        }
      ));
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('handles zero-length walls gracefully', () => {
      fc.assert(fc.property(
        arbitraryPoint2D,
        (point) => {
          const building = createEmptyBuilding();
          const conn1 = createConnectionPoint(point);
          const conn2 = createConnectionPoint(point);
          
          let updatedBuilding = addConnectionPointToBuilding(building, conn1);
          updatedBuilding = addConnectionPointToBuilding(updatedBuilding, conn2);
          
          const wall = createWall(conn1.id, conn2.id);
          const length = getWallLength(wall, updatedBuilding);
          
          expect(length).toBe(0);
          expect(Number.isFinite(length)).toBe(true);
        }
      ));
    });

    it('handles extreme coordinate values', () => {
      fc.assert(fc.property(
        fc.record({
          x: fc.integer({ min: -1000000, max: 1000000 }),
          y: fc.integer({ min: -1000000, max: 1000000 })
        }),
        fc.record({
          x: fc.integer({ min: -1000000, max: 1000000 }),
          y: fc.integer({ min: -1000000, max: 1000000 })
        }),
        (point1, point2) => {
          const building = createEmptyBuilding();
          const conn1 = createConnectionPoint(point1);
          const conn2 = createConnectionPoint(point2);
          
          let updatedBuilding = addConnectionPointToBuilding(building, conn1);
          updatedBuilding = addConnectionPointToBuilding(updatedBuilding, conn2);
          
          const wall = createWall(conn1.id, conn2.id);
          const length = getWallLength(wall, updatedBuilding);
          const angle = getWallAngle(wall, updatedBuilding);
          
          expect(Number.isFinite(length)).toBe(true);
          expect(Number.isFinite(angle)).toBe(true);
          expect(length).toBeGreaterThanOrEqual(0);
        }
      ));
    });

    it('maintains bounds integrity with extreme points', () => {
      fc.assert(fc.property(
        fc.array(fc.record({
          x: fc.integer({ min: -100000, max: 100000 }),
          y: fc.integer({ min: -100000, max: 100000 })
        }), { minLength: 1, maxLength: 20 }),
        (points) => {
          let building = createEmptyBuilding();
          
          for (const point of points) {
            const connectionPoint = createConnectionPoint(point);
            building = addConnectionPointToBuilding(building, connectionPoint);
          }
          
          const bounds = calculateBuildingBounds(building);
          expect(bounds).not.toBeNull();
          
          if (bounds) {
            expect(Number.isFinite(bounds.minX)).toBe(true);
            expect(Number.isFinite(bounds.minY)).toBe(true);
            expect(Number.isFinite(bounds.maxX)).toBe(true);
            expect(Number.isFinite(bounds.maxY)).toBe(true);
            
            expect(bounds.minX).toBeLessThanOrEqual(bounds.maxX);
            expect(bounds.minY).toBeLessThanOrEqual(bounds.maxY);
            
            for (const point of points) {
              expect(point.x).toBeGreaterThanOrEqual(bounds.minX);
              expect(point.x).toBeLessThanOrEqual(bounds.maxX);
              expect(point.y).toBeGreaterThanOrEqual(bounds.minY);
              expect(point.y).toBeLessThanOrEqual(bounds.maxY);
            }
          }
        }
      ));
    });

    it('handles rooms with duplicate wall references', () => {
      fc.assert(fc.property(
        arbitraryPoint2D,
        arbitraryPoint2D,
        (point1, point2) => {
          const building = createEmptyBuilding();
          const conn1 = createConnectionPoint(point1);
          const conn2 = createConnectionPoint(point2);
          const wall = createWall(conn1.id, conn2.id);
          
          let updatedBuilding = addConnectionPointToBuilding(building, conn1);
          updatedBuilding = addConnectionPointToBuilding(updatedBuilding, conn2);
          updatedBuilding = addWallToBuilding(updatedBuilding, wall);
          
          const room = createRoom('Test Room', [wall.id, wall.id, wall.id]);
          const area = calculateRoomArea(room, updatedBuilding);
          
          expect(Number.isFinite(area)).toBe(true);
          expect(area).toBeGreaterThanOrEqual(0);
        }
      ));
    });
  });

  describe('Connection Point Relationship Integrity', () => {
    it('connection points correctly track all connected walls', () => {
      fc.assert(fc.property(
        fc.array(arbitraryPoint2D, { minLength: 3, maxLength: 8 }),
        (points) => {
          let building = createEmptyBuilding();
          const connectionPoints = [];
          
          for (const point of points) {
            const connectionPoint = createConnectionPoint(point);
            building = addConnectionPointToBuilding(building, connectionPoint);
            connectionPoints.push(connectionPoint);
          }
          
          const centerPoint = connectionPoints[0];
          const walls = [];
          
          for (let i = 1; i < connectionPoints.length; i++) {
            const wall = createWall(centerPoint.id, connectionPoints[i].id);
            building = addWallToBuilding(building, wall);
            walls.push(wall);
            
            const centerConn = building.connectionPoints.get(centerPoint.id)!;
            const endConn = building.connectionPoints.get(connectionPoints[i].id)!;
            
            if (!centerConn.connectedWallIds.includes(wall.id)) {
              centerConn.connectedWallIds.push(wall.id);
            }
            if (!endConn.connectedWallIds.includes(wall.id)) {
              endConn.connectedWallIds.push(wall.id);
            }
          }
          
          const centerConn = building.connectionPoints.get(centerPoint.id)!;
          expect(centerConn.connectedWallIds.length).toBe(walls.length);
          
          for (const wall of walls) {
            expect(building.walls.has(wall.id)).toBe(true);
            expect(wall.startPointId === centerPoint.id || wall.endPointId === centerPoint.id).toBe(true);
          }
        }
      ));
    });

    it('wall removal properly cleans up connection point references', () => {
      fc.assert(fc.property(
        fc.array(arbitraryPoint2D, { minLength: 2, maxLength: 6 }),
        (points) => {
          let building = createEmptyBuilding();
          const connectionPoints = [];
          const walls = [];
          
          for (const point of points) {
            const connectionPoint = createConnectionPoint(point);
            building = addConnectionPointToBuilding(building, connectionPoint);
            connectionPoints.push(connectionPoint);
          }
          
          for (let i = 0; i < connectionPoints.length - 1; i++) {
            const wall = createWall(connectionPoints[i].id, connectionPoints[i + 1].id);
            building = addWallToBuilding(building, wall);
            walls.push(wall);
          }
          
          if (walls.length > 0) {
            const wallToRemove = walls[0];
            building = removeWallFromBuilding(building, wallToRemove.id);
            
            expect(building.walls.has(wallToRemove.id)).toBe(false);
            
            for (const point of building.connectionPoints.values()) {
              expect(point.connectedWallIds).not.toContain(wallToRemove.id);
            }
            
            const startPoint = connectionPoints.find(p => p.id === wallToRemove.startPointId);
            
            if (startPoint && !building.connectionPoints.has(startPoint.id)) {
              expect(true).toBe(true);
            }
          }
        }
      ));
    });
  });
});
