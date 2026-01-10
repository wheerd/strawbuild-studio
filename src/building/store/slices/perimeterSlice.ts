import type { StateCreator } from 'zustand'

import type {
  Opening,
  OpeningGeometry,
  OpeningParams,
  OpeningWithGeometry,
  Perimeter,
  PerimeterCorner,
  PerimeterCornerGeometry,
  PerimeterCornerWithGeometry,
  PerimeterGeometry,
  PerimeterReferenceSide,
  PerimeterWall,
  PerimeterWallGeometry,
  PerimeterWallWithGeometry,
  PerimeterWithGeometry,
  WallPost,
  WallPostGeometry,
  WallPostParams,
  WallPostWithGeometry
} from '@/building/model'
import type {
  OpeningId,
  PerimeterCornerId,
  PerimeterId,
  PerimeterWallId,
  RingBeamAssemblyId,
  StoreyId,
  WallAssemblyId,
  WallEntityId,
  WallPostId
} from '@/building/model/ids'
import {
  createOpeningId,
  createPerimeterCornerId,
  createPerimeterId,
  createPerimeterWallId,
  createWallPostId,
  isOpeningId,
  isWallPostId
} from '@/building/model/ids'
import { InvalidOperationError, NotFoundError } from '@/building/store/errors'
import { type Length, type Polygon2D, type Vec2, addVec2, copyVec2, distVec2, scaleAddVec2 } from '@/shared/geometry'
import { ensurePolygonIsClockwise, wouldClosingPolygonSelfIntersect } from '@/shared/geometry/polygon'

import { updateEntityGeometry, updatePerimeterGeometry } from './perimeterGeometry'

export interface PerimetersState {
  perimeters: Record<PerimeterId, Perimeter>
  _perimeterGeometry: Record<PerimeterId, PerimeterGeometry>

  perimeterWalls: Record<PerimeterWallId, PerimeterWall>
  _perimeterWallGeometry: Record<PerimeterWallId, PerimeterWallGeometry>

  perimeterCorners: Record<PerimeterCornerId, PerimeterCorner>
  _perimeterCornerGeometry: Record<PerimeterCornerId, PerimeterCornerGeometry>

  openings: Record<OpeningId, Opening>
  _openingGeometry: Record<OpeningId, OpeningGeometry>

  wallPosts: Record<WallPostId, WallPost>
  _wallPostGeometry: Record<WallPostId, WallPostGeometry>
}

export interface PerimetersActions {
  addPerimeter: (
    storeyId: StoreyId,
    boundary: Polygon2D,
    wallAssemblyId: WallAssemblyId,
    thickness: Length,
    baseRingBeamAssemblyId?: RingBeamAssemblyId,
    topRingBeamAssemblyId?: RingBeamAssemblyId,
    referenceSide?: PerimeterReferenceSide
  ) => PerimeterWithGeometry
  removePerimeter: (perimeterId: PerimeterId) => void

  setPerimeterReferenceSide: (perimeterId: PerimeterId, referenceSide: PerimeterReferenceSide) => void

  // Entity deletion operations
  removePerimeterCorner: (cornerId: PerimeterCornerId) => boolean
  canRemovePerimeterCorner: (cornerId: PerimeterCornerId) => {
    canRemove: boolean
    reason?: 'cannotDeleteMinCorners' | 'cannotDeleteSelfIntersect'
  }
  removePerimeterWall: (wallId: PerimeterWallId) => boolean
  canRemovePerimeterWall: (wallId: PerimeterWallId) => {
    canRemove: boolean
    reason?: 'cannotDeleteMinWalls' | 'cannotDeleteSelfIntersect'
  }

  // Wall splitting operation
  splitPerimeterWall: (wallId: PerimeterWallId, splitPosition: Length) => PerimeterWallId | null

  // Updated to use IDs instead of indices
  updatePerimeterWallAssembly: (wallId: PerimeterWallId, assemblyId: WallAssemblyId) => void
  updatePerimeterWallThickness: (wallId: PerimeterWallId, thickness: Length) => void

  // Bulk update actions for all walls in a perimeter
  updateAllPerimeterWallsAssembly: (perimeterId: PerimeterId, assemblyId: WallAssemblyId) => void
  updateAllPerimeterWallsThickness: (perimeterId: PerimeterId, thickness: Length) => void

  updatePerimeterCornerConstructedByWall: (cornerId: PerimeterCornerId, constructedByWall: 'previous' | 'next') => void
  canSwitchCornerConstructedByWall: (cornerId: PerimeterCornerId) => boolean

  // Openings
  addWallOpening: (wallId: PerimeterWallId, openingParams: OpeningParams) => OpeningWithGeometry
  removeWallOpening: (openingId: OpeningId) => void
  updateWallOpening: (openingId: OpeningId, updates: Partial<OpeningParams>) => void
  isWallOpeningPlacementValid: (
    wallId: PerimeterWallId,
    centerOffsetFromWallStart: Length,
    width: Length,
    excludedOpening?: OpeningId
  ) => boolean
  findNearestValidWallOpeningPosition: (
    wallId: PerimeterWallId,
    preferredCenterOffset: Length,
    width: Length,
    excludedOpening?: OpeningId
  ) => Length | null

  // Wall Posts
  addWallPost: (wallId: PerimeterWallId, postParams: WallPostParams) => WallPostWithGeometry
  removeWallPost: (postId: WallPostId) => void
  updateWallPost: (postId: WallPostId, updates: Partial<WallPostParams>) => void
  isWallPostPlacementValid: (
    wallId: PerimeterWallId,
    centerOffsetFromWallStart: Length,
    width: Length,
    excludedPost?: WallPostId
  ) => boolean
  findNearestValidWallPostPosition: (
    wallId: PerimeterWallId,
    preferredCenterOffset: Length,
    width: Length,
    excludedPost?: WallPostId
  ) => Length | null

