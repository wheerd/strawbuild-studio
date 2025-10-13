// Strong typing for entity IDs
export type StoreyId = string & { readonly brand: unique symbol }
export type PerimeterId = string & { readonly brand: unique symbol }

// Sub-entity ID types for hierarchical selection
export type PerimeterWallId = string & { readonly brand: unique symbol }
export type PerimeterCornerId = string & { readonly brand: unique symbol }
export type OpeningId = string & { readonly brand: unique symbol }

export type EntityId = StoreyId | PerimeterId
export type SelectableId = StoreyId | PerimeterId | PerimeterWallId | PerimeterCornerId | OpeningId

// Config ids
export type RingBeamConstructionMethodId = string & { readonly brand: unique symbol }
export type PerimeterConstructionMethodId = string & { readonly brand: unique symbol }
export type FloorConstructionConfigId = string & { readonly brand: unique symbol }

// ID generation helpers
export const createStoreyId = (): StoreyId => `storey_${Date.now()}_${Math.random()}` as StoreyId
export const createPerimeterId = (): PerimeterId => `perimeter_${Date.now()}_${Math.random()}` as PerimeterId

// Sub-entity ID generators
export const createPerimeterWallId = (): PerimeterWallId => `outwall_${Date.now()}_${Math.random()}` as PerimeterWallId
export const createPerimeterCornerId = (): PerimeterCornerId =>
  `outcorner_${Date.now()}_${Math.random()}` as PerimeterCornerId
export const createOpeningId = (): OpeningId => `opening_${Date.now()}_${Math.random()}` as OpeningId

// Config ID generators
export const createRingBeamConstructionMethodId = (): RingBeamConstructionMethodId =>
  `ringbeam_${Date.now()}_${Math.random()}` as RingBeamConstructionMethodId
export const createPerimeterConstructionMethodId = (): PerimeterConstructionMethodId =>
  `pwcm_${Date.now()}_${Math.random()}` as PerimeterConstructionMethodId
export const createFloorConstructionConfigId = (): FloorConstructionConfigId =>
  `fcm_${Date.now()}_${Math.random()}` as FloorConstructionConfigId

// Type guards for runtime ID validation
export const isStoreyId = (id: string): id is StoreyId => id.startsWith('storey_')
export const isPerimeterId = (id: string): id is PerimeterId => id.startsWith('perimeter_')

// Sub-entity type guards
export const isPerimeterWallId = (id: string): id is PerimeterWallId => id.startsWith('outwall_')
export const isPerimeterCornerId = (id: string): id is PerimeterCornerId => id.startsWith('outcorner_')
export const isOpeningId = (id: string): id is OpeningId => id.startsWith('opening_')

// Config type guards
export const isRingBeamConstructionMethodId = (id: string): id is RingBeamConstructionMethodId =>
  id.startsWith('ringbeam_')
export const isPerimeterConstructionMethodId = (id: string): id is PerimeterConstructionMethodId =>
  id.startsWith('pwcm_')
export const isFloorConstructionConfigId = (id: string): id is FloorConstructionConfigId => id.startsWith('fcm_')

// Entity type definitions for hit testing
export type EntityType = 'storey' | 'perimeter' | 'perimeter-wall' | 'perimeter-corner' | 'opening'
