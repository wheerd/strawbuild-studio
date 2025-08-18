// Strong typing for entity IDs
export type WallId = string & { readonly brand: unique symbol };
export type ConnectionPointId = string & { readonly brand: unique symbol };
export type RoomId = string & { readonly brand: unique symbol };
export type OpeningId = string & { readonly brand: unique symbol };
export type FloorId = string & { readonly brand: unique symbol };

// ID generation helpers
export const createWallId = (): WallId => `wall_${Date.now()}_${Math.random()}` as WallId;
export const createConnectionPointId = (): ConnectionPointId => `conn_${Date.now()}_${Math.random()}` as ConnectionPointId;
export const createRoomId = (): RoomId => `room_${Date.now()}_${Math.random()}` as RoomId;
export const createOpeningId = (): OpeningId => `opening_${Date.now()}_${Math.random()}` as OpeningId;
export const createFloorId = (): FloorId => `floor_${Date.now()}_${Math.random()}` as FloorId;

// Type guards for runtime ID validation
export const isWallId = (id: string): id is WallId => id.startsWith('wall_');
export const isConnectionPointId = (id: string): id is ConnectionPointId => id.startsWith('conn_');
export const isRoomId = (id: string): id is RoomId => id.startsWith('room_');
export const isOpeningId = (id: string): id is OpeningId => id.startsWith('opening_');
export const isFloorId = (id: string): id is FloorId => id.startsWith('floor_');