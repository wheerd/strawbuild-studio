import type { StateCreator } from 'zustand'

import type {
  Opening,
  OpeningGeometry,
  OpeningParams,
  OpeningWithGeometry,
  WallEntityGeometrySource,
  WallPost,
  WallPostGeometry,
  WallPostParams,
  WallPostWithGeometry
} from '@/building/model'
import type { OpeningId, PerimeterWallId, WallEntityId, WallId, WallPostId } from '@/building/model/ids'
import { createOpeningId, createWallPostId, isOpeningId, isPerimeterWallId, isWallPostId } from '@/building/model/ids'
import { InvalidOperationError, NotFoundError } from '@/building/store/errors'
import { removeConstraintsForEntityDraft } from '@/building/store/slices/constraintsSlice'
import {
  type TimestampsState,
  removeTimestampDraft,
  updateTimestampDraft
} from '@/building/store/slices/timestampsSlice'
import type { StoreState } from '@/building/store/types'
import type { Length } from '@/shared/geometry'
import { distVec2, perpendicularCCW, scaleAddVec2 } from '@/shared/geometry'

import { updateEntityGeometry } from './perimeterGeometry'

export interface WallEntitiesState {
  openings: Record<OpeningId, Opening>
  _openingGeometry: Record<OpeningId, OpeningGeometry>

  wallPosts: Record<WallPostId, WallPost>
  _wallPostGeometry: Record<WallPostId, WallPostGeometry>
}

export interface WallEntitiesActions {
  addWallOpening: (wallId: WallId, openingParams: OpeningParams) => OpeningWithGeometry
  removeWallOpening: (openingId: OpeningId) => void
  updateWallOpening: (openingId: OpeningId, updates: Partial<OpeningParams>) => void
  isWallOpeningPlacementValid: (
    wallId: WallId,
    centerOffsetFromWallStart: Length,
    width: Length,
    excludedOpening?: OpeningId
  ) => boolean
  findNearestValidWallOpeningPosition: (
    wallId: WallId,
    preferredCenterOffset: Length,
    width: Length,
    excludedOpening?: OpeningId
  ) => Length | null

  addWallPost: (wallId: WallId, postParams: WallPostParams) => WallPostWithGeometry
  removeWallPost: (postId: WallPostId) => void
  updateWallPost: (postId: WallPostId, updates: Partial<WallPostParams>) => void
  isWallPostPlacementValid: (
    wallId: WallId,
    centerOffsetFromWallStart: Length,
    width: Length,
    excludedPost?: WallPostId
  ) => boolean
  findNearestValidWallPostPosition: (
    wallId: WallId,
    preferredCenterOffset: Length,
    width: Length,
    excludedPost?: WallPostId
  ) => Length | null

  getWallEntityById: (entity: WallEntityId) => OpeningWithGeometry | WallPostWithGeometry
  getWallOpeningById: (openingId: OpeningId) => OpeningWithGeometry
  getWallOpeningsByWallId: (wallId: WallId) => OpeningWithGeometry[]
  getWallPostById: (postId: WallPostId) => WallPostWithGeometry
  getWallPostsByWallId: (wallId: WallId) => WallPostWithGeometry[]
  getAllWallPosts: () => WallPostWithGeometry[]
  getAllWallOpenings: () => OpeningWithGeometry[]
}

export type WallEntitiesSlice = WallEntitiesState & { actions: WallEntitiesActions }

export const createWallEntitiesSlice: StateCreator<
  WallEntitiesSlice & StoreState,
  [['zustand/immer', never]],
  [],
  WallEntitiesSlice
