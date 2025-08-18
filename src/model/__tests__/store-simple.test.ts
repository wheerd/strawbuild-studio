import { describe, it, expect, beforeEach } from 'vitest';
import { useModelStore } from '../store';
import { createFloor, createWall, createConnectionPoint, createOpening } from '../operations';

// Simple store tests without React hooks to avoid rendering issues
describe('ModelStore - Basic Operations', () => {
  beforeEach(() => {
    // Reset store state
    useModelStore.getState().reset();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useModelStore.getState();
      expect(state.building.floors.size).toBe(1);
      expect(state.selectedEntityIds).toEqual([]);
      expect(state.viewMode).toBe('plan');
      expect(state.gridSize).toBe(50);
      expect(state.snapToGrid).toBe(true);
    });
  });

  describe('Building Operations', () => {
    it('should reset store state', () => {
      const { reset } = useModelStore.getState();
      
      reset();
      
      const state = useModelStore.getState();
      expect(state.building.floors.size).toBe(1);
      expect(state.selectedEntityIds).toEqual([]);
      expect(state.viewMode).toBe('plan');
      expect(state.gridSize).toBe(50);
      expect(state.snapToGrid).toBe(true);
    });

    it('should add floor', () => {
      const { addFloor } = useModelStore.getState();
      const floor = createFloor('First Floor', 1, 3000);
      
      addFloor(floor);
      
      const state = useModelStore.getState();
      expect(state.building.floors.size).toBe(2);
      expect(Array.from(state.building.floors.values())[1].name).toBe('First Floor');
    });

    it('should add connection points and walls', () => {
      const { addConnectionPoint, addWall } = useModelStore.getState();
      const point1 = createConnectionPoint({ x: 0, y: 0 });
      const point2 = createConnectionPoint({ x: 1000, y: 0 });
      
      addConnectionPoint(point1);
      addConnectionPoint(point2);
      
      let state = useModelStore.getState();
      expect(state.building.connectionPoints.size).toBe(2);
      
      const wall = createWall(point1.id, point2.id);
      addWall(wall);
      
      state = useModelStore.getState();
      expect(state.building.walls.size).toBe(1);
      expect(state.building.bounds).toBeDefined();
    });

    it('should validate openings before adding', () => {
      const { addConnectionPoint, addWall, addOpening } = useModelStore.getState();
      
      // Setup wall
      const point1 = createConnectionPoint({ x: 0, y: 0 });
      const point2 = createConnectionPoint({ x: 1000, y: 0 });
      const wall = createWall(point1.id, point2.id);
      
      addConnectionPoint(point1);
      addConnectionPoint(point2);
      addWall(wall);
      
      // Valid opening
      const validOpening = createOpening(wall.id, 'door', 100, 800, 2100);
      expect(() => addOpening(validOpening)).not.toThrow();
      
      // Invalid opening
      const invalidOpening = createOpening(wall.id, 'window', 500, 800, 1200);
      expect(() => addOpening(invalidOpening)).toThrow('Invalid opening position');
    });
  });

  describe('Selection Operations', () => {
    it('should manage entity selection', () => {
      const { setSelectedEntities, toggleEntitySelection, clearSelection } = useModelStore.getState();
      
      setSelectedEntities(['wall_1', 'room_2']);
      expect(useModelStore.getState().selectedEntityIds).toEqual(['wall_1', 'room_2']);
      
      toggleEntitySelection('wall_3');
      expect(useModelStore.getState().selectedEntityIds).toContain('wall_3');
      
      toggleEntitySelection('wall_1');
      expect(useModelStore.getState().selectedEntityIds).not.toContain('wall_1');
      
      clearSelection();
      expect(useModelStore.getState().selectedEntityIds).toEqual([]);
    });
  });

  describe('View Operations', () => {
    it('should manage view state', () => {
      const { setViewMode, setGridSize, setSnapToGrid } = useModelStore.getState();
      
      setViewMode('3d');
      expect(useModelStore.getState().viewMode).toBe('3d');
      
      setGridSize(25);
      expect(useModelStore.getState().gridSize).toBe(25);
      
      setSnapToGrid(false);
      expect(useModelStore.getState().snapToGrid).toBe(false);
    });

    it('should switch active floor', () => {
      const { addFloor, setActiveFloor, getActiveFloor } = useModelStore.getState();
      
      const floor = createFloor('Second Floor', 1, 3000);
      addFloor(floor);
      
      setActiveFloor(floor.id);
      
      const activeFloor = getActiveFloor();
      expect(activeFloor?.name).toBe('Second Floor');
      expect(useModelStore.getState().activeFloorId).toBe(floor.id);
    });
  });

  describe('Wall Removal', () => {
    it('should remove wall and clean up related entities', () => {
      const { addConnectionPoint, addWall, addOpening, removeWall, setSelectedEntities } = useModelStore.getState();
      
      // Setup
      const point1 = createConnectionPoint({ x: 0, y: 0 });
      const point2 = createConnectionPoint({ x: 1000, y: 0 });
      const wall = createWall(point1.id, point2.id);
      const opening = createOpening(wall.id, 'door', 100, 800, 2100);
      
      addConnectionPoint(point1);
      addConnectionPoint(point2);
      addWall(wall);
      addOpening(opening);
      setSelectedEntities([wall.id]);
      
      let state = useModelStore.getState();
      expect(state.building.walls.size).toBe(1);
      expect(state.building.openings.size).toBe(1);
      expect(state.selectedEntityIds).toContain(wall.id);
      
      // Remove wall
      removeWall(wall.id);
      
      state = useModelStore.getState();
      expect(state.building.walls.size).toBe(0);
      expect(state.building.openings.size).toBe(0);
      expect(state.selectedEntityIds).not.toContain(wall.id);
    });
  });
});
