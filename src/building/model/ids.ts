import { createId } from '@/shared/utils/ids'

const STOREY_ID_PREFIX = 'storey_'
const PERIMETER_ID_PREFIX = 'perimeter_'
const PERIMETER_WALL_ID_PREFIX = 'outwall_'
const PERIMETER_CORNER_ID_PREFIX = 'outcorner_'
const OPENING_ID_PREFIX = 'opening_'
const POST_ID_PREFIX = 'post_'
const RING_BEAM_ID_PREFIX = 'ringbeam_'
const WALL_ASSEMBLY_ID_PREFIX = 'wa_'
const FLOOR_ASSEMBLY_ID_PREFIX = 'fa_'
const ROOF_ASSEMBLY_ID_PREFIX = 'ra_'
const OPENING_ASSEMBLY_ID_PREFIX = 'oa_'
const FLOOR_AREA_ID_PREFIX = 'floorarea_'
const FLOOR_OPENING_ID_PREFIX = 'flooropening_'
const ROOF_ID_PREFIX = 'roof_'
const ROOF_OVERHANG_ID_PREFIX = 'roofoverhang_'
const ROOM_ID_PREFIX = 'room_'
const WALL_NODE_ID_PREFIX = 'wallnode_'
const INTERMEDIATE_WALL_ID_PREFIX = 'intermediate_'

// Strong typing for entity IDs
export type StoreyId = `${typeof STOREY_ID_PREFIX}${string}`
export type PerimeterId = `${typeof PERIMETER_ID_PREFIX}${string}`
export type FloorAreaId = `${typeof FLOOR_AREA_ID_PREFIX}${string}`
export type FloorOpeningId = `${typeof FLOOR_OPENING_ID_PREFIX}${string}`
export type RoofId = `${typeof ROOF_ID_PREFIX}${string}`

// Sub-entity ID types for hierarchical selection
export type PerimeterWallId = `${typeof PERIMETER_WALL_ID_PREFIX}${string}`
export type PerimeterCornerId = `${typeof PERIMETER_CORNER_ID_PREFIX}${string}`
export type OpeningId = `${typeof OPENING_ID_PREFIX}${string}`
export type WallPostId = `${typeof POST_ID_PREFIX}${string}`
export type RoofOverhangId = `${typeof ROOF_OVERHANG_ID_PREFIX}${string}`
export type RoomId = `${typeof ROOM_ID_PREFIX}${string}`
export type WallNodeId = `${typeof WALL_NODE_ID_PREFIX}${string}`
export type IntermediateWallId = `${typeof INTERMEDIATE_WALL_ID_PREFIX}${string}`

export type EntityId = PerimeterId | FloorAreaId | FloorOpeningId | RoofId
export type SelectableId =
  | PerimeterId
  | FloorAreaId
  | FloorOpeningId
  | PerimeterWallId
  | PerimeterCornerId
  | OpeningId
  | WallPostId
  | RoofId
  | RoofOverhangId
  | RoomId
  | WallNodeId
  | IntermediateWallId

// Config ids
export type RingBeamAssemblyId = `${typeof RING_BEAM_ID_PREFIX}${string}`
export type WallAssemblyId = `${typeof WALL_ASSEMBLY_ID_PREFIX}${string}`
export type FloorAssemblyId = `${typeof FLOOR_ASSEMBLY_ID_PREFIX}${string}`
export type RoofAssemblyId = `${typeof ROOF_ASSEMBLY_ID_PREFIX}${string}`
export type OpeningAssemblyId = `${typeof OPENING_ASSEMBLY_ID_PREFIX}${string}`

// ID generation helpers
export const createStoreyId = (): StoreyId => createId(STOREY_ID_PREFIX)
export const createPerimeterId = (): PerimeterId => createId(PERIMETER_ID_PREFIX)
export const createFloorAreaId = (): FloorAreaId => createId(FLOOR_AREA_ID_PREFIX)
export const createFloorOpeningId = (): FloorOpeningId => createId(FLOOR_OPENING_ID_PREFIX)
export const createRoofId = (): RoofId => createId(ROOF_ID_PREFIX)