  // Getters
  getPerimeterById: (perimeterId: PerimeterId) => PerimeterWithGeometry
  getPerimeterWallsById: (perimeterId: PerimeterId) => PerimeterWallWithGeometry[]
  getPerimeterWallById: (wallId: PerimeterWallId) => PerimeterWallWithGeometry
  getPerimeterCornerById: (cornerId: PerimeterCornerId) => PerimeterCornerWithGeometry
  getPerimeterCornersById: (perimeterId: PerimeterId) => PerimeterCornerWithGeometry[]
  getWallEntityById: (entity: WallEntityId) => OpeningWithGeometry | WallPostWithGeometry
  getWallOpeningById: (openingId: OpeningId) => OpeningWithGeometry
  getWallOpeningsById: (wallId: PerimeterWallId) => OpeningWithGeometry[]
  getWallPostById: (postId: WallPostId) => WallPostWithGeometry
  getWallPostsById: (wallId: PerimeterWallId) => WallPostWithGeometry[]
  getPerimetersByStorey: (storeyId: StoreyId) => PerimeterWithGeometry[]
  getAllPerimeters: () => PerimeterWithGeometry[]
  getAllWallPosts: () => WallPostWithGeometry[]
  getAllWallOpenings: () => OpeningWithGeometry[]
  getAllPerimeterWalls: () => PerimeterWallWithGeometry[]

  // Movement operations for MoveTool
  movePerimeter: (perimeterId: PerimeterId, offset: Vec2) => boolean
  updatePerimeterBoundary: (perimeterId: PerimeterId, newBoundary: Vec2[]) => boolean

  // Ring beam configuration - individual wall
  setWallBaseRingBeam: (wallId: PerimeterWallId, assemblyId: RingBeamAssemblyId) => void
  setWallTopRingBeam: (wallId: PerimeterWallId, assemblyId: RingBeamAssemblyId) => void
  removeWallBaseRingBeam: (wallId: PerimeterWallId) => void
  removeWallTopRingBeam: (wallId: PerimeterWallId) => void

  // Ring beam configuration - bulk operations for all walls
  setAllWallsBaseRingBeam: (perimeterId: PerimeterId, assemblyId: RingBeamAssemblyId) => void
  setAllWallsTopRingBeam: (perimeterId: PerimeterId, assemblyId: RingBeamAssemblyId) => void
  removeAllWallsBaseRingBeam: (perimeterId: PerimeterId) => void
  removeAllWallsTopRingBeam: (perimeterId: PerimeterId) => void
}

export type PerimetersSlice = PerimetersState & { actions: PerimetersActions }

