import type { ModelState } from '@/types/model'
import type { FloorId } from '@/types/ids'
import type { WallsActions } from './slices/wallsSlice'
import type { PointsActions } from './slices/pointsSlice'
import type { RoomsActions } from './slices/roomsSlice'
import type { FloorsActions } from './slices/floorsSlice'
import type { CornersActions } from './slices/cornersSlice'

/**
 * Combined store interface that includes all slices
 */
export interface StoreState extends ModelState {
  // State is already in ModelState - slices don't add state, just actions
}

/**
 * Combined actions interface from all slices
 */
export interface StoreActions extends 
  WallsActions,
  PointsActions, 
  RoomsActions,
  FloorsActions,
  CornersActions {
  
  // Core store actions
  reset: () => void
  
  // Service actions (until we move them to proper services)
  detectAndUpdateRooms: (floorId: FloorId) => void
  
  // Undo/redo actions (provided by temporal middleware)
  // undo: () => void
  // redo: () => void
  // These are accessed through useModelStore.temporal.getState()
}

/**
 * Full store type combining state and actions
 */
export type Store = StoreState & StoreActions

/**
 * Service dependencies type for dependency injection
 */
export interface ServiceDependencies {
  getState: () => ModelState
  actions: StoreActions
}