> = (set, get) => ({
  openings: {},
  _openingGeometry: {},
  wallPosts: {},
  _wallPostGeometry: {},

  actions: {
    addWallOpening: (wallId: WallId, openingParams: OpeningParams) => {
      if (!isOpeningParamsValid(openingParams)) {
        throw new InvalidOperationError('Invalid opening dimensions or offset')
      }

      if (!validateOpeningOnWall(get(), wallId, openingParams.centerOffsetFromWallStart, openingParams.width)) {
        throw new InvalidOperationError('Opening placement is not valid')
      }

      let result!: OpeningWithGeometry
      set(state => {
        const perimeterId = getWallPerimeterId(state, wallId)
        const geometrySource = getWallEntityGeometrySource(state, wallId)

        const newOpening: Opening = {
          id: createOpeningId(),
          type: 'opening',
          perimeterId,
          wallId,
          ...openingParams
        }

        addEntityIdToWall(state, wallId, newOpening.id)
        state.openings[newOpening.id] = newOpening

        const openingGeometry = updateEntityGeometry(geometrySource, newOpening)
        state._openingGeometry[newOpening.id] = openingGeometry

        updateTimestampDraft(state, newOpening.id)
        result = { ...newOpening, ...openingGeometry }
      })

      return result
    },

    removeWallOpening: (openingId: OpeningId) => {
      set(state => {
        if (!(openingId in state.openings)) return
        const opening = state.openings[openingId]

        removeEntityIdFromWall(state, opening.wallId, openingId)

        delete state.openings[openingId]
        delete state._openingGeometry[openingId]

        removeConstraintsForEntityDraft(state, openingId)
        removeTimestampDraft(state, openingId)
      })
    },

    updateWallOpening: (openingId: OpeningId, updates: Partial<OpeningParams>) => {
      set(state => {
        if (!(openingId in state.openings)) throw new NotFoundError('Wall opening', openingId)
        const opening = state.openings[openingId]
        const nextOpening = { ...opening, ...updates }
        if (!isOpeningParamsValid(nextOpening)) return
        if (
          validateOpeningOnWall(
            state,
            opening.wallId,
            nextOpening.centerOffsetFromWallStart,
            nextOpening.width,
            openingId
          )
        ) {
          Object.assign(opening, updates)

          const geometrySource = getWallEntityGeometrySource(state, opening.wallId)
          const openingGeometry = updateEntityGeometry(geometrySource, opening)
          state._openingGeometry[opening.id] = openingGeometry

          updateTimestampDraft(state, openingId)
        }
      })
    },

    isWallOpeningPlacementValid: (
      wallId: WallId,
      centerOffsetFromWallStart: Length,
      width: Length,
      excludedOpening?: OpeningId
    ) => {
      if (width <= 0) {
        throw new Error(`Opening width must be greater than 0, got ${width}`)
      }

      return validateOpeningOnWall(get(), wallId, centerOffsetFromWallStart, width, excludedOpening)
    },

    findNearestValidWallOpeningPosition: (
      wallId: WallId,
      preferredCenterOffset: Length,
      width: Length,
      excludedOpening?: OpeningId
    ): Length | null =>
      findNearestValidWallEntityPosition(get(), wallId, preferredCenterOffset, width, 0, 0, excludedOpening),

    addWallPost: (wallId: WallId, postParams: WallPostParams) => {
      if (postParams.width <= 0) {
        throw new InvalidOperationError('Post width must be greater than 0')
      }
      if (postParams.thickness <= 0) {
        throw new InvalidOperationError('Post thickness must be greater than 0')
      }

      if (!validatePostOnWall(get(), wallId, postParams.centerOffsetFromWallStart, postParams.width)) {
        throw new InvalidOperationError('Post placement is not valid')
      }

      let result!: WallPostWithGeometry
      set(state => {
        const perimeterId = getWallPerimeterId(state, wallId)

        const newPost: WallPost = {
          id: createWallPostId(),
          perimeterId,
          wallId,
          type: 'post',
          ...postParams
        }

        addEntityIdToWall(state, wallId, newPost.id)
        state.wallPosts[newPost.id] = newPost

        const geometrySource = getWallEntityGeometrySource(state, wallId)
        const geometry = updateEntityGeometry(geometrySource, newPost)
        state._wallPostGeometry[newPost.id] = geometry

        updateTimestampDraft(state, newPost.id)
        result = { ...newPost, ...geometry }
      })

      return result
    },

    removeWallPost: (postId: WallPostId) => {
      set(state => {
        if (!(postId in state.wallPosts)) return
        const post = state.wallPosts[postId]

        removeEntityIdFromWall(state, post.wallId, postId)

        delete state.wallPosts[postId]
        delete state._wallPostGeometry[postId]

        removeConstraintsForEntityDraft(state, postId)
        removeTimestampDraft(state, postId)
      })
    },

    updateWallPost: (postId: WallPostId, updates: Partial<WallPostParams>) => {
      set(state => {
        if (!(postId in state.wallPosts)) throw new NotFoundError('Wall post', postId)
        const post = state.wallPosts[postId]
        if (
          validatePostOnWall(
            state,
            post.wallId,
            updates.centerOffsetFromWallStart ?? post.centerOffsetFromWallStart,
            updates.width ?? post.width,
            postId
          )
        ) {
          Object.assign(post, updates)

          const geometrySource = getWallEntityGeometrySource(state, post.wallId)
          const geometry = updateEntityGeometry(geometrySource, post)
          state._wallPostGeometry[post.id] = geometry

          updateTimestampDraft(state, postId)
        }
      })
    },

    getWallPostById: (postId: WallPostId) => {
      const state = get()
      if (!(postId in state.wallPosts)) throw new NotFoundError('Wall post', postId)
      const post = state.wallPosts[postId]
      const geometry = state._wallPostGeometry[postId]
      return { ...post, ...geometry }
    },

    isWallPostPlacementValid: (
      wallId: WallId,
      centerOffsetFromWallStart: Length,
      width: Length,
      excludedPost?: WallPostId
    ) => {
      if (width <= 0) {
        throw new Error(`Post width must be greater than 0, got ${width}`)
      }

      return validatePostOnWall(get(), wallId, centerOffsetFromWallStart, width, excludedPost)
    },

    findNearestValidWallPostPosition: (
      wallId: WallId,
      preferredCenterOffset: Length,
      width: Length,
      excludedPost?: WallPostId
    ): Length | null => {
      const state = get()
      const bounds = getWallPostPlacementBounds(state, wallId)
      return findNearestValidWallEntityPosition(
        state,
        wallId,
        preferredCenterOffset,
        width,
        bounds.minOffset,
        bounds.maxOffset,
        excludedPost
      )
    },

    getWallEntityById: (entityId: WallEntityId) => {
      const state = get()
      if (isOpeningId(entityId)) {
        return state.actions.getWallOpeningById(entityId)
      }
      return state.actions.getWallPostById(entityId)
    },

    getWallOpeningById: (openingId: OpeningId) => {
      const state = get()
      if (!(openingId in state.openings)) throw new NotFoundError('Wall opening', openingId)
      const opening = state.openings[openingId]
      const geometry = state._openingGeometry[openingId]
      return { ...opening, ...geometry }
    },

    getWallOpeningsByWallId: (wallId: WallId) => {
      const state = get()
      const entityIds = getWallEntityIds(state, wallId)
      return entityIds.filter(isOpeningId).map(openingId => {
        if (!(openingId in state.openings)) throw new NotFoundError('Wall opening', openingId)
        const opening = state.openings[openingId]
        const geometry = state._openingGeometry[openingId]
        return { ...opening, ...geometry }
      })
    },

    getWallPostsByWallId: (wallId: WallId) => {
      const state = get()
      const entityIds = getWallEntityIds(state, wallId)
      return entityIds.filter(isWallPostId).map(postId => {
        if (!(postId in state.wallPosts)) throw new NotFoundError('Wall post', postId)
        const post = state.wallPosts[postId]
        const geometry = state._wallPostGeometry[postId]
        return { ...post, ...geometry }
      })
    },

    getAllWallPosts: () => {
      const state = get()
      return Object.values(state.wallPosts).map(p => ({ ...p, ...state._wallPostGeometry[p.id] }))
    },

    getAllWallOpenings: () => {
      const state = get()
      return Object.values(state.openings).map(p => ({ ...p, ...state._openingGeometry[p.id] }))
    }
  }
})

