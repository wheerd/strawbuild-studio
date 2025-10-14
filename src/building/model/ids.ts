import { createId } from '@/shared/utils/ids'

const STOREY_ID_PREFIX = 'storey_'
const PERIMETER_ID_PREFIX = 'perimeter_'
const PERIMETER_WALL_ID_PREFIX = 'outwall_'
const PERIMETER_CORNER_ID_PREFIX = 'outcorner_'
const OPENING_ID_PREFIX = 'opening_'
const RING_BEAM_ID_PREFIX = 'ringbeam_'
const PERIMETER_CONSTRUCTION_METHOD_ID_PREFIX = 'pwcm_'
const SLAB_CONSTRUCTION_CONFIG_ID_PREFIX = 'scm_'

// Strong typing for entity IDs
export type StoreyId = `${typeof STOREY_ID_PREFIX}${string}`
export type PerimeterId = `${typeof PERIMETER_ID_PREFIX}${string}`

// Sub-entity ID types for hierarchical selection
export type PerimeterWallId = `${typeof PERIMETER_WALL_ID_PREFIX}${string}`
export type PerimeterCornerId = `${typeof PERIMETER_CORNER_ID_PREFIX}${string}`
export type OpeningId = `${typeof OPENING_ID_PREFIX}${string}`

export type EntityId = StoreyId | PerimeterId
export type SelectableId = StoreyId | PerimeterId | PerimeterWallId | PerimeterCornerId | OpeningId

// Config ids
export type RingBeamConstructionMethodId = `${typeof RING_BEAM_ID_PREFIX}${string}`
export type PerimeterConstructionMethodId = `${typeof PERIMETER_CONSTRUCTION_METHOD_ID_PREFIX}${string}`
export type SlabConstructionConfigId = `${typeof SLAB_CONSTRUCTION_CONFIG_ID_PREFIX}${string}`

// ID generation helpers
export const createStoreyId = (): StoreyId => createId(STOREY_ID_PREFIX)
export const createPerimeterId = (): PerimeterId => createId(PERIMETER_ID_PREFIX)

// Sub-entity ID generators
export const createPerimeterWallId = (): PerimeterWallId => createId(PERIMETER_WALL_ID_PREFIX)
export const createPerimeterCornerId = (): PerimeterCornerId => createId(PERIMETER_CORNER_ID_PREFIX)
export const createOpeningId = (): OpeningId => createId(OPENING_ID_PREFIX)

// Config ID generators
export const createRingBeamConstructionMethodId = (): RingBeamConstructionMethodId => createId(RING_BEAM_ID_PREFIX)
export const createPerimeterConstructionMethodId = (): PerimeterConstructionMethodId =>
  createId(PERIMETER_CONSTRUCTION_METHOD_ID_PREFIX)
export const createSlabConstructionConfigId = (): SlabConstructionConfigId =>
  createId(SLAB_CONSTRUCTION_CONFIG_ID_PREFIX)

// Default slab construction config ID constant
export const DEFAULT_SLAB_CONFIG_ID = 'scm_clt_default' as SlabConstructionConfigId

// Type guards for runtime ID validation
export const isStoreyId = (id: string): id is StoreyId => id.startsWith(STOREY_ID_PREFIX)
export const isPerimeterId = (id: string): id is PerimeterId => id.startsWith(PERIMETER_ID_PREFIX)

// Sub-entity type guards
export const isPerimeterWallId = (id: string): id is PerimeterWallId => id.startsWith(PERIMETER_WALL_ID_PREFIX)
export const isPerimeterCornerId = (id: string): id is PerimeterCornerId => id.startsWith(PERIMETER_CORNER_ID_PREFIX)
export const isOpeningId = (id: string): id is OpeningId => id.startsWith(OPENING_ID_PREFIX)

// Config type guards
export const isRingBeamConstructionMethodId = (id: string): id is RingBeamConstructionMethodId =>
  id.startsWith(RING_BEAM_ID_PREFIX)
export const isPerimeterConstructionMethodId = (id: string): id is PerimeterConstructionMethodId =>
  id.startsWith(PERIMETER_CONSTRUCTION_METHOD_ID_PREFIX)
export const isSlabConstructionConfigId = (id: string): id is SlabConstructionConfigId =>
  id.startsWith(SLAB_CONSTRUCTION_CONFIG_ID_PREFIX)

// Entity type definitions for hit testing
export type EntityType = 'storey' | 'perimeter' | 'perimeter-wall' | 'perimeter-corner' | 'opening'