export const createPerimetersSlice: StateCreator<PerimetersSlice, [['zustand/immer', never]], [], PerimetersSlice> = (
  set,
  get
) => ({
  perimeters: {},
  _perimeterGeometry: {},
  perimeterCorners: {},
  _perimeterCornerGeometry: {},
  perimeterWalls: {},
  _perimeterWallGeometry: {},
  openings: {},
  _openingGeometry: {},
  wallPosts: {},
  _wallPostGeometry: {},

  actions: {
    // CRUD operations
    addPerimeter: (
      storeyId: StoreyId,
      boundary: Polygon2D,
      wallAssemblyId: WallAssemblyId,
      thickness: Length,
      baseRingBeamAssemblyId?: RingBeamAssemblyId,
      topRingBeamAssemblyId?: RingBeamAssemblyId,
      referenceSide: PerimeterReferenceSide = 'inside'
    ) => {
      if (boundary.points.length < 3) {
        throw new Error('Perimeter boundary must have at least 3 points')
      }

      if (wouldClosingPolygonSelfIntersect(boundary)) {
        throw new Error('Perimeter boundary must not self-intersect')
      }

      boundary = ensurePolygonIsClockwise(boundary)

      const wallThickness = thickness

      if (wallThickness <= 0) {
        throw new Error('Wall thickness must be greater than 0')
      }

      let result!: PerimeterWithGeometry
      set(state => {
        const perimeterId = createPerimeterId()
        const cornerIds = boundary.points.map(createPerimeterCornerId)
        const wallIds = boundary.points.map(createPerimeterWallId)
        const n = boundary.points.length

        const corners: PerimeterCorner[] = boundary.points.map((point, i) => ({
          id: cornerIds[i],
          perimeterId,
          previousWallId: wallIds[(i + n - 1) % n],
          nextWallId: wallIds[i],
          referencePoint: point,
          constructedByWall: 'next'
        }))

        const walls: PerimeterWall[] = boundary.points.map((_, i) => ({
          id: wallIds[i],
          perimeterId,
          startCornerId: cornerIds[i],
          endCornerId: cornerIds[(i + 1) % n],
          thickness: wallThickness,
          wallAssemblyId,
          entityIds: []
        }))

        const perimeter = {
          id: perimeterId,
          storeyId,
          referenceSide,
          wallIds,
          cornerIds,
          intermediateWallIds: [],
          wallNodeIds: [],
          roomIds: []
        }

        // Apply ring beam defaults to all walls
        walls.forEach(wall => {
          if (baseRingBeamAssemblyId) {
            wall.baseRingBeamAssemblyId = baseRingBeamAssemblyId
          }
          if (topRingBeamAssemblyId) {
            wall.topRingBeamAssemblyId = topRingBeamAssemblyId
          }
          state.perimeterWalls[wall.id] = wall
        })

        corners.forEach(corner => {
          state.perimeterCorners[corner.id] = corner
        })

        state.perimeters[perimeter.id] = perimeter

        // Calculate all geometry using the mutable helper
        updatePerimeterGeometry(state, perimeterId)

        result = { ...perimeter, ...state._perimeterGeometry[perimeterId] }
      })

      if (!result) {
        throw new Error('Failed to create perimeter')
      }
      return result
    },

    removePerimeter: (perimeterId: PerimeterId) => {
      set(state => {
        delete state.perimeters[perimeterId]
        delete state._perimeterGeometry[perimeterId]
        cleanUpOrphaned(state)
      })
    },

    // Corner deletion: removes the corner and its corresponding boundary point,
    // merging the two adjacent walls into one
    removePerimeterCorner: (cornerId: PerimeterCornerId): boolean => {
      let success = false
      set(state => {
        const corner = state.perimeterCorners[cornerId]
        if (!corner) return

        const perimeter = state.perimeters[corner.perimeterId]
        if (!perimeter) throw new NotFoundError('Perimeter', corner.perimeterId)

        const newCorners = perimeter.cornerIds.filter(id => id !== cornerId)
        const newBoundaryPoints = newCorners.map(c => state.perimeterCorners[c].referencePoint)

        if (wouldClosingPolygonSelfIntersect({ points: newBoundaryPoints })) return

        // Use helper to do all the work
        removeCornerAndMergeWalls(state, perimeter, corner)
        success = true
      })
      return success
    },

    canRemovePerimeterCorner: (
      cornerId: PerimeterCornerId
    ): { canRemove: boolean; reason?: 'cannotDeleteMinCorners' | 'cannotDeleteSelfIntersect' } => {
      const state = get()
      const corner = state.perimeterCorners[cornerId]
      if (!corner) throw new NotFoundError('Perimeter corner', cornerId)

      const perimeter = state.perimeters[corner.perimeterId]
      if (!perimeter) throw new NotFoundError('Perimeter', corner.perimeterId)

      // Need at least 4 corners (triangle = 3 corners minimum)
      if (perimeter.cornerIds.length < 4) {
        return { canRemove: false, reason: 'cannotDeleteMinCorners' }
      }

      // Check if removal would cause self-intersection
      const newCorners = perimeter.cornerIds.filter(id => id !== cornerId)
      const newBoundaryPoints = newCorners.map(id => state.perimeterCorners[id].referencePoint)

      if (wouldClosingPolygonSelfIntersect({ points: newBoundaryPoints })) {
        return { canRemove: false, reason: 'cannotDeleteSelfIntersect' }
      }

      return { canRemove: true }
    },

    // Wall deletion: removes the target wall and merges the two adjacent walls into one,
    // also removing the two corner points that connected these three walls
    removePerimeterWall: (wallId: PerimeterWallId): boolean => {
      let success = false
      set(state => {
        const wall = state.perimeterWalls[wallId]
        if (!wall) return

        if (!state.actions.canRemovePerimeterWall(wallId).canRemove) {
          throw new InvalidOperationError('Cannot delete wall')
        }

        // Use helper to do all the work
        removeWallAndMergeAdjacent(state, wall)
        success = true
      })
      return success
    },

    canRemovePerimeterWall: (
      wallId: PerimeterWallId
    ): { canRemove: boolean; reason?: 'cannotDeleteMinWalls' | 'cannotDeleteSelfIntersect' } => {
      const state = get()
      const wall = state.perimeterWalls[wallId]
      if (!wall) throw new NotFoundError('Perimeter wall', wallId)

      const perimeter = state.perimeters[wall.perimeterId]
      if (!perimeter) throw new NotFoundError('Perimeter', wall.perimeterId)

      // Need at least 5 walls (triangle = 3 walls, removing 1 and merging = min 3 walls remaining, needs 5 to start)
      if (perimeter.wallIds.length < 5) {
        return { canRemove: false, reason: 'cannotDeleteMinWalls' }
      }

      // Check if removal would cause self-intersection
      const newBoundary = perimeter.cornerIds
        .filter(id => id !== wall.startCornerId && id !== wall.endCornerId)
        .map(id => state._perimeterCornerGeometry[id].insidePoint)

      if (wouldClosingPolygonSelfIntersect({ points: newBoundary })) {
        return { canRemove: false, reason: 'cannotDeleteSelfIntersect' }
      }

      return { canRemove: true }
    },

    // Wall splitting operation
    splitPerimeterWall: (wallId: PerimeterWallId, splitPosition: Length): PerimeterWallId | null => {
      let newWallId!: PerimeterWallId
      set(state => {
        const wall = state.perimeterWalls[wallId]
        const wallGeometry = state._perimeterWallGeometry[wallId]
        if (!wall || !wallGeometry) throw new NotFoundError('Perimeter wall', wallId)

        const perimeter = state.perimeters[wall.perimeterId]
        if (!perimeter) return

        const wallIndex = perimeter.wallIds.indexOf(wallId)

        // Validate split position
        if (splitPosition <= 0 || splitPosition >= wallGeometry.wallLength) return

        newWallId = createPerimeterWallId()
        const newCornerId = createPerimeterCornerId()

        // Check opening intersections
        const firstWallEntities = []
        const secondWallEntities = []
        for (const entityId of wall.entityIds) {
          const entity = isOpeningId(entityId) ? state.openings[entityId] : state.wallPosts[entityId]
          const openingStart = entity.centerOffsetFromWallStart - entity.width / 2
          const openingEnd = entity.centerOffsetFromWallStart + entity.width / 2
          if (splitPosition > openingStart && splitPosition < openingEnd) return
          if (entity.centerOffsetFromWallStart < splitPosition) {
            firstWallEntities.push(entity)
          } else {
            secondWallEntities.push({
              ...entity,
              wallId: newWallId,
              centerOffsetFromWallStart: entity.centerOffsetFromWallStart - splitPosition
            })
          }
        }

        // Calculate split points in world coordinates based on the reference side
        const referenceLine = perimeter.referenceSide === 'inside' ? wallGeometry.insideLine : wallGeometry.outsideLine
        const referenceSplitPoint = scaleAddVec2(referenceLine.start, wallGeometry.direction, splitPosition)

        // Create new corner at split position
        const newCorner: PerimeterCorner = {
          id: newCornerId,
          perimeterId: wall.perimeterId,
          previousWallId: wallId,
          nextWallId: newWallId,
          constructedByWall: 'next',
          referencePoint: referenceSplitPoint
        }

        const newWall: PerimeterWall = {
          id: newWallId,
          perimeterId: wall.perimeterId,
          startCornerId: newCornerId,
          endCornerId: wall.endCornerId,
          thickness: wall.thickness,
          wallAssemblyId: wall.wallAssemblyId,
          baseRingBeamAssemblyId: wall.baseRingBeamAssemblyId,
          topRingBeamAssemblyId: wall.topRingBeamAssemblyId,
          entityIds: secondWallEntities.map(e => e.id)
        }

        // Insert new corner at the correct position
        const cornerIndex = wallIndex + 1
        perimeter.cornerIds.splice(cornerIndex, 0, newCornerId)

        // Replace original wall with two new walls
        perimeter.wallIds.splice(wallIndex, 1, wallId, newWallId)

        state.perimeterCorners[newCornerId] = newCorner
        state.perimeterWalls[newWallId] = newWall

        // Update adjacent corner references
        const endCorner = state.perimeterCorners[wall.endCornerId]
        endCorner.previousWallId = newWallId

        wall.endCornerId = newCornerId
        wall.entityIds = firstWallEntities.map(e => e.id)

        for (const entity of secondWallEntities) {
          if (entity.type === 'opening') {
            state.openings[entity.id] = entity
          } else {
            state.wallPosts[entity.id] = entity
          }
        }

        // Recalculate geometry
        cleanUpOrphaned(state)
        updatePerimeterGeometry(state, wall.perimeterId)
      })

      return newWallId ?? null
    },

    // Update operations
    updatePerimeterWallAssembly: (wallId: PerimeterWallId, assemblyId: WallAssemblyId) => {
      set(state => {
        const wall = state.perimeterWalls[wallId]
        if (!wall) throw new NotFoundError('Perimeter wall', wallId)

        wall.wallAssemblyId = assemblyId
      })
    },

    updatePerimeterWallThickness: (wallId: PerimeterWallId, thickness: Length) => {
      if (thickness <= 0) {
        throw new Error('Wall thickness must be greater than 0')
      }

      set(state => {
        const wall = state.perimeterWalls[wallId]
        if (!wall) throw new NotFoundError('Perimeter wall', wallId)

        wall.thickness = thickness
        updatePerimeterGeometry(state, wall.perimeterId)
      })
    },

    // Bulk update operations for all walls in a perimeter
    updateAllPerimeterWallsAssembly: (perimeterId: PerimeterId, assemblyId: WallAssemblyId) => {
      set(state => {
        const perimeter = state.perimeters[perimeterId]
        if (!perimeter) throw new NotFoundError('Perimeter', perimeterId)

        perimeter.wallIds.forEach(wallId => {
          const wall = state.perimeterWalls[wallId]
          if (wall) {
            wall.wallAssemblyId = assemblyId
          }
        })
      })
    },

    updateAllPerimeterWallsThickness: (perimeterId: PerimeterId, thickness: Length) => {
      if (thickness <= 0) {
        throw new Error('Wall thickness must be greater than 0')
      }

      set(state => {
        const perimeter = state.perimeters[perimeterId]
        if (!perimeter) throw new NotFoundError('Perimeter', perimeterId)

        perimeter.wallIds.forEach(wallId => {
          const wall = state.perimeterWalls[wallId]
          if (wall) {
            wall.thickness = thickness
          }
        })

        // Update geometry since wall thickness affects perimeter shape
        updatePerimeterGeometry(state, perimeterId)
      })
    },

    canSwitchCornerConstructedByWall: (cornerId: PerimeterCornerId): boolean => {
      const state = get()
      const corner = state.perimeterCorners[cornerId]
      if (!corner) throw new NotFoundError('Perimeter corner', cornerId)

      // Determine which wall is currently constructing this corner
      const constructingWallId = corner.constructedByWall === 'previous' ? corner.previousWallId : corner.nextWallId

      // Determine which corner position (start or end) this is for the constructing wall
      const cornerPosition = corner.constructedByWall === 'previous' ? 'end' : 'start'

      // Check if this wall has posts in the corner area
      return !hasPostsInCornerArea(state, constructingWallId, cornerPosition)
    },

    updatePerimeterCornerConstructedByWall: (cornerId: PerimeterCornerId, constructedByWall: 'previous' | 'next') => {
      set(state => {
        const corner = state.perimeterCorners[cornerId]
        if (!corner) throw new NotFoundError('Perimeter corner', cornerId)

        // Determine which wall is currently constructing this corner
        const constructingWallId = corner.constructedByWall === 'previous' ? corner.previousWallId : corner.nextWallId

        // Determine which corner position (start or end) this is for the constructing wall
        const cornerPosition = corner.constructedByWall === 'previous' ? 'end' : 'start'

        // Check if this wall has posts in the corner area - if so, prevent switching
        if (hasPostsInCornerArea(state, constructingWallId, cornerPosition)) {
          console.warn('Cannot switch corner: wall has posts in corner area')
          return
        }

        corner.constructedByWall = constructedByWall
      })
    },

    // Opening operations
    addWallOpening: (wallId: PerimeterWallId, openingParams: OpeningParams) => {
      if (openingParams.width <= 0) {
        throw new InvalidOperationError('Opening width must be greater than 0')
      }
      if (openingParams.height <= 0) {
        throw new InvalidOperationError('Opening height must be greater than 0')
      }
      if (openingParams.sillHeight != null && openingParams.sillHeight < 0) {
        throw new InvalidOperationError('Window sill height must be non-negative')
      }

      // Basic validation checks
      if (openingParams.centerOffsetFromWallStart < 0) {
        throw new InvalidOperationError('Opening center offset from start must be non-negative')
      }

      const state = get()
      const wall = state.perimeterWalls[wallId]
      if (!wall) {
        throw new NotFoundError('Perimeter wall', wallId)
      }

      if (!validateOpeningOnWall(state, wallId, openingParams.centerOffsetFromWallStart, openingParams.width)) {
        throw new InvalidOperationError('Opening placement is not valid')
      }

      let result!: OpeningWithGeometry
      set(state => {
        const wall = state.perimeterWalls[wallId]

        // Auto-generate ID for the new opening
        const newOpening: Opening = {
          id: createOpeningId(),
          type: 'opening',
          perimeterId: wall.perimeterId,
          wallId,
          ...openingParams
        }

        wall.entityIds.push(newOpening.id)
        state.openings[newOpening.id] = newOpening

        const wallGeometry = state._perimeterWallGeometry[wallId]
        const openingGeometry = updateEntityGeometry(wallGeometry, newOpening)
        state._openingGeometry[newOpening.id] = openingGeometry

        result = { ...newOpening, ...openingGeometry }
      })

      return result
    },

    removeWallOpening: (openingId: OpeningId) => {
      set(state => {
        const opening = state.openings[openingId]
        if (!opening) return

        const wall = state.perimeterWalls[opening.wallId]
        if (wall) {
          wall.entityIds = wall.entityIds.filter(id => id !== openingId)
        }

        delete state.openings[openingId]
        delete state._openingGeometry[openingId]
      })
    },

    // Getters
    getPerimeterById: (perimeterId: PerimeterId) => {
      const state = get()
      const perimeter = state.perimeters[perimeterId]
      const geometry = state._perimeterGeometry[perimeterId]
      if (!perimeter || !geometry) {
        throw new NotFoundError('Perimeter', perimeterId)
      }
      return { ...perimeter, ...geometry }
    },

    getPerimeterWallById: (wallId: PerimeterWallId) => {
      const state = get()
      const wall = state.perimeterWalls[wallId]
      const geometry = state._perimeterWallGeometry[wallId]
      if (!wall || !geometry) {
        throw new NotFoundError('Perimeter wall', wallId)
      }
      return { ...wall, ...geometry }
    },

    getPerimeterCornerById: (cornerId: PerimeterCornerId) => {
      const state = get()
      const corner = state.perimeterCorners[cornerId]
      const geometry = state._perimeterCornerGeometry[cornerId]
      if (!corner || !geometry) {
        throw new NotFoundError('Perimeter corner', cornerId)
      }
      return { ...corner, ...geometry }
    },

    getWallOpeningById: (openingId: OpeningId) => {
      const state = get()
      const opening = state.openings[openingId]
      const geometry = state._openingGeometry[openingId]
      if (!opening || !geometry) {
        throw new NotFoundError('Wall opening', openingId)
      }
      return { ...opening, ...geometry }
    },

    getWallEntityById: (entityId: WallEntityId) => {
      const state = get()
      if (isOpeningId(entityId)) {
        return state.actions.getWallOpeningById(entityId)
      }
      return state.actions.getWallPostById(entityId)
    },

    updateWallOpening: (openingId: OpeningId, updates: Partial<OpeningParams>) => {
      set(state => {
        const opening = state.openings[openingId]
        if (!opening) throw new NotFoundError('Wall opening', openingId)
        if (
          validateOpeningOnWall(
            state,
            opening.wallId,
            updates.centerOffsetFromWallStart ?? opening.centerOffsetFromWallStart,
            updates.width ?? opening.width,
            openingId
          )
        ) {
          Object.assign(opening, updates)

          const wallGeometry = state._perimeterWallGeometry[opening.wallId]
          const openingGeometry = updateEntityGeometry(wallGeometry, opening)
          state._openingGeometry[opening.id] = openingGeometry
        }
      })
    },

    getPerimetersByStorey: (storeyId: StoreyId) => {
      const state = get()
      return Object.values(state.perimeters)
        .filter(p => p.storeyId === storeyId)
        .map(p => ({ ...p, ...state._perimeterGeometry[p.id] }))
    },

    getAllPerimeters: () => {
      const state = get()
      return Object.values(state.perimeters).map(p => ({ ...p, ...state._perimeterGeometry[p.id] }))
    },

    getAllWallPosts: () => {
      const state = get()
      return Object.values(state.wallPosts).map(p => ({ ...p, ...state._wallPostGeometry[p.id] }))
    },

    getAllWallOpenings: () => {
      const state = get()
      return Object.values(state.openings).map(p => ({ ...p, ...state._openingGeometry[p.id] }))
    },

    getAllPerimeterWalls: () => {
      const state = get()
      return Object.values(state.perimeterWalls).map(p => ({ ...p, ...state._perimeterWallGeometry[p.id] }))
    },

    getPerimeterWallsById: (perimeterId: PerimeterId) => {
      const state = get()
      const perimeter = state.perimeters[perimeterId]
      const walls = perimeter.wallIds.map(wallId => {
        const wall = state.perimeterWalls[wallId]
        const geometry = state._perimeterWallGeometry[wallId]
        if (!wall || !geometry) {
          throw new NotFoundError('Perimeter wall', wallId)
        }
        return { ...wall, ...geometry }
      })
      return walls
    },

    getPerimeterCornersById: (perimeterId: PerimeterId) => {
      const state = get()
      const perimeter = state.perimeters[perimeterId]
      const corners = perimeter.cornerIds.map(cornerId => {
        const corner = state.perimeterCorners[cornerId]
        const geometry = state._perimeterCornerGeometry[cornerId]
        if (!corner || !geometry) {
          throw new NotFoundError('Perimeter corner', cornerId)
        }
        return { ...corner, ...geometry }
      })
      return corners
    },

    getWallOpeningsById: (wallId: PerimeterWallId) => {
      const state = get()
      const wall = state.perimeterWalls[wallId]
      const openings = wall.entityIds.filter(isOpeningId).map(openingId => {
        const opening = state.openings[openingId]
        const geometry = state._openingGeometry[openingId]
        if (!opening || !geometry) {
          throw new NotFoundError('Wall opening', openingId)
        }
        return { ...opening, ...geometry }
      })
      return openings
    },

    getWallPostsById: (wallId: PerimeterWallId) => {
      const state = get()
      const wall = state.perimeterWalls[wallId]
      const openings = wall.entityIds.filter(isWallPostId).map(postId => {
        const post = state.wallPosts[postId]
        const geometry = state._wallPostGeometry[postId]
        if (!post || !geometry) {
          throw new NotFoundError('Wall post', postId)
        }
        return { ...post, ...geometry }
      })
      return openings
    },

    // Opening validation methods implementation
    isWallOpeningPlacementValid: (
      wallId: PerimeterWallId,
      centerOffsetFromWallStart: Length,
      width: Length,
      excludedOpening?: OpeningId
    ) => {
      // Validate width
      if (width <= 0) {
        throw new Error(`Opening width must be greater than 0, got ${width}`)
      }

      return validateOpeningOnWall(get(), wallId, centerOffsetFromWallStart, width, excludedOpening)
    },

    findNearestValidWallOpeningPosition: (
      wallId: PerimeterWallId,
      preferredCenterOffset: Length,
      width: Length,
      excludedOpening?: OpeningId
    ): Length | null =>
      findNearestValidWallEntityPosition(get(), wallId, preferredCenterOffset, width, 0, 0, excludedOpening),

    // Wall post operations
    addWallPost: (wallId: PerimeterWallId, postParams: WallPostParams) => {
      if (postParams.width <= 0) {
        throw new InvalidOperationError('Post width must be greater than 0')
      }
      if (postParams.thickness <= 0) {
        throw new InvalidOperationError('Post thickness must be greater than 0')
      }

      const state = get()

      const wall = state.perimeterWalls[wallId]
      if (!wall) {
        throw new NotFoundError('Perimeter wall', wallId)
      }

      if (!validatePostOnWall(state, wallId, postParams.centerOffsetFromWallStart, postParams.width)) {
        throw new InvalidOperationError('Post placement is not valid')
      }

      let result!: WallPostWithGeometry
      set(state => {
        const wall = state.perimeterWalls[wallId]

        const newPost: WallPost = {
          id: createWallPostId(),
          perimeterId: wall.perimeterId,
          wallId,
          type: 'post',
          ...postParams
        }

        wall.entityIds.push(newPost.id)
        state.wallPosts[newPost.id] = newPost

        const wallGeometry = state._perimeterWallGeometry[newPost.wallId]
        const geometry = updateEntityGeometry(wallGeometry, newPost)
        state._wallPostGeometry[newPost.id] = geometry

        result = { ...newPost, ...geometry }
      })

      return result
    },

    removeWallPost: (postId: WallPostId) => {
      set(state => {
        const post = state.wallPosts[postId]
        if (!post) return

        const wall = state.perimeterWalls[post.wallId]
        if (wall) {
          wall.entityIds = wall.entityIds.filter(id => id !== postId)
        }

        delete state.wallPosts[postId]
        delete state._wallPostGeometry[postId]
      })
    },

    updateWallPost: (postId: WallPostId, updates: Partial<WallPostParams>) => {
      set(state => {
        const post = state.wallPosts[postId]
        if (!post) throw new NotFoundError('Wall post', postId)
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

          const wallGeometry = state._perimeterWallGeometry[post.wallId]
          const geometry = updateEntityGeometry(wallGeometry, post)
          state._wallPostGeometry[post.id] = geometry
        }
      })
    },

    getWallPostById: (postId: WallPostId) => {
      const state = get()
      const post = state.wallPosts[postId]
      const geometry = state._wallPostGeometry[postId]
      if (!post || !geometry) {
        throw new NotFoundError('Wall post', postId)
      }
      return { ...post, ...geometry }
    },

    isWallPostPlacementValid: (
      wallId: PerimeterWallId,
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
      wallId: PerimeterWallId,
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

    // Movement operations for MoveTool
    movePerimeter: (perimeterId: PerimeterId, offset: Vec2) => {
      set(state => {
        const perimeter = state.perimeters[perimeterId]
        if (!perimeter) return

        for (const id of perimeter.cornerIds) {
          const corner = state.perimeterCorners[id]
          corner.referencePoint = addVec2(corner.referencePoint, offset)
        }

        updatePerimeterGeometry(state, perimeterId)
      })

      return true
    },

    // The new boundary must have exactly the same point count as the existing one
    updatePerimeterBoundary: (perimeterId: PerimeterId, newBoundary: Vec2[]) => {
      if (newBoundary.length < 3) {
        return false
      }

      const newPolygon = ensurePolygonIsClockwise({ points: newBoundary })

      // Check if the new polygon would self-intersect
      if (wouldClosingPolygonSelfIntersect(newPolygon)) {
        return false
      }

      let success = false
      set(state => {
        const perimeter = state.perimeters[perimeterId]
        if (!perimeter) throw new NotFoundError('Perimeter', perimeterId)
        if (perimeter.cornerIds.length !== newPolygon.points.length) return

        for (let i = 0; i < perimeter.cornerIds.length; i++) {
          const corner = state.perimeterCorners[perimeter.cornerIds[i]]
          corner.referencePoint = newPolygon.points[i]
        }

        updatePerimeterGeometry(state, perimeterId)
        success = true
      })

      return success
    },

    // Ring beam configuration - individual wall
    setWallBaseRingBeam: (wallId: PerimeterWallId, assemblyId: RingBeamAssemblyId) => {
      set(state => {
        const wall = state.perimeterWalls[wallId]
        if (wall == null) return

        wall.baseRingBeamAssemblyId = assemblyId
      })
    },

    setWallTopRingBeam: (wallId: PerimeterWallId, assemblyId: RingBeamAssemblyId) => {
      set(state => {
        const wall = state.perimeterWalls[wallId]
        if (wall == null) return

        wall.topRingBeamAssemblyId = assemblyId
      })
    },

    removeWallBaseRingBeam: (wallId: PerimeterWallId) => {
      set(state => {
        const wall = state.perimeterWalls[wallId]
        if (wall == null) return

        wall.baseRingBeamAssemblyId = undefined
      })
    },

    removeWallTopRingBeam: (wallId: PerimeterWallId) => {
      set(state => {
        const wall = state.perimeterWalls[wallId]
        if (wall == null) return

        wall.topRingBeamAssemblyId = undefined
      })
    },

    // Ring beam configuration - bulk operations
    setAllWallsBaseRingBeam: (perimeterId: PerimeterId, assemblyId: RingBeamAssemblyId) => {
      set(state => {
        const perimeter = state.perimeters[perimeterId]
        if (perimeter == null) return

        perimeter.wallIds.forEach(wallId => {
          const wall = state.perimeterWalls[wallId]
          if (wall) {
            wall.baseRingBeamAssemblyId = assemblyId
          }
        })
      })
    },

    setAllWallsTopRingBeam: (perimeterId: PerimeterId, assemblyId: RingBeamAssemblyId) => {
      set(state => {
        const perimeter = state.perimeters[perimeterId]
        if (perimeter == null) return

        perimeter.wallIds.forEach(wallId => {
          const wall = state.perimeterWalls[wallId]
          if (wall) {
            wall.topRingBeamAssemblyId = assemblyId
          }
        })
      })
    },

    removeAllWallsBaseRingBeam: (perimeterId: PerimeterId) => {
      set(state => {
        const perimeter = state.perimeters[perimeterId]
        if (perimeter == null) return

        perimeter.wallIds.forEach(wallId => {
          const wall = state.perimeterWalls[wallId]
          if (wall) {
            wall.baseRingBeamAssemblyId = undefined
          }
        })
      })
    },

    removeAllWallsTopRingBeam: (perimeterId: PerimeterId) => {
      set(state => {
        const perimeter = state.perimeters[perimeterId]
        if (perimeter == null) return

        perimeter.wallIds.forEach(wallId => {
          const wall = state.perimeterWalls[wallId]
          if (wall) {
            wall.topRingBeamAssemblyId = undefined
          }
        })
      })
    },

    setPerimeterReferenceSide: (perimeterId: PerimeterId, referenceSide: PerimeterReferenceSide) => {
      set(state => {
        const perimeter = state.perimeters[perimeterId]
        if (!perimeter) return
        if (perimeter.referenceSide === referenceSide) return

        for (const id of perimeter.cornerIds) {
          const corner = state.perimeterCorners[id]
          const geometry = state._perimeterCornerGeometry[id]
          corner.referencePoint =
            referenceSide === 'inside' ? copyVec2(geometry.insidePoint) : copyVec2(geometry.outsidePoint)
        }

        perimeter.referenceSide = referenceSide
        updatePerimeterGeometry(state, perimeterId)
      })
    }
  }
})