function getWallEntityIds(state: StoreState, wallId: WallId): WallEntityId[] {
  if (isPerimeterWallId(wallId)) {
    return state.perimeterWalls[wallId].entityIds
  }
  return state.intermediateWalls[wallId].entityIds
}

function addEntityIdToWall(state: StoreState, wallId: WallId, entityId: WallEntityId): void {
  if (isPerimeterWallId(wallId)) {
    state.perimeterWalls[wallId].entityIds.push(entityId)
  } else {
    state.intermediateWalls[wallId].entityIds.push(entityId)
  }
}

function removeEntityIdFromWall(state: StoreState, wallId: WallId, entityId: WallEntityId): void {
  if (isPerimeterWallId(wallId)) {
    state.perimeterWalls[wallId].entityIds = state.perimeterWalls[wallId].entityIds.filter(id => id !== entityId)
  } else {
    state.intermediateWalls[wallId].entityIds = state.intermediateWalls[wallId].entityIds.filter(id => id !== entityId)
  }
}

function getWallPerimeterId(state: StoreState, wallId: WallId) {
  if (isPerimeterWallId(wallId)) {
    return state.perimeterWalls[wallId].perimeterId
  }
  return state.intermediateWalls[wallId].perimeterId
}

function getWallLength(state: StoreState, wallId: WallId): Length {
  if (isPerimeterWallId(wallId)) {
    return state._perimeterWallGeometry[wallId].wallLength
  }
  return state._intermediateWallGeometry[wallId].wallLength
}

