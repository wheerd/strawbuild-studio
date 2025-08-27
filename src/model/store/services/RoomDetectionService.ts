import type { Point2D } from '@/types/geometry'
import type { FloorId, WallId, RoomId } from '@/types/ids'

/**
 * Service for room detection and automatic room management
 * This service orchestrates multiple slices to handle room detection
 */
export interface IRoomDetectionService {
  // Room detection operations
  detectRooms: (floorId: FloorId) => void
  detectRoomAtPoint: (floorId: FloorId, point: Point2D) => void

  // Room merging and splitting
  updateRoomsAfterWallRemoval: (floorId: FloorId, removedWallId: WallId) => void
  // mergeRoomsAfterWallRemoval: (floorId: FloorId, removedWallId: WallId) => void
  updateRoomsAfterWallAddition: (floorId: FloorId, addedWallId: WallId) => void
  // splitRoomAfterWallAddition: (floorId: FloorId, addedWallId: WallId) => void

  // Configuration
  setAutoDetectionEnabled: (enabled: boolean) => void
  isAutoDetectionEnabled: () => boolean
}

export class RoomDetectionService implements IRoomDetectionService {
  private autoDetectionEnabled: boolean = true

  setAutoDetectionEnabled(enabled: boolean): void {
    this.autoDetectionEnabled = enabled
  }

  isAutoDetectionEnabled(): boolean {
    return this.autoDetectionEnabled
  }
}
