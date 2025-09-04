// Strong typing for entity IDs
export type FloorId = string & { readonly brand: unique symbol }
export type OuterWallId = string & { readonly brand: unique symbol }

// Sub-entity ID types for hierarchical selection
export type WallSegmentId = string & { readonly brand: unique symbol }
export type OuterCornerId = string & { readonly brand: unique symbol }
export type OpeningId = string & { readonly brand: unique symbol }

export type EntityId = FloorId | OuterWallId
export type SelectableId = FloorId | OuterWallId | WallSegmentId | OuterCornerId | OpeningId

// ID generation helpers
export const createFloorId = (): FloorId => `floor_${Date.now()}_${Math.random()}` as FloorId
export const createOuterWallId = (): OuterWallId => `outside_${Date.now()}_${Math.random()}` as OuterWallId

// Sub-entity ID generators
export const createWallSegmentId = (): WallSegmentId => `segment_${Date.now()}_${Math.random()}` as WallSegmentId
export const createOuterCornerId = (): OuterCornerId => `outcorner_${Date.now()}_${Math.random()}` as OuterCornerId
export const createOpeningId = (): OpeningId => `opening_${Date.now()}_${Math.random()}` as OpeningId

// Type guards for runtime ID validation
export const isFloorId = (id: string): id is FloorId => id.startsWith('floor_')
export const isOuterWallId = (id: string): id is OuterWallId => id.startsWith('outside_')

// Sub-entity type guards
export const isWallSegmentId = (id: string): id is WallSegmentId => id.startsWith('segment_')
export const isOuterCornerId = (id: string): id is OuterCornerId => id.startsWith('outcorner_')
export const isOpeningId = (id: string): id is OpeningId => id.startsWith('opening_')

// Entity type definitions for hit testing
export type EntityType = 'floor' | 'outer-wall' | 'wall-segment' | 'outer-corner' | 'opening'