// Helper to remove a corner and merge adjacent walls
const removeCornerAndMergeWalls = (state: PerimetersState, perimeter: Perimeter, corner: PerimeterCorner): void => {
  // Get wall properties for merging
  const wall1 = state.perimeterWalls[corner.previousWallId]
  const wall2 = state.perimeterWalls[corner.nextWallId]
  const mergedThickness = Math.max(wall1.thickness, wall2.thickness)

  const geometry = state._perimeterCornerGeometry[corner.id]

  const mergedId = createPerimeterWallId()

  // Check if corner is exactly straight (180°) to preserve openings
  let entityIds: WallEntityId[] = []
  if (geometry.interiorAngle === 180) {
    entityIds = [...wall1.entityIds, ...wall2.entityIds]
    for (const id of wall1.entityIds) {
      const entity = isOpeningId(id) ? state.openings[id] : state.wallPosts[id]
      entity.wallId = mergedId
    }
    const wall1Geometry = state._perimeterWallGeometry[wall1.id]
    for (const id of wall2.entityIds) {
      const entity = isOpeningId(id) ? state.openings[id] : state.wallPosts[id]
      entity.wallId = mergedId
      entity.centerOffsetFromWallStart += wall1Geometry.wallLength
    }
  }

  const mergedWall: PerimeterWall = {
    id: mergedId,
    perimeterId: corner.perimeterId,
    startCornerId: wall1.startCornerId,
    endCornerId: wall2.endCornerId,
    thickness: mergedThickness,
    wallAssemblyId: wall1.wallAssemblyId,
    entityIds
  }

  perimeter.cornerIds = perimeter.cornerIds.filter(id => id !== corner.id)
  perimeter.wallIds = perimeter.wallIds
    .map(id => (id === wall1.id ? mergedWall.id : id === wall2.id ? null : id))
    .filter(id => id != null)

  state.perimeterCorners[wall1.startCornerId].nextWallId = mergedWall.id
  state.perimeterCorners[wall2.endCornerId].previousWallId = mergedWall.id

  state.perimeterWalls[mergedWall.id] = mergedWall

  // Recalculate all geometry
  cleanUpOrphaned(state)
  updatePerimeterGeometry(state, corner.perimeterId)
}

