// Strong typing for entity IDs
export type WallId = string & { readonly brand: unique symbol }
export type PointId = string & { readonly brand: unique symbol }
export type RoomId = string & { readonly brand: unique symbol }
export type OpeningId = string & { readonly brand: unique symbol }
export type FloorId = string & { readonly brand: unique symbol }

// ID generation helpers
export const createWallId = (): WallId => `wall_${Date.now()}_${Math.random()}` as WallId
export const createPointId = (): PointId => `conn_${Date.now()}_${Math.random()}` as PointId
export const createRoomId = (): RoomId => `room_${Date.now()}_${Math.random()}` as RoomId
export const createOpeningId = (): OpeningId => `opening_${Date.now()}_${Math.random()}` as OpeningId
export const createFloorId = (): FloorId => `floor_${Date.now()}_${Math.random()}` as FloorId

// Type guards for runtime ID validation
export const isWallId = (id: string): id is WallId => id.startsWith('wall_')
export const isPointId = (id: string): id is PointId => id.startsWith('conn_')
export const isRoomId = (id: string): id is RoomId => id.startsWith('room_')
export const isOpeningId = (id: string): id is OpeningId => id.startsWith('opening_')
export const isFloorId = (id: string): id is FloorId => id.startsWith('floor_')
