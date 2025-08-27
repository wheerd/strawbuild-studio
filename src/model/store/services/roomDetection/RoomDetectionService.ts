import type { WallId, FloorId } from '@/types/ids'
import type { Point2D } from '@/types/geometry'
import type { StoreState } from '../../types'
import { useModelStore } from '../..'

export interface IRoomDetectionService {
  // Room detection operations
  detectRooms: (floorId: FloorId) => void
  detectRoomAtPoint: (floorId: FloorId, point: Point2D) => void

  // Room merging and splitting
  updateRoomsAfterWallRemoval: (floorId: FloorId, removedWallId: WallId) => void
  updateRoomsAfterWallAddition: (floorId: FloorId, addedWallId: WallId) => void

  // Configuration
  setAutoDetectionEnabled: (enabled: boolean) => void
  isAutoDetectionEnabled: () => boolean
}

export class RoomDetectionService implements IRoomDetectionService {
  private autoDetectionEnabled: boolean = true
  private get: () => StoreState
  private set: (state: StoreState) => void

  constructor (get: () => StoreState, set: (state: StoreState) => void) {
    this.get = get
    this.set = set
    this.autoDetectionEnabled = true
  }

  setAutoDetectionEnabled (enabled: boolean): void {
    this.autoDetectionEnabled = enabled
  }

  isAutoDetectionEnabled (): boolean {
    return this.autoDetectionEnabled
  }

  detectRooms (floorId: FloorId): void {
    if (!this.autoDetectionEnabled) return

    // Basic room detection implementation
    console.log('Room detection for floor:', floorId)
    
    // TODO: Implement advanced room detection algorithm
    // For now, this is a placeholder that maintains the interface
  }

  detectRoomAtPoint (_floorId: FloorId, _point: Point2D): void {
    if (!this.autoDetectionEnabled) return

    // TODO: Implement point-based room detection
    console.log('Point-based room detection not yet implemented')
  }

  updateRoomsAfterWallRemoval (floorId: FloorId, removedWallId: WallId): void {
   
  }

  updateRoomsAfterWallAddition (floorId: FloorId, addedWallId: WallId): void {
   // Check the endpoints of the added wall
   // If they share a room id, we may need to split the room
   // This can be done by 
  }

}

export const defaultRoomDetectionService = new RoomDetectionService(useModelStore.getState, useModelStore.setState)