// Helper to remove a wall and merge the adjacent walls
const removeWallAndMergeAdjacent = (state: PerimetersState, wall: PerimeterWall): void => {
  const perimeter = state.perimeters[wall.perimeterId]
  const startCorner = state.perimeterCorners[wall.startCornerId]
  const endCorner = state.perimeterCorners[wall.endCornerId]
  const prevWall = state.perimeterWalls[startCorner.previousWallId]
  const nextWall = state.perimeterWalls[endCorner.nextWallId]
  const newStartCorner = state.perimeterCorners[prevWall.startCornerId]
  const newEndCorner = state.perimeterCorners[nextWall.endCornerId]

  perimeter.cornerIds = perimeter.cornerIds.filter(id => id !== startCorner.id && id !== endCorner.id)

  const mergedThickness = Math.max(prevWall.thickness, nextWall.thickness)
  const mergedWall: PerimeterWall = {
    id: createPerimeterWallId(),
    perimeterId: perimeter.id,
    startCornerId: newStartCorner.id,
    endCornerId: newEndCorner.id,
    thickness: mergedThickness,
    wallAssemblyId: prevWall.wallAssemblyId,
    entityIds: [] // Entities are deleted
  }
  state.perimeterWalls[mergedWall.id] = mergedWall

  perimeter.wallIds = perimeter.wallIds
    .map(id => (id === prevWall.id ? mergedWall.id : id === wall.id || id === nextWall.id ? null : id))
    .filter(id => id != null)

  newStartCorner.nextWallId = mergedWall.id
  newEndCorner.previousWallId = mergedWall.id

  // Recalculate all geometry
  cleanUpOrphaned(state)
  updatePerimeterGeometry(state, perimeter.id)
}