export function getWallEntityGeometrySource(state: StoreState, wallId: WallId): WallEntityGeometrySource {
  if (isPerimeterWallId(wallId)) {
    const geom = state._perimeterWallGeometry[wallId]
    return { insideLine: geom.insideLine, outsideLine: geom.outsideLine, direction: geom.direction }
  }
  const geom = state._intermediateWallGeometry[wallId]
  const halfThickness = state.intermediateWalls[wallId].thickness / 2
  const perpDir = perpendicularCCW(geom.direction)
  return {
    insideLine: {
      start: scaleAddVec2(geom.entityReferenceLine.start, perpDir, -halfThickness),
      end: scaleAddVec2(geom.entityReferenceLine.end, perpDir, -halfThickness)
    },
    outsideLine: {
      start: scaleAddVec2(geom.entityReferenceLine.start, perpDir, halfThickness),
      end: scaleAddVec2(geom.entityReferenceLine.end, perpDir, halfThickness)
    },
    direction: geom.direction
  }
}

const validateWallItemPlacement = (
  state: StoreState & TimestampsState,
  wallId: WallId,
  centerOffsetFromWallStart: Length,
  width: Length,
  startOffset: Length,
  endOffset: Length,
  excludedEntityId?: WallEntityId
): boolean => {
  if (width <= 0) {
    return false
  }

  const wallLength = getWallLength(state, wallId)

  const minBounds = startOffset + width / 2
  const maxBounds = wallLength + endOffset - width / 2

  if (centerOffsetFromWallStart < minBounds || centerOffsetFromWallStart > maxBounds) {
    return false
  }

  const entityIds = getWallEntityIds(state, wallId)

  for (const entityId of entityIds) {
    if (entityId === excludedEntityId) continue

    const entity = isOpeningId(entityId) ? state.openings[entityId] : state.wallPosts[entityId]

    const centerDistance = Math.abs(centerOffsetFromWallStart - entity.centerOffsetFromWallStart)
    const minDistance = (width + entity.width) / 2

    if (centerDistance < minDistance) {
      return false
    }
  }

  return true
}

const validateOpeningOnWall = (
  state: StoreState & TimestampsState,
  wallId: WallId,
  centerOffsetFromWallStart: Length,
  width: Length,
  excludedOpening?: OpeningId
): boolean => validateWallItemPlacement(state, wallId, centerOffsetFromWallStart, width, 0, 0, excludedOpening)

const isOpeningParamsValid = (opening: OpeningParams): boolean =>
  Number.isFinite(opening.centerOffsetFromWallStart) &&
  opening.centerOffsetFromWallStart >= 0 &&
  Number.isFinite(opening.width) &&
  opening.width > 0 &&
  Number.isFinite(opening.height) &&
  opening.height > 0 &&
  (opening.sillHeight == null || (Number.isFinite(opening.sillHeight) && opening.sillHeight >= 0))

const validatePostOnWall = (
  state: StoreState & TimestampsState,
  wallId: WallId,
  centerOffsetFromWallStart: Length,
  width: Length,
  excludedPost?: WallPostId
): boolean => {
  const bounds = getWallPostPlacementBounds(state, wallId)
  return validateWallItemPlacement(
    state,
    wallId,
    centerOffsetFromWallStart,
    width,
    bounds.minOffset,
    bounds.maxOffset,
    excludedPost
  )
}

