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
import {
  type Length,
  type Line2D,
  type Polygon2D,
  type Vec2,
  addVec2,
  copyVec2,
  direction,
  distVec2,
  lineFromPoints,
  lineIntersection,
  midpoint,
  negVec2,
  perpendicularCCW,
  projectPointOntoLine,
  radiansToDegrees,
  scaleAddVec2
} from '@/shared/geometry'
import { ensurePolygonIsClockwise, wouldClosingPolygonSelfIntersect } from '@/shared/geometry/polygon'

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
  ) => Perimeter
  removePerimeter: (perimeterId: PerimeterId) => void

  setPerimeterReferenceSide: (perimeterId: PerimeterId, referenceSide: PerimeterReferenceSide) => void

  // Entity deletion operations
  removePerimeterCorner: (cornerId: PerimeterCornerId) => boolean
  removePerimeterWall: (wallId: PerimeterWallId) => boolean

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

  // Updated opening actions with ID-based approach and auto-ID generation
  addWallOpening: (wallId: PerimeterWallId, openingParams: OpeningParams) => Opening | null
  removeWallOpening: (openingId: OpeningId) => void
  updateWallOpening: (openingId: OpeningId, updates: Partial<OpeningParams>) => void

  // Opening validation methods
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

  // Wall post actions with ID-based approach and auto-ID generation
  addPerimeterWallPost: (wallId: PerimeterWallId, postParams: WallPostParams) => WallPost | null
  removePerimeterWallPost: (postId: WallPostId) => void
  updatePerimeterWallPost: (postId: WallPostId, updates: Partial<WallPostParams>) => void

  // Updated getters
  getPerimeterById: (perimeterId: PerimeterId) => PerimeterWithGeometry | null
  getPerimeterWallById: (wallId: PerimeterWallId) => PerimeterWallWithGeometry | null
  getPerimeterCornerById: (cornerId: PerimeterCornerId) => PerimeterCornerWithGeometry | null
  getWallOpeningById: (openingId: OpeningId) => OpeningWithGeometry | null
  getPerimeterWallPostById: (postId: WallPostId) => WallPostWithGeometry | null
  getPerimetersByStorey: (storeyId: StoreyId) => PerimeterWithGeometry[]

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
      boundary = ensurePolygonIsClockwise(boundary)

      const wallThickness = thickness

      if (wallThickness <= 0) {
        throw new Error('Wall thickness must be greater than 0')
      }

      let perimeter: Perimeter | undefined

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
          referencePoint: copyVec2(point),
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

        perimeter = {
          id: createPerimeterId(),
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

        // Calculate all geometry using the mutable helper
        updatePerimeterGeometry(state, perimeterId)

        state.perimeters[perimeter.id] = perimeter
      })

      if (!perimeter) {
        throw new Error('Failed to create perimeter')
      }
      return perimeter
    },

    removePerimeter: (perimeterId: PerimeterId) => {
      set(state => {
        const { [perimeterId]: _removed, ...remainingPerimeters } = state.perimeters
        state.perimeters = remainingPerimeters
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
        if (!perimeter) return

        const newCorners = perimeter.cornerIds.filter(id => id !== cornerId)
        const newBoundaryPoints = newCorners.map(c => state.perimeterCorners[c].referencePoint)

        if (wouldClosingPolygonSelfIntersect({ points: newBoundaryPoints })) return

        // Use helper to do all the work
        removeCornerAndMergeWalls(state, perimeter, corner)
        success = true
      })
      return success
    },

    // Wall deletion: removes the target wall and merges the two adjacent walls into one,
    // also removing the two corner points that connected these three walls
    removePerimeterWall: (wallId: PerimeterWallId): boolean => {
      let success = false
      set(state => {
        const wall = state.perimeterWalls[wallId]
        if (!wall) return

        const perimeter = state.perimeters[wall.perimeterId]
        if (!perimeter) return

        const newBoundary = perimeter.cornerIds
          .filter(id => id !== wall.startCornerId && id !== wall.endCornerId)
          .map(id => state._perimeterCornerGeometry[id].insidePoint)

        if (wouldClosingPolygonSelfIntersect({ points: newBoundary })) return

        // Use helper to do all the work
        removeWallAndMergeAdjacent(state, wall)
        success = true
      })
      return success
    },

    // Wall splitting operation
    splitPerimeterWall: (wallId: PerimeterWallId, splitPosition: Length): PerimeterWallId | null => {
      let newWallId: PerimeterWallId | null = null

      set(state => {
        const wall = state.perimeterWalls[wallId]
        const wallGeometry = state._perimeterWallGeometry[wallId]
        if (!wall || !wallGeometry) return

        const perimeter = state.perimeters[wall.perimeterId]
        if (!perimeter) return

        const wallIndex = perimeter.wallIds.indexOf(wallId)

        // Validate split position
        if (splitPosition <= 0 || splitPosition >= wallGeometry.wallLength) return

        const firstWallId = createPerimeterWallId()
        const secondWallId = createPerimeterWallId()
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
            firstWallEntities.push({
              ...entity,
              wallId: firstWallId
            })
          } else {
            secondWallEntities.push({
              ...entity,
              wallId: secondWallId,
              centerOffsetFromWallStart: entity.centerOffsetFromWallStart - splitPosition
            })
          }
        }

        // Calculate split points in world coordinates based on the reference side
        const wallDirection = wallGeometry.direction
        const referenceLine = perimeter.referenceSide === 'inside' ? wallGeometry.insideLine : wallGeometry.outsideLine
        const referenceSplitPoint = scaleAddVec2(referenceLine.start, wallDirection, splitPosition)

        // Create new corner at split position
        const newCorner: PerimeterCorner = {
          id: newCornerId,
          perimeterId: wall.perimeterId,
          previousWallId: firstWallId,
          nextWallId: secondWallId,
          constructedByWall: 'next',
          referencePoint: referenceSplitPoint
        }

        // Create two new walls
        const firstWall: PerimeterWall = {
          id: firstWallId,
          perimeterId: wall.perimeterId,
          startCornerId: wall.startCornerId,
          endCornerId: newCornerId,
          thickness: wall.thickness,
          wallAssemblyId: wall.wallAssemblyId,
          entityIds: firstWallEntities.map(e => e.id)
        }

        const secondWall: PerimeterWall = {
          id: secondWallId,
          perimeterId: wall.perimeterId,
          startCornerId: newCornerId,
          endCornerId: wall.endCornerId,
          thickness: wall.thickness,
          wallAssemblyId: wall.wallAssemblyId,
          entityIds: secondWallEntities.map(e => e.id)
        }

        // Insert new corner at the correct position
        const cornerIndex = wallIndex + 1
        perimeter.cornerIds.splice(cornerIndex, 0, newCornerId)

        // Replace original wall with two new walls
        perimeter.wallIds.splice(wallIndex, 1, firstWallId, secondWallId)

        state.perimeterCorners[newCornerId] = newCorner
        state.perimeterWalls[firstWallId] = firstWall
        state.perimeterWalls[secondWallId] = secondWall

        for (const entity of firstWallEntities) {
          if (entity.type === 'opening') {
            state.openings[entity.id] = entity
          } else {
            state.wallPosts[entity.id] = entity
          }
        }

        // Recalculate geometry
        updatePerimeterGeometry(state, wall.perimeterId)

        newWallId = secondWall.id
      })

      return newWallId
    },

    // Update operations
    updatePerimeterWallAssembly: (wallId: PerimeterWallId, assemblyId: WallAssemblyId) => {
      set(state => {
        const wall = state.perimeterWalls[wallId]
        if (wall == null) return

        wall.wallAssemblyId = assemblyId
      })
    },

    updatePerimeterWallThickness: (wallId: PerimeterWallId, thickness: Length) => {
      if (thickness <= 0) {
        throw new Error('Wall thickness must be greater than 0')
      }

      set(state => {
        const wall = state.perimeterWalls[wallId]
        if (wall == null) return

        wall.thickness = thickness
        updatePerimeterGeometry(state, wall.perimeterId)
      })
    },

    // Bulk update operations for all walls in a perimeter
    updateAllPerimeterWallsAssembly: (perimeterId: PerimeterId, assemblyId: WallAssemblyId) => {
      set(state => {
        const perimeter = state.perimeters[perimeterId]
        if (perimeter == null) return

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
        if (perimeter == null) return

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
      if (!corner) return false

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
        if (!corner) return

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
        console.error('Opening width must be greater than 0')
        return null
      }
      if (openingParams.height <= 0) {
        console.error('Opening height must be greater than 0')
        return null
      }
      if (openingParams.sillHeight != null && openingParams.sillHeight < 0) {
        console.error('Window sill height must be non-negative')
        return null
      }

      // Basic validation checks
      if (openingParams.centerOffsetFromWallStart < 0) {
        console.error('Opening center offset from start must be non-negative')
        return null
      }

      let opening: Opening | null = null
      set(state => {
        const wall = state.perimeterWalls[wallId]

        // Auto-generate ID for the new opening
        const newOpening: Opening = {
          id: createOpeningId(),
          type: 'opening',
          perimeterId: wall.perimeterId,
          wallId: wallId,
          ...openingParams
        }

        wall.entityIds.push(newOpening.id)
        state.openings[newOpening.id] = newOpening
        opening = newOpening
      })

      return opening
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
      })
    },

    // Getters
    getPerimeterById: (perimeterId: PerimeterId) => {
      const state = get()
      const perimeter = state.perimeters[perimeterId]
      const geometry = state._perimeterGeometry[perimeterId]
      if (!perimeter || !geometry) return null
      return { ...perimeter, ...geometry }
    },

    getPerimeterWallById: (wallId: PerimeterWallId) => {
      const state = get()
      const wall = state.perimeterWalls[wallId]
      const geometry = state._perimeterWallGeometry[wallId]
      if (!wall || !geometry) return null
      return { ...wall, ...geometry }
    },

    getPerimeterCornerById: (cornerId: PerimeterCornerId) => {
      const state = get()
      const corner = state.perimeterCorners[cornerId]
      const geometry = state._perimeterCornerGeometry[cornerId]
      if (!corner || !geometry) return null
      return { ...corner, ...geometry }
    },

    getWallOpeningById: (openingId: OpeningId) => {
      const state = get()
      const opening = state.openings[openingId]
      const geometry = state._openingGeometry[openingId]
      if (!opening || !geometry) return null
      return { ...opening, ...geometry }
    },

    updateWallOpening: (openingId: OpeningId, updates: Partial<OpeningParams>) => {
      set(state => {
        const opening = state.openings[openingId]
        if (!opening) return
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
        }
      })
    },

    getPerimetersByStorey: (storeyId: StoreyId) => {
      const state = get()
      return Object.values(state.perimeters)
        .filter(p => p.storeyId === storeyId)
        .map(p => ({ ...p, ...state._perimeterGeometry[p.id] }))
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
    addPerimeterWallPost: (wallId: PerimeterWallId, postParams: WallPostParams) => {
      if (postParams.width <= 0) {
        throw new Error('Post width must be greater than 0')
      }
      if (postParams.thickness <= 0) {
        throw new Error('Post thickness must be greater than 0')
      }

      const state = get()

      const wall = state.perimeterWalls[wallId]
      if (!wall) {
        throw new Error('Wall does not exist')
      }

      if (!validatePostOnWall(state, wallId, postParams.centerOffsetFromWallStart, postParams.width)) {
        throw new Error('Post placement is not valid')
      }

      let post: WallPost | null = null
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
        post = newPost
      })

      return post
    },

    removePerimeterWallPost: (postId: WallPostId) => {
      set(state => {
        const post = state.wallPosts[postId]
        if (!post) return

        const wall = state.perimeterWalls[post.wallId]
        if (wall) {
          wall.entityIds = wall.entityIds.filter(id => id !== postId)
        }

        delete state.wallPosts[postId]
      })
    },

    updatePerimeterWallPost: (postId: WallPostId, updates: Partial<WallPostParams>) => {
      set(state => {
        const post = state.wallPosts[postId]
        if (!post) return
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
        }
      })
    },

    getPerimeterWallPostById: (postId: WallPostId) => {
      const state = get()
      const post = state.wallPosts[postId]
      const geometry = state._wallPostGeometry[postId]
      if (!post || !geometry) return null
      return { ...post, ...geometry }
    },

    isPerimeterWallPostPlacementValid: (
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

    findNearestValidPerimeterWallPostPosition: (
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
        if (!perimeter || perimeter.cornerIds.length !== newPolygon.points.length) return

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

// Step 1: Create infinite inside and outside lines for each wall wall
const createInfiniteLines = (
  boundary: Polygon2D,
  thicknesses: Length[],
  referenceSide: PerimeterReferenceSide
): { inside: Line2D; outside: Line2D }[] => {
  const numSides = boundary.points.length
  const infiniteLines: { inside: Line2D; outside: Line2D }[] = []

  for (let i = 0; i < numSides; i++) {
    const startPoint = boundary.points[i]
    const endPoint = boundary.points[(i + 1) % numSides]
    const wallThickness = thicknesses[i]

    // Create line from boundary points
    const baseLine = lineFromPoints(startPoint, endPoint)
    if (!baseLine) {
      throw new Error('Wall wall cannot have zero length')
    }

    const outwardDirection = perpendicularCCW(baseLine.direction)
    let insideLine: Line2D
    let outsideLine: Line2D

    if (referenceSide === 'inside') {
      insideLine = baseLine
      const outsidePoint = scaleAddVec2(startPoint, outwardDirection, wallThickness)
      outsideLine = { point: outsidePoint, direction: baseLine.direction }
    } else {
      outsideLine = baseLine
      const insidePoint = scaleAddVec2(startPoint, outwardDirection, -wallThickness)
      insideLine = { point: insidePoint, direction: baseLine.direction }
    }

    infiniteLines.push({ inside: insideLine, outside: outsideLine })
  }

  return infiniteLines
}

// Step 2: Recalculate corner outside point as intersections of adjacent lines
const updateCornerOutsidePoint = (
  corner: PerimeterCornerGeometry,
  prevThickness: Length,
  nextThickness: Length,
  prevOutsideLine: Line2D,
  nextOutsideLine: Line2D
): void => {
  const intersection = lineIntersection(prevOutsideLine, nextOutsideLine)

  if (intersection) {
    corner.outsidePoint = intersection
  } else {
    // No intersection means the walls are colinear (parallel)
    // Project the boundary point outward by the maximum thickness of adjacent walls
    const maxThickness = Math.max(prevThickness, nextThickness)

    // Use the outside direction from either wall (they should be the same for colinear walls)
    const outsideDirection = perpendicularCCW(nextOutsideLine.direction)
    corner.outsidePoint = scaleAddVec2(corner.insidePoint, outsideDirection, maxThickness)
  }
}
// Step 2: Calculate corner points (both inside and outside) as intersections of adjacent lines
const updateAllCornerOutsidePoints = (
  corners: PerimeterCornerGeometry[],
  thicknesses: Length[],
  infiniteLines: { inside: Line2D; outside: Line2D }[]
): void => {
  const numSides = corners.length

  for (let i = 0; i < numSides; i++) {
    const prevIndex = (i - 1 + numSides) % numSides
    const prevOutsideLine = infiniteLines[prevIndex].outside
    const currentOutsideLine = infiniteLines[i].outside
    const prevThickness = thicknesses[prevIndex]
    const currentThickness = thicknesses[i]
    updateCornerOutsidePoint(corners[i], prevThickness, currentThickness, prevOutsideLine, currentOutsideLine)
  }
}

const updateCornerInsidePoint = (
  corner: PerimeterCornerGeometry,
  prevThickness: Length,
  nextThickness: Length,
  prevInsideLine: Line2D,
  nextInsideLine: Line2D
): void => {
  const intersection = lineIntersection(prevInsideLine, nextInsideLine)

  if (intersection) {
    corner.insidePoint = intersection
  } else {
    const minThickness = Math.min(prevThickness, nextThickness)
    const inwardDirection = negVec2(perpendicularCCW(nextInsideLine.direction))
    corner.insidePoint = scaleAddVec2(corner.outsidePoint, inwardDirection, minThickness)
  }
}

const updateAllCornerInsidePoints = (
  corners: PerimeterCornerGeometry[],
  thicknesses: Length[],
  infiniteLines: { inside: Line2D; outside: Line2D }[]
): void => {
  const numSides = corners.length

  for (let i = 0; i < numSides; i++) {
    const prevIndex = (i - 1 + numSides) % numSides
    const prevInsideLine = infiniteLines[prevIndex].inside
    const currentInsideLine = infiniteLines[i].inside
    const prevThickness = thicknesses[prevIndex]
    const currentThickness = thicknesses[i]
    updateCornerInsidePoint(corners[i], prevThickness, currentThickness, prevInsideLine, currentInsideLine)
  }
}

// Calculate interior and exterior angles at a corner formed by three points (in degrees)
const calculateCornerAngles = (
  previousPoint: Vec2,
  cornerPoint: Vec2,
  nextPoint: Vec2
): { interiorAngle: number; exteriorAngle: number } => {
  // Vectors from corner to adjacent points
  const toPrevious = direction(cornerPoint, previousPoint)
  const toNext = direction(cornerPoint, nextPoint)

  // Calculate the angle between the vectors using atan2 for full range
  const angle1 = Math.atan2(toPrevious[1], toPrevious[0])
  const angle2 = Math.atan2(toNext[1], toNext[0])

  // Calculate the difference, ensuring positive result
  let angleDiff = angle2 - angle1
  if (angleDiff < 0) {
    angleDiff += 2 * Math.PI
  }

  // Convert to degrees and round
  const angleDegrees = Math.round(radiansToDegrees(angleDiff))

  // Assume the angle calculated is the interior angle (this works for convex polygons)
  const interiorAngleDegrees = angleDegrees
  const exteriorAngleDegrees = 360 - angleDegrees

  return {
    interiorAngle: interiorAngleDegrees,
    exteriorAngle: exteriorAngleDegrees
  }
}

// Calculate angles for all corners
const updateAllCornerAngles = (corners: PerimeterCornerGeometry[]): void => {
  const numCorners = corners.length

  for (let i = 0; i < numCorners; i++) {
    const prevIndex = (i - 1 + numCorners) % numCorners
    const nextIndex = (i + 1) % numCorners

    const previousPoint = corners[prevIndex].insidePoint
    const cornerPoint = corners[i].insidePoint
    const nextPoint = corners[nextIndex].insidePoint

    const angles = calculateCornerAngles(previousPoint, cornerPoint, nextPoint)
    corners[i].interiorAngle = angles.interiorAngle
    corners[i].exteriorAngle = angles.exteriorAngle
  }
}

const updateWallGeometry = (
  wall: PerimeterWallGeometry,
  thickness: Length,
  startCorner: PerimeterCornerGeometry,
  endCorner: PerimeterCornerGeometry
): void => {
  const insideStart = startCorner.insidePoint
  const insideEnd = endCorner.insidePoint
  const wallMidpoint = midpoint(insideStart, insideEnd)

  const startCornerOutside = startCorner.outsidePoint
  const endCornerOutside = endCorner.outsidePoint

  // Calculate wall direction and outside direction
  const wallDirection = direction(insideStart, insideEnd)
  const outsideDirection = perpendicularCCW(wallDirection)

  // Create the infinite lines for this wall
  const insideLine: Line2D = {
    point: insideStart,
    direction: wallDirection
  }
  const outsideLine: Line2D = {
    point: scaleAddVec2(insideStart, outsideDirection, thickness),
    direction: wallDirection
  }

  // Project boundary points onto outside line
  const boundaryStartOnOutside = projectPointOntoLine(insideStart, outsideLine)
  const boundaryEndOnOutside = projectPointOntoLine(insideEnd, outsideLine)

  // Project corner outside points onto inside line
  const cornerStartOnInside = projectPointOntoLine(startCornerOutside, insideLine)
  const cornerEndOnInside = projectPointOntoLine(endCornerOutside, insideLine)

  // Choose endpoints based on which projection is closer to wall midpoint
  const startDistBoundary = distVec2(insideStart, wallMidpoint)
  const startDistCorner = distVec2(cornerStartOnInside, wallMidpoint)
  const endDistBoundary = distVec2(insideEnd, wallMidpoint)
  const endDistCorner = distVec2(cornerEndOnInside, wallMidpoint)

  const finalInsideStart = startDistBoundary <= startDistCorner ? insideStart : cornerStartOnInside
  const finalInsideEnd = endDistBoundary <= endDistCorner ? insideEnd : cornerEndOnInside
  const finalOutsideStart = startDistBoundary <= startDistCorner ? boundaryStartOnOutside : startCornerOutside
  const finalOutsideEnd = endDistBoundary <= endDistCorner ? boundaryEndOnOutside : endCornerOutside

  // Directly mutate wall properties
  wall.insideLength = distVec2(insideStart, insideEnd)
  wall.outsideLength = distVec2(startCornerOutside, endCornerOutside)
  wall.wallLength = distVec2(finalInsideStart, finalInsideEnd)
  wall.insideLine = { start: finalInsideStart, end: finalInsideEnd }
  wall.outsideLine = { start: finalOutsideStart, end: finalOutsideEnd }
  wall.direction = wallDirection
  wall.outsideDirection = outsideDirection
}

// High-level helper to recalculate all perimeter geometry in place
const updatePerimeterGeometry = (state: PerimetersState, perimeterId: PerimeterId): void => {
  const perimeter = state.perimeters[perimeterId]

  if (perimeter.wallIds.length !== perimeter.cornerIds.length) {
    throw new Error('Walls and corners are out of sync')
  }

  const walls = perimeter.wallIds.map(w => state.perimeterWalls[w])
  const thicknesses = walls.map((wall: PerimeterWall) => wall.thickness)

  const referencePoints = perimeter.cornerIds.map(c => state.perimeterCorners[c].referencePoint)
  const infiniteLines = createInfiniteLines({ points: referencePoints }, thicknesses, perimeter.referenceSide)

  const corners = perimeter.cornerIds.map(c => state._perimeterCornerGeometry[c])
  if (perimeter.referenceSide === 'inside') {
    corners.forEach((corner, i) => {
      corner.insidePoint = copyVec2(referencePoints[i])
    })
    updateAllCornerOutsidePoints(corners, thicknesses, infiniteLines)
  } else {
    corners.forEach((corner, i) => {
      corner.outsidePoint = copyVec2(referencePoints[i])
    })
    updateAllCornerInsidePoints(corners, thicknesses, infiniteLines)
  }

  updateAllCornerAngles(corners)

  const wallGeometries = perimeter.wallIds.map(w => state._perimeterWallGeometry[w])
  for (let i = 0; i < wallGeometries.length; i++) {
    const startCorner = corners[i]
    const endCorner = corners[(i + 1) % corners.length]
    updateWallGeometry(wallGeometries[i], thicknesses[i], startCorner, endCorner)
  }
}

// Helper to remove a corner and merge adjacent walls
const removeCornerAndMergeWalls = (state: PerimetersState, perimeter: Perimeter, corner: PerimeterCorner): void => {
  // Get wall properties for merging
  const wall1 = state.perimeterWalls[corner.previousWallId]
  const wall2 = state.perimeterWalls[corner.nextWallId]
  const mergedThickness = Math.max(wall1.thickness, wall2.thickness)

  const geometry = state._perimeterCornerGeometry[corner.id]

  // Check if corner is exactly straight (180°) to preserve openings
  let entityIds: WallEntityId[] = []
  if (geometry.interiorAngle === 180) {
    entityIds.push(...wall1.entityIds, ...wall2.entityIds)
    const wall1Geometry = state._perimeterWallGeometry[wall1.id]
    for (const id of wall2.entityIds) {
      const entity = isOpeningId(id) ? state.openings[id] : state.wallPosts[id]
      entity.centerOffsetFromWallStart += wall1Geometry.wallLength
    }
  }

  const mergedWall: PerimeterWall = {
    id: createPerimeterWallId(),
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
  delete state.perimeterWalls[wall1.id]
  delete state.perimeterWalls[wall2.id]
  delete state.perimeterCorners[corner.id]

  // Recalculate all geometry
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

  perimeter.wallIds = perimeter.wallIds
    .map(id => (id === prevWall.id ? mergedWall.id : id === wall.id || id === nextWall.id ? null : id))
    .filter(id => id != null)

  newStartCorner.nextWallId = mergedWall.id
  newEndCorner.previousWallId = mergedWall.id
  delete state.perimeterWalls[prevWall.id]
  delete state.perimeterWalls[wall.id]
  delete state.perimeterWalls[nextWall.id]
  delete state.perimeterCorners[startCorner.id]
  delete state.perimeterCorners[endCorner.id]

  // Recalculate all geometry
  updatePerimeterGeometry(state, perimeter.id)
}

/**
 * Calculate valid placement range for posts, including corner extensions
 * Returns [minOffset, maxOffset]
 */
export const getWallPostPlacementBounds = (
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
  if (wall.entityIds.length === 0) return false

  const sortedPosts = wall.entityIds
    .filter(id => isWallPostId(id))
    .map(id => state.wallPosts[id])
    .sort((a, b) => a.centerOffsetFromWallStart - b.centerOffsetFromWallStart)
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
  for (const wall of Object.values(state.perimeterWalls)) {
    if (!(wall.perimeterId in state.perimeters)) {
      delete state.perimeterWalls[wall.id]
    }
  }
  for (const corner of Object.values(state.perimeterCorners)) {
    if (!(corner.perimeterId in state.perimeters)) {
      delete state.perimeterCorners[corner.id]
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
  if (!wall || !geometry) return null
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
