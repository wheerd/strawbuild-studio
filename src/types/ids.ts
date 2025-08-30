// Strong typing for entity IDs
export type WallId = string & { readonly brand: unique symbol }
export type PointId = string & { readonly brand: unique symbol }
export type RoomId = string & { readonly brand: unique symbol }
export type FloorId = string & { readonly brand: unique symbol }
export type SlabId = string & { readonly brand: unique symbol }
export type RoofId = string & { readonly brand: unique symbol }

export type EntityId = WallId | PointId | RoomId | FloorId | SlabId | RoofId

// ID generation helpers
export const createWallId = (): WallId => `wall_${Date.now()}_${Math.random()}` as WallId
export const createPointId = (): PointId => `point_${Date.now()}_${Math.random()}` as PointId
export const createRoomId = (): RoomId => `room_${Date.now()}_${Math.random()}` as RoomId
export const createSlabId = (): SlabId => `slab_${Date.now()}_${Math.random()}` as SlabId
export const createFloorId = (): FloorId => `floor_${Date.now()}_${Math.random()}` as FloorId
export const createRoofId = (): RoofId => `roof_${Date.now()}_${Math.random()}` as RoofId

// Type guards for runtime ID validation
export const isWallId = (id: string): id is WallId => id.startsWith('wall_')
export const isPointId = (id: string): id is PointId => id.startsWith('point_')
export const isRoomId = (id: string): id is RoomId => id.startsWith('room_')
export const isFloorId = (id: string): id is FloorId => id.startsWith('floor_')
export const isSlabId = (id: string): id is SlabId => id.startsWith('slab_')
export const isRoofId = (id: string): id is SlabId => id.startsWith('roof_')