function findNearestValidWallEntityPosition(
  state: StoreState & TimestampsState,
  wallId: WallId,
  preferredCenterOffset: Length,
  width: Length,
  startOffset: Length,
  endOffset: Length,
  excludeEntityId?: WallEntityId
): Length | null {
  const wallLength = getWallLength(state, wallId)

  if (width > wallLength) return null

  const halfWidth = width / 2

  let center = Math.max(preferredCenterOffset, startOffset + halfWidth)
  center = Math.min(center, wallLength + endOffset - halfWidth)

  const entityIds = getWallEntityIds(state, wallId)

  if (entityIds.length === 0) return center

  const sortedEntities = [...entityIds]
    .filter((id): id is WallEntityId => id !== excludeEntityId)
    .map(id => (isOpeningId(id) ? state.openings[id] : state.wallPosts[id]))
    .sort((a, b) => a.centerOffsetFromWallStart - b.centerOffsetFromWallStart)

  const afterIndex = sortedEntities.findIndex(o => o.centerOffsetFromWallStart >= center)

  const previous =
    afterIndex > 0
      ? sortedEntities[afterIndex - 1]
      : afterIndex === -1
        ? sortedEntities[sortedEntities.length - 1]
        : null
  const next = afterIndex !== -1 ? sortedEntities[afterIndex] : null

  const intersectsPrevious =
    previous != null && Math.abs(center - previous.centerOffsetFromWallStart) < (width + previous.width) / 2
  const intersectsNext = next != null && Math.abs(center - next.centerOffsetFromWallStart) < (width + next.width) / 2

  if (!intersectsPrevious && !intersectsNext) {
    return center
  }

  if (intersectsPrevious && intersectsNext) {
    return null
  }

  let bestCenter: Length | null = null
  let bestDistance = Infinity

  if (intersectsPrevious) {
    const shiftedCenter = previous.centerOffsetFromWallStart + (previous.width + width) / 2
    const shiftDistance = Math.abs(shiftedCenter - preferredCenterOffset)

    const shiftedRightEdge = shiftedCenter + halfWidth
    const validBounds = shiftedRightEdge <= wallLength + endOffset
    const noNextCollision =
      !next || Math.abs(shiftedCenter - next.centerOffsetFromWallStart) >= (width + next.width) / 2

    if (validBounds && noNextCollision) {
      bestCenter = shiftedCenter
      bestDistance = shiftDistance
    }
  }

  if (intersectsNext) {
    const shiftedCenter = next.centerOffsetFromWallStart - (next.width + width) / 2
    const shiftDistance = Math.abs(shiftedCenter - preferredCenterOffset)

    const shiftedLeftEdge = shiftedCenter - halfWidth
    const validBounds = shiftedLeftEdge >= startOffset
    const noPrevCollision =
      !previous || Math.abs(shiftedCenter - previous.centerOffsetFromWallStart) >= (width + previous.width) / 2

    if (validBounds && noPrevCollision && shiftDistance < bestDistance) {
      bestCenter = shiftedCenter
      bestDistance = shiftDistance
    }
  }

  return bestCenter
}

const getWallPostPlacementBounds = (
  state: StoreState & TimestampsState,
  wallId: WallId
): { minOffset: Length; maxOffset: Length } => {
  if (!isPerimeterWallId(wallId)) {
    return { minOffset: 0, maxOffset: 0 }
  }

  if (!(wallId in state.perimeterWalls)) {
    return { minOffset: 0, maxOffset: 0 }
  }
  const wall = state.perimeterWalls[wallId]
  const wallGeometry = state._perimeterWallGeometry[wallId]

  const startCorner = state.perimeterCorners[wall.startCornerId]
  const startCornerGeometry = state._perimeterCornerGeometry[wall.startCornerId]
  const endCorner = state.perimeterCorners[wall.endCornerId]
  const endCornerGeometry = state._perimeterCornerGeometry[wall.endCornerId]

  let startExtension = 0
  if (startCornerGeometry.exteriorAngle !== 180 && startCorner.constructedByWall === 'next') {
    const outerStartExtension = Math.round(distVec2(wallGeometry.outsideLine.start, startCornerGeometry.outsidePoint))
    const innerStartExtension = Math.round(distVec2(wallGeometry.insideLine.start, startCornerGeometry.insidePoint))
    startExtension = Math.max(outerStartExtension, innerStartExtension)
  }

  let endExtension = 0
  if (endCornerGeometry.exteriorAngle !== 180 && endCorner.constructedByWall === 'previous') {
    const outerEndExtension = Math.round(distVec2(wallGeometry.outsideLine.end, endCornerGeometry.outsidePoint))
    const innerEndExtension = Math.round(distVec2(wallGeometry.insideLine.end, endCornerGeometry.insidePoint))
    endExtension = Math.max(outerEndExtension, innerEndExtension)
  }

  return {
    minOffset: -startExtension,
    maxOffset: endExtension
  }
}

export function hasPostsInCornerArea(
  state: StoreState & TimestampsState,
  wallId: PerimeterWallId,
  cornerPosition: 'start' | 'end'
): boolean {
  const wall = state.perimeterWalls[wallId]
  const wallGeometry = state._perimeterWallGeometry[wallId]
  const sortedPosts = wall.entityIds
    .filter(isWallPostId)
    .map(id => state.wallPosts[id])
    .sort((a, b) => a.centerOffsetFromWallStart - b.centerOffsetFromWallStart)

  if (sortedPosts.length === 0) return false

  if (cornerPosition === 'start') {
    const firstPost = sortedPosts[0]
    const postStart = firstPost.centerOffsetFromWallStart - firstPost.width / 2
    return postStart < 0
  } else {
    const lastPost = sortedPosts[sortedPosts.length - 1]
    const postEnd = lastPost.centerOffsetFromWallStart + lastPost.width / 2
    return postEnd > wallGeometry.wallLength
  }
}