// Sub-entity ID generators
export const createPerimeterWallId = (): PerimeterWallId => createId(PERIMETER_WALL_ID_PREFIX)
export const createPerimeterCornerId = (): PerimeterCornerId => createId(PERIMETER_CORNER_ID_PREFIX)
export const createOpeningId = (): OpeningId => createId(OPENING_ID_PREFIX)
export const createWallPostId = (): WallPostId => createId(POST_ID_PREFIX)
export const createRoofOverhangId = (): RoofOverhangId => createId(ROOF_OVERHANG_ID_PREFIX)
export const createRoomId = (): RoomId => createId(ROOM_ID_PREFIX)
export const createWallNodeId = (): WallNodeId => createId(WALL_NODE_ID_PREFIX)
export const createIntermediateWallId = (): IntermediateWallId => createId(INTERMEDIATE_WALL_ID_PREFIX)

// Config ID generators
export const createRingBeamAssemblyId = (): RingBeamAssemblyId => createId(RING_BEAM_ID_PREFIX)
export const createWallAssemblyId = (): WallAssemblyId => createId(WALL_ASSEMBLY_ID_PREFIX)
export const createFloorAssemblyId = (): FloorAssemblyId => createId(FLOOR_ASSEMBLY_ID_PREFIX)
export const createRoofAssemblyId = (): RoofAssemblyId => createId(ROOF_ASSEMBLY_ID_PREFIX)
export const createOpeningAssemblyId = (): OpeningAssemblyId => createId(OPENING_ASSEMBLY_ID_PREFIX)

// Default floor construction config ID constant
export const DEFAULT_FLOOR_ASSEMBLY_ID = 'fa_clt_default' as FloorAssemblyId

// Type guards for runtime ID validation
export const isStoreyId = (id: string): id is StoreyId => id.startsWith(STOREY_ID_PREFIX)
export const isPerimeterId = (id: string): id is PerimeterId => id.startsWith(PERIMETER_ID_PREFIX)
export const isFloorAreaId = (id: string): id is FloorAreaId => id.startsWith(FLOOR_AREA_ID_PREFIX)
export const isFloorOpeningId = (id: string): id is FloorOpeningId => id.startsWith(FLOOR_OPENING_ID_PREFIX)
export const isRoofId = (id: string): id is RoofId => id.startsWith(ROOF_ID_PREFIX)

// Sub-entity type guards
export const isPerimeterWallId = (id: string): id is PerimeterWallId => id.startsWith(PERIMETER_WALL_ID_PREFIX)
export const isPerimeterCornerId = (id: string): id is PerimeterCornerId => id.startsWith(PERIMETER_CORNER_ID_PREFIX)
export const isOpeningId = (id: string): id is OpeningId => id.startsWith(OPENING_ID_PREFIX)
export const isWallPostId = (id: string): id is WallPostId => id.startsWith(POST_ID_PREFIX)
export const isRoofOverhangId = (id: string): id is RoofOverhangId => id.startsWith(ROOF_OVERHANG_ID_PREFIX)
export const isRoomId = (id: string): id is RoomId => id.startsWith(ROOF_ID_PREFIX)
export const isWallNodeId = (id: string): id is WallNodeId => id.startsWith(WALL_NODE_ID_PREFIX)
export const isIntermediateWallId = (id: string): id is IntermediateWallId => id.startsWith(INTERMEDIATE_WALL_ID_PREFIX)

// Config type guards
export const isRingBeamAssemblyId = (id: string): id is RingBeamAssemblyId => id.startsWith(RING_BEAM_ID_PREFIX)
export const isWallAssemblyId = (id: string): id is WallAssemblyId => id.startsWith(WALL_ASSEMBLY_ID_PREFIX)
export const isFloorAssemblyId = (id: string): id is FloorAssemblyId => id.startsWith(FLOOR_ASSEMBLY_ID_PREFIX)
export const isRoofAssemblyId = (id: string): id is RoofAssemblyId => id.startsWith(ROOF_ASSEMBLY_ID_PREFIX)
export const isOpeningAssemblyId = (id: string): id is OpeningAssemblyId => id.startsWith(OPENING_ASSEMBLY_ID_PREFIX)

// Entity type definitions for hit testing
export type EntityType =
  | 'perimeter'
  | 'perimeter-wall'
  | 'perimeter-corner'
  | 'opening'
  | 'wall-post'
  | 'intermediate-wall'
  | 'room'
  | 'wall-node'
  | 'floor-area'
  | 'floor-opening'
  | 'roof'

export type WallId = PerimeterWallId | IntermediateWallId
export type NodeId = PerimeterCornerId | WallNodeId
export type WallEntityId = OpeningId | WallPostId
