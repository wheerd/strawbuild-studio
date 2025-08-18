import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { ModelState, Wall, Room, ConnectionPoint, Opening, Floor } from '../types/model';
import type { FloorId, WallId } from '../types/ids';
import {
  createEmptyBuilding,
  addFloorToBuilding,
  addWallToBuilding,
  addRoomToBuilding,
  addConnectionPointToBuilding,
  addOpeningToBuilding,
  removeWallFromBuilding,
  calculateBuildingBounds,
  calculateRoomArea
} from './operations';

interface ModelActions {
  // Building operations
  reset: () => void;
  
  // Entity operations
  addFloor: (floor: Floor) => void;
  addWall: (wall: Wall) => void;
  addRoom: (room: Room) => void;
  addConnectionPoint: (connectionPoint: ConnectionPoint) => void;
  addOpening: (opening: Opening) => void;
  removeWall: (wallId: WallId) => void;
  
  // View state operations
  setActiveFloor: (floorId: FloorId) => void;
  setSelectedEntities: (entityIds: string[]) => void;
  toggleEntitySelection: (entityId: string) => void;
  clearSelection: () => void;
  setViewMode: (viewMode: ModelState['viewMode']) => void;
  setGridSize: (gridSize: number) => void;
  setSnapToGrid: (snapToGrid: boolean) => void;
  
  // Computed getters
  getActiveFloor: () => Floor | null;
}

type ModelStore = ModelState & ModelActions;

function createInitialState(): ModelState {
  const building = createEmptyBuilding();
  const groundFloor = Array.from(building.floors.values())[0];
  
  return {
    building,
    activeFloorId: groundFloor.id,
    selectedEntityIds: [],
    viewMode: 'plan',
    gridSize: 50,
    snapToGrid: true
  };
}

export const useModelStore = create<ModelStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      ...createInitialState(),
      
      // Building operations
      reset: () => {
        const building = createEmptyBuilding();
        const groundFloor = Array.from(building.floors.values())[0];
        
        set({
          building,
          activeFloorId: groundFloor.id,
          selectedEntityIds: [],
          viewMode: 'plan',
          gridSize: 50,
          snapToGrid: true
        }, false, 'reset');
      },
      
      // Entity operations
      addFloor: (floor: Floor) => {
        const state = get();
        const updatedBuilding = addFloorToBuilding(state.building, floor);
        
        set({ 
          building: updatedBuilding 
        }, false, 'addFloor');
      },
      
      addWall: (wall: Wall) => {
        const state = get();
        let updatedBuilding = addWallToBuilding(state.building, wall);
        
        // Update building bounds
        const bounds = calculateBuildingBounds(updatedBuilding);
        updatedBuilding = { ...updatedBuilding, bounds: bounds || undefined };
        
        set({ 
          building: updatedBuilding 
        }, false, 'addWall');
      },
      
      addRoom: (room: Room) => {
        const state = get();
        
        // Calculate room area
        const area = calculateRoomArea(room, state.building);
        const roomWithArea = { ...room, area };
        
        const updatedBuilding = addRoomToBuilding(state.building, roomWithArea);
        
        set({ 
          building: updatedBuilding 
        }, false, 'addRoom');
      },
      
      addConnectionPoint: (connectionPoint: ConnectionPoint) => {
        const state = get();
        const updatedBuilding = addConnectionPointToBuilding(state.building, connectionPoint);
        
        set({ 
          building: updatedBuilding 
        }, false, 'addConnectionPoint');
      },
      
      addOpening: (opening: Opening) => {
        const state = get();
        const updatedBuilding = addOpeningToBuilding(state.building, opening);
        
        set({ 
          building: updatedBuilding 
        }, false, 'addOpening');
      },
      
      removeWall: (wallId: WallId) => {
        const state = get();
        let updatedBuilding = removeWallFromBuilding(state.building, wallId);
        
        // Update building bounds
        const bounds = calculateBuildingBounds(updatedBuilding);
        updatedBuilding = { ...updatedBuilding, bounds: bounds || undefined };
        
        set({
          building: updatedBuilding,
          selectedEntityIds: state.selectedEntityIds.filter(id => id !== wallId)
        }, false, 'removeWall');
      },
      
      // View state operations
      setActiveFloor: (floorId: FloorId) => {
        set({
          activeFloorId: floorId,
          selectedEntityIds: []
        }, false, 'setActiveFloor');
      },
      
      setSelectedEntities: (entityIds: string[]) => {
        set({ 
          selectedEntityIds: entityIds 
        }, false, 'setSelectedEntities');
      },
      
      toggleEntitySelection: (entityId: string) => {
        const state = get();
        const isSelected = state.selectedEntityIds.includes(entityId);
        const selectedEntityIds = isSelected
          ? state.selectedEntityIds.filter(id => id !== entityId)
          : [...state.selectedEntityIds, entityId];
        
        set({ 
          selectedEntityIds 
        }, false, 'toggleEntitySelection');
      },
      
      clearSelection: () => {
        set({ 
          selectedEntityIds: [] 
        }, false, 'clearSelection');
      },
      
      setViewMode: (viewMode: ModelState['viewMode']) => {
        set({ 
          viewMode 
        }, false, 'setViewMode');
      },
      
      setGridSize: (gridSize: number) => {
        set({ 
          gridSize 
        }, false, 'setGridSize');
      },
      
      setSnapToGrid: (snapToGrid: boolean) => {
        set({ 
          snapToGrid 
        }, false, 'setSnapToGrid');
      },
      
      // Computed getters
      getActiveFloor: () => {
        const state = get();
        return state.building.floors.get(state.activeFloorId) || null;
      }
    }),
    {
      name: 'strawbaler-model-store'
    }
  )
);

// Selector hooks for optimized re-renders
export const useBuilding = () => useModelStore(state => state.building);
export const useActiveFloor = () => useModelStore(state => state.getActiveFloor());
export const useActiveFloorId = () => useModelStore(state => state.activeFloorId);
export const useSelectedEntities = () => useModelStore(state => state.selectedEntityIds);
export const useViewMode = () => useModelStore(state => state.viewMode);
export const useGridSettings = () => useModelStore(state => ({
  gridSize: state.gridSize,
  snapToGrid: state.snapToGrid
}));

// Action selectors
export const useModelActions = () => useModelStore(state => ({
  reset: state.reset,
  addFloor: state.addFloor,
  addWall: state.addWall,
  addRoom: state.addRoom,
  addConnectionPoint: state.addConnectionPoint,
  addOpening: state.addOpening,
  removeWall: state.removeWall,
  setActiveFloor: state.setActiveFloor,
  setSelectedEntities: state.setSelectedEntities,
  toggleEntitySelection: state.toggleEntitySelection,
  clearSelection: state.clearSelection,
  setViewMode: state.setViewMode,
  setGridSize: state.setGridSize,
  setSnapToGrid: state.setSnapToGrid
}));