/**
 * Calculate valid placement range for posts, including corner extensions
 * Returns [minOffset, maxOffset]
 */
const getWallPostPlacementBounds = (
  state: PerimetersState,
  wallId: PerimeterWallId
): { minOffset: Length; maxOffset: Length } => {
  // Find wall index to get corners
  const wall = state.perimeterWalls[wallId]
  const wallGeometry = state._perimeterWallGeometry[wallId]
  if (!wall || !wallGeometry) {
    return { minOffset: 0, maxOffset: 0 }
  }

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

/**
 * Check if a wall has posts in its corner extension area
 * Assumes posts are sorted by centerOffsetFromWallStart
 */
const hasPostsInCornerArea = (
  state: PerimetersState,
  wallId: PerimeterWallId,
  cornerPosition: 'start' | 'end'
): boolean => {
  const wall = state.perimeterWalls[wallId]
  const wallGeometry = state._perimeterWallGeometry[wallId]
  const sortedPosts = wall.entityIds
    .filter(id => isWallPostId(id))
    .map(id => state.wallPosts[id])
    .sort((a, b) => a.centerOffsetFromWallStart - b.centerOffsetFromWallStart)

  if (sortedPosts.length === 0) return false

  if (cornerPosition === 'start') {
    // Check first post - is it in the corner (negative offset)?
    const firstPost = sortedPosts[0]
    const postStart = firstPost.centerOffsetFromWallStart - firstPost.width / 2
    return postStart < 0
  } else {
    // Check last post - is it in the corner (beyond wall length)?
    const lastPost = sortedPosts[sortedPosts.length - 1]
    const postEnd = lastPost.centerOffsetFromWallStart + lastPost.width / 2
    return postEnd > wallGeometry.wallLength
  }
}

// Private helper function to validate wall item (opening or post) placement on a wall
// This checks against BOTH openings and posts to ensure they don't overlap
const validateWallItemPlacement = (
  state: PerimetersState,
  wallId: PerimeterWallId,
  centerOffsetFromWallStart: Length,
  width: Length,
  startOffset: Length,
  endOffset: Length,
  excludedOpeningId?: WallEntityId
): boolean => {
  // Validate width
  if (width <= 0) {
    return false
  }

  const wall = state.perimeterWalls[wallId]
  const wallGeometry = state._perimeterWallGeometry[wallId]

  if (!wall || !wallGeometry) throw new NotFoundError('Perimeter wall', wallId)

  const minBounds = startOffset + width / 2
  const maxBounds = wallGeometry.wallLength + endOffset - width / 2

  if (centerOffsetFromWallStart < minBounds || centerOffsetFromWallStart > maxBounds) {
    return false
  }

  // Check overlap with existing openings using center-based collision
  for (const entityId of wall.entityIds) {
    if (entityId === excludedOpeningId) continue

    const entity = isOpeningId(entityId) ? state.openings[entityId] : state.wallPosts[entityId]

    // Distance between centers
    const centerDistance = Math.abs(centerOffsetFromWallStart - entity.centerOffsetFromWallStart)
    // Minimum distance needed to avoid overlap
    const minDistance = (width + entity.width) / 2

    if (centerDistance < minDistance) {
      return false
    }
  }

  return true
}

// Helper wrapper for opening validation (for backward compatibility)
const validateOpeningOnWall = (
  state: PerimetersState,
  wallId: PerimeterWallId,
  centerOffsetFromWallStart: Length,
  width: Length,
  excludedOpening?: OpeningId | undefined
): boolean => validateWallItemPlacement(state, wallId, centerOffsetFromWallStart, width, 0, 0, excludedOpening)

// Helper wrapper for post validation
const validatePostOnWall = (
  state: PerimetersState,
  wallId: PerimeterWallId,
  centerOffsetFromWallStart: Length,
  width: Length,
  excludedPost?: WallPostId | undefined
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

function cleanUpOrphaned(state: PerimetersState) {
  // Track valid wall IDs while cleaning up walls
  const validWallIds = new Set<string>()
  for (const wall of Object.values(state.perimeterWalls)) {
    if (!(wall.perimeterId in state.perimeters) || state.perimeters[wall.perimeterId].wallIds.indexOf(wall.id) === -1) {
      delete state.perimeterWalls[wall.id]
      delete state._perimeterWallGeometry[wall.id]
    } else {
      validWallIds.add(wall.id)
    }
  }

  // Clean up orphaned corners
  for (const corner of Object.values(state.perimeterCorners)) {
    if (
      !(corner.perimeterId in state.perimeters) ||
      state.perimeters[corner.perimeterId].cornerIds.indexOf(corner.id) === -1
    ) {
      delete state.perimeterCorners[corner.id]
      delete state._perimeterCornerGeometry[corner.id]
    }
  }

  // Clean up orphaned openings
  for (const opening of Object.values(state.openings)) {
    if (
      !validWallIds.has(opening.wallId) ||
      state.perimeterWalls[opening.wallId].entityIds.indexOf(opening.id) === -1
    ) {
      delete state.openings[opening.id]
      delete state._openingGeometry[opening.id]
    }
  }

  // Clean up orphaned posts
  for (const post of Object.values(state.wallPosts)) {
    if (!validWallIds.has(post.wallId) || state.perimeterWalls[post.wallId].entityIds.indexOf(post.id) === -1) {
      delete state.wallPosts[post.id]
      delete state._wallPostGeometry[post.id]
    }
  }
}

function findNearestValidWallEntityPosition(
  state: PerimetersState,
  wallId: PerimeterWallId,
  preferredCenterOffset: Length,
  width: Length,
  startOffset: Length,
  endOffset: Length,
  excludeEntityId?: WallEntityId
): Length | null {
  const wall = state.perimeterWalls[wallId]
  const geometry = state._perimeterWallGeometry[wallId]
  if (!wall || !geometry) throw new NotFoundError('Perimeter wall', wallId)

  if (width > geometry.wallLength) return null

  const halfWidth = width / 2

  // Snap center to bounds
  let center = Math.max(preferredCenterOffset, startOffset + halfWidth)
  center = Math.min(center, geometry.wallLength + endOffset - halfWidth)

  if (wall.entityIds.length === 0) return center

  // Sort existing openings by center position
  const sortedEntities = [...wall.entityIds]
    .filter(id => id !== excludeEntityId)
    .map(id => (isOpeningId(id) ? state.openings[id] : state.wallPosts[id]))
    .sort((a, b) => a.centerOffsetFromWallStart - b.centerOffsetFromWallStart)

  // Find previous and next openings relative to preferred center
  const afterIndex = sortedEntities.findIndex(o => o.centerOffsetFromWallStart >= center)

  const previous =
    afterIndex > 0
      ? sortedEntities[afterIndex - 1]
      : afterIndex === -1
        ? sortedEntities[sortedEntities.length - 1]
        : null
  const next = afterIndex !== -1 ? sortedEntities[afterIndex] : null

  // Check collisions using center-based distance
  const intersectsPrevious =
    previous && Math.abs(center - previous.centerOffsetFromWallStart) < (width + previous.width) / 2
  const intersectsNext = next && Math.abs(center - next.centerOffsetFromWallStart) < (width + next.width) / 2

  if (!intersectsPrevious && !intersectsNext) {
    return center
  }

  // If we intersect with both, the gap is too small
  if (intersectsPrevious && intersectsNext) {
    return null
  }

  // Otherwise find the shortest shift
  let bestCenter: Length | null = null
  let bestDistance = Infinity

  // If we intersect with previous opening, try shifting right (after previous)
  if (intersectsPrevious && previous) {
    const shiftedCenter = previous.centerOffsetFromWallStart + (previous.width + width) / 2
    const shiftDistance = Math.abs(shiftedCenter - preferredCenterOffset)

    // Check if shift is within the wall and doesn't intersect with next
    const shiftedRightEdge = shiftedCenter + halfWidth
    const validBounds = shiftedRightEdge <= geometry.wallLength + endOffset
    const noNextCollision =
      !next || Math.abs(shiftedCenter - next.centerOffsetFromWallStart) >= (width + next.width) / 2

    if (validBounds && noNextCollision) {
      bestCenter = shiftedCenter
      bestDistance = shiftDistance
    }
  }

  // If we intersect with next opening, try shifting left (before next)
  if (intersectsNext && next) {
    const shiftedCenter = next.centerOffsetFromWallStart - (next.width + width) / 2
    const shiftDistance = Math.abs(shiftedCenter - preferredCenterOffset)

    // Check if shift is within the wall and doesn't intersect with previous
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
