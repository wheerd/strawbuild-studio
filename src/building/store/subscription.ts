import type {
  Constraint,
  FloorOpening,
  Opening,
  OpeningGeometry,
  Perimeter,
  PerimeterCorner,
  PerimeterWall,
  Roof,
  Storey,
  WallPost,
  WallPostGeometry
} from '@/building/model'
import {
  type ConstraintId,
  type FloorOpeningId,
  type OpeningId,
  type PerimeterCornerId,
  type PerimeterId,
  type PerimeterWallId,
  type RoofId,
  type StoreyId,
  type WallPostId
} from '@/building/model/ids'
import { subscribeRecords } from '@/shared/utils/subscription'

import { useModelStore } from './store'

export const subscribeToRoofs = (cb: (id: RoofId, current?: Roof, previous?: Roof) => void) =>
  subscribeRecords(useModelStore, s => s.roofs, cb)

export const subscribeToPerimeters = (cb: (id: PerimeterId, current?: Perimeter, previous?: Perimeter) => void) =>
  subscribeRecords(useModelStore, s => s.perimeters, cb)

export const subscribeToWalls = (
  cb: (id: PerimeterWallId, current?: PerimeterWall, previous?: PerimeterWall) => void
) => subscribeRecords(useModelStore, s => s.perimeterWalls, cb)

export const subscribeToCorners = (
  cb: (id: PerimeterCornerId, current?: PerimeterCorner, previous?: PerimeterCorner) => void
) => subscribeRecords(useModelStore, s => s.perimeterCorners, cb)

export const subscribeToFloorOpenings = (
  cb: (id: FloorOpeningId, current?: FloorOpening, previous?: FloorOpening) => void
) => subscribeRecords(useModelStore, s => s.floorOpenings, cb)

export const subscribeToWallOpenings = (cb: (id: OpeningId, current?: Opening, previous?: Opening) => void) =>
  subscribeRecords(useModelStore, s => s.openings, cb)

export const subscribeToWallPosts = (cb: (id: WallPostId, current?: WallPost, previous?: WallPost) => void) =>
  subscribeRecords(useModelStore, s => s.wallPosts, cb)

export const subscribeToStoreys = (cb: (id: StoreyId, current?: Storey, previous?: Storey) => void) =>
  subscribeRecords(useModelStore, s => s.storeys, cb)

export const subscribeToOpeningGeometry = (
  cb: (id: OpeningId, current?: OpeningGeometry, previous?: OpeningGeometry) => void
) => subscribeRecords(useModelStore, s => s._openingGeometry, cb)

export const subscribeToWallPostGeometry = (
  cb: (id: WallPostId, current?: WallPostGeometry, previous?: WallPostGeometry) => void
) => subscribeRecords(useModelStore, s => s._wallPostGeometry, cb)

export const subscribeToConstraints = (cb: (id: ConstraintId, current?: Constraint, previous?: Constraint) => void) =>
  subscribeRecords(useModelStore, s => s.buildingConstraints, cb)

export const subscribeToModelChanges = useModelStore.subscribe
