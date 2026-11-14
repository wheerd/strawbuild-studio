import type { StateCreator } from 'zustand'

import type {
  Perimeter,
  PerimeterCorner,
  PerimeterCornerGeometry,
  PerimeterCornerWithGeometry,
  PerimeterGeometry,
  PerimeterReferenceSide,
  PerimeterWall,
  PerimeterWallGeometry,
  PerimeterWallWithGeometry,
  PerimeterWithGeometry
} from '@/building/model'
import type {
  PerimeterCornerId,
  PerimeterId,
  PerimeterWallAssemblyId,
  PerimeterWallId,
  RingBeamAssemblyId,
  StoreyId,
  WallEntityId,
  WallNodeId
} from '@/building/model/ids'
import { createPerimeterCornerId, createPerimeterId, createPerimeterWallId, isOpeningId } from '@/building/model/ids'
import { InvalidOperationError, NotFoundError } from '@/building/store/errors'
import {
  applyMergedConstraintsDraft,
  captureConstraintsForMerge,
  handleWallSplitConstraintsDraft
} from '@/building/store/slices/constraintsSlice'
import { updateTimestampDraft } from '@/building/store/slices/timestampsSlice'
import type { StoreState } from '@/building/store/types'
import { type Length, type Polygon2D, type Vec2, addVec2, copyVec2, scaleAddVec2 } from '@/shared/geometry'
import { ensurePolygonIsClockwise, wouldClosingPolygonSelfIntersect } from '@/shared/geometry/polygon'

import { cleanUpOrphaned } from './cleanup'
import { updateAllWallNodeGeometry } from './intermediateWallGeometry'
import { updatePerimeterGeometry } from './perimeterGeometry'
import { hasPostsInCornerArea } from './wallEntitiesSlice'

export interface PerimetersState {
  perimeters: Record<PerimeterId, Perimeter>
  _perimeterGeometry: Record<PerimeterId, PerimeterGeometry>

  perimeterWalls: Record<PerimeterWallId, PerimeterWall>
  _perimeterWallGeometry: Record<PerimeterWallId, PerimeterWallGeometry>

  perimeterCorners: Record<PerimeterCornerId, PerimeterCorner>
  _perimeterCornerGeometry: Record<PerimeterCornerId, PerimeterCornerGeometry>
}

export interface PerimetersActions {
  addPerimeter: (
    storeyId: StoreyId,
    boundary: Polygon2D,
    wallAssemblyId: PerimeterWallAssemblyId,
    thickness: Length,
    baseRingBeamAssemblyId?: RingBeamAssemblyId,
    topRingBeamAssemblyId?: RingBeamAssemblyId,
    referenceSide?: PerimeterReferenceSide
  ) => PerimeterWithGeometry
  removePerimeter: (perimeterId: PerimeterId) => void

  setPerimeterReferenceSide: (perimeterId: PerimeterId, referenceSide: PerimeterReferenceSide) => void

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

  splitPerimeterWall: (wallId: PerimeterWallId, splitPosition: Length) => PerimeterWallId | null

  updatePerimeterWallAssembly: (wallId: PerimeterWallId, assemblyId: PerimeterWallAssemblyId) => void
  updatePerimeterWallThickness: (wallId: PerimeterWallId, thickness: Length) => void

  updateAllPerimeterWallsAssembly: (perimeterId: PerimeterId, assemblyId: PerimeterWallAssemblyId) => void
  updateAllPerimeterWallsThickness: (perimeterId: PerimeterId, thickness: Length) => void

  updatePerimeterCornerConstructedByWall: (cornerId: PerimeterCornerId, constructedByWall: 'previous' | 'next') => void
  canSwitchCornerConstructedByWall: (cornerId: PerimeterCornerId) => boolean

  getPerimeterById: (perimeterId: PerimeterId) => PerimeterWithGeometry
  getPerimeterWallsById: (perimeterId: PerimeterId) => PerimeterWallWithGeometry[]
  getPerimeterWallById: (wallId: PerimeterWallId) => PerimeterWallWithGeometry
  getPerimeterCornerById: (cornerId: PerimeterCornerId) => PerimeterCornerWithGeometry
  getPerimeterCornersById: (perimeterId: PerimeterId) => PerimeterCornerWithGeometry[]
  getPerimetersByStorey: (storeyId: StoreyId) => PerimeterWithGeometry[]
  getAllPerimeters: () => PerimeterWithGeometry[]
  getAllPerimeterWalls: () => PerimeterWallWithGeometry[]

  movePerimeter: (perimeterId: PerimeterId, offset: Vec2) => boolean
  updatePerimeterBoundary: (perimeterId: PerimeterId, newBoundary: Vec2[]) => boolean

  setWallBaseRingBeam: (wallId: PerimeterWallId, assemblyId: RingBeamAssemblyId) => void
  setWallTopRingBeam: (wallId: PerimeterWallId, assemblyId: RingBeamAssemblyId) => void
  removeWallBaseRingBeam: (wallId: PerimeterWallId) => void
  removeWallTopRingBeam: (wallId: PerimeterWallId) => void

  setAllWallsBaseRingBeam: (perimeterId: PerimeterId, assemblyId: RingBeamAssemblyId) => void
  setAllWallsTopRingBeam: (perimeterId: PerimeterId, assemblyId: RingBeamAssemblyId) => void
  removeAllWallsBaseRingBeam: (perimeterId: PerimeterId) => void
  removeAllWallsTopRingBeam: (perimeterId: PerimeterId) => void
}

export type PerimetersSlice = PerimetersState & { actions: PerimetersActions }

export const createPerimetersSlice: StateCreator<
  PerimetersSlice & StoreState,
  [['zustand/immer', never]],
  [],
  PerimetersSlice
> = (set, get) => ({
  perimeters: {},
  _perimeterGeometry: {},
  perimeterCorners: {},
  _perimeterCornerGeometry: {},
  perimeterWalls: {},
  _perimeterWallGeometry: {},

  actions: {
    addPerimeter: (
      storeyId: StoreyId,
      boundary: Polygon2D,
      wallAssemblyId: PerimeterWallAssemblyId,
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
          entityIds: [],
          wallNodeIds: []
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

        updatePerimeterGeometry(state, perimeterId)

        updateTimestampDraft(state, perimeterId, ...cornerIds, ...wallIds)

        result = { ...perimeter, ...state._perimeterGeometry[perimeterId] }
      })

      return result
    },

    removePerimeter: (perimeterId: PerimeterId) => {
      set(state => {
        delete state.perimeters[perimeterId]
        delete state._perimeterGeometry[perimeterId]
        cleanUpOrphaned(state)
      })
    },

    removePerimeterCorner: (cornerId: PerimeterCornerId): boolean => {
      let success = false
      set(state => {
        if (!(cornerId in state.perimeterCorners)) return
        const corner = state.perimeterCorners[cornerId]
        const perimeter = state.perimeters[corner.perimeterId]

        const newCorners = perimeter.cornerIds.filter(id => id !== cornerId)
        const newBoundaryPoints = newCorners.map(c => state.perimeterCorners[c].referencePoint)

        if (wouldClosingPolygonSelfIntersect({ points: newBoundaryPoints })) return

        removeCornerAndMergeWalls(state, perimeter, corner)
        success = true
      })

      return success
    },

    canRemovePerimeterCorner: (
      cornerId: PerimeterCornerId
    ): { canRemove: boolean; reason?: 'cannotDeleteMinCorners' | 'cannotDeleteSelfIntersect' } => {
      const state = get()
      if (!(cornerId in state.perimeterCorners)) throw new NotFoundError('Perimeter corner', cornerId)
      const corner = state.perimeterCorners[cornerId]
      const perimeter = state.perimeters[corner.perimeterId]

      if (perimeter.cornerIds.length < 4) {
        return { canRemove: false, reason: 'cannotDeleteMinCorners' }
      }

      const newCorners = perimeter.cornerIds.filter(id => id !== cornerId)
      const newBoundaryPoints = newCorners.map(id => state.perimeterCorners[id].referencePoint)

      if (wouldClosingPolygonSelfIntersect({ points: newBoundaryPoints })) {
        return { canRemove: false, reason: 'cannotDeleteSelfIntersect' }
      }

      return { canRemove: true }
    },

    removePerimeterWall: (wallId: PerimeterWallId): boolean => {
      let success = false
      set(state => {
        if (!(wallId in state.perimeterWalls)) return
        const wall = state.perimeterWalls[wallId]

        if (!state.actions.canRemovePerimeterWall(wallId).canRemove) {
          throw new InvalidOperationError('Cannot delete wall')
        }

        removeWallAndMergeAdjacent(state, wall)
        success = true
      })
      return success
    },

    canRemovePerimeterWall: (
      wallId: PerimeterWallId
    ): { canRemove: boolean; reason?: 'cannotDeleteMinWalls' | 'cannotDeleteSelfIntersect' } => {
      const state = get()
      if (!(wallId in state.perimeterWalls)) throw new NotFoundError('Perimeter wall', wallId)
      const wall = state.perimeterWalls[wallId]
      const perimeter = state.perimeters[wall.perimeterId]

      if (perimeter.wallIds.length < 5) {
        return { canRemove: false, reason: 'cannotDeleteMinWalls' }
      }

      const newBoundary = perimeter.cornerIds
        .filter(id => id !== wall.startCornerId && id !== wall.endCornerId)
        .map(id => state._perimeterCornerGeometry[id].insidePoint)

      if (wouldClosingPolygonSelfIntersect({ points: newBoundary })) {
        return { canRemove: false, reason: 'cannotDeleteSelfIntersect' }
      }

      return { canRemove: true }
    },

    splitPerimeterWall: (wallId: PerimeterWallId, splitPosition: Length): PerimeterWallId | null => {
      let newWallId: PerimeterWallId | null = null
      set(state => {
        if (!(wallId in state.perimeterWalls)) throw new NotFoundError('Perimeter wall', wallId)
        const wall = state.perimeterWalls[wallId]
        const wallGeometry = state._perimeterWallGeometry[wallId]
        const perimeter = state.perimeters[wall.perimeterId]

        const wallIndex = perimeter.wallIds.indexOf(wallId)

        if (splitPosition <= 0 || splitPosition >= wallGeometry.wallLength) return

        newWallId = createPerimeterWallId()
        const newCornerId = createPerimeterCornerId()

        const firstWallEntities = []
        const secondWallEntities = []
        for (const entityId of wall.entityIds) {
          const entity = isOpeningId(entityId) ? state.openings[entityId] : state.wallPosts[entityId]
          const entityStart = entity.centerOffsetFromWallStart - entity.width / 2
          const entityEnd = entity.centerOffsetFromWallStart + entity.width / 2
          if (splitPosition > entityStart && splitPosition < entityEnd) return
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

        const referenceLine = perimeter.referenceSide === 'inside' ? wallGeometry.insideLine : wallGeometry.outsideLine
        const referenceSplitPoint = scaleAddVec2(referenceLine.start, wallGeometry.direction, splitPosition)

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
          entityIds: secondWallEntities.map(e => e.id),
          wallNodeIds: []
        }

        const cornerIndex = wallIndex + 1
        perimeter.cornerIds.splice(cornerIndex, 0, newCornerId)

        perimeter.wallIds.splice(wallIndex, 1, wallId, newWallId)

        state.perimeterCorners[newCornerId] = newCorner
        state.perimeterWalls[newWallId] = newWall

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

        const firstWallNodeIds: WallNodeId[] = []
        const secondWallNodeIds: WallNodeId[] = []
        const iwSplit = state
        for (const nodeId of wall.wallNodeIds) {
          const node = iwSplit.wallNodes[nodeId]
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/prefer-optional-chain
          if (node && node.type === 'perimeter') {
            if (node.offsetFromCornerStart < splitPosition) {
              firstWallNodeIds.push(nodeId)
            } else {
              node.wallId = newWallId
              node.offsetFromCornerStart -= splitPosition
              secondWallNodeIds.push(nodeId)
            }
          } else {
            firstWallNodeIds.push(nodeId)
          }
        }
        wall.wallNodeIds = firstWallNodeIds
        newWall.wallNodeIds = secondWallNodeIds

        cleanUpOrphaned(state as StoreState)
        updatePerimeterGeometry(state, wall.perimeterId)

        const wall1Geom = state._perimeterWallGeometry[wallId]
        const wall2Geom = state._perimeterWallGeometry[newWallId]
        const newWall1Length = perimeter.referenceSide === 'inside' ? wall1Geom.insideLength : wall1Geom.outsideLength
        const newWall2Length = perimeter.referenceSide === 'inside' ? wall2Geom.insideLength : wall2Geom.outsideLength

        handleWallSplitConstraintsDraft(state, {
          originalWallId: wallId,
          newWallId,
          newCornerId,
          newWall1Length,
          newWall2Length
        })
      })

      return newWallId
    },

    updatePerimeterWallAssembly: (wallId: PerimeterWallId, assemblyId: PerimeterWallAssemblyId) => {
      set(state => {
        if (!(wallId in state.perimeterWalls)) throw new NotFoundError('Perimeter wall', wallId)
        const wall = state.perimeterWalls[wallId]

        wall.wallAssemblyId = assemblyId
        updateTimestampDraft(state, wallId)
      })
    },

    updatePerimeterWallThickness: (wallId: PerimeterWallId, thickness: Length) => {
      if (thickness <= 0) {
        throw new Error('Wall thickness must be greater than 0')
      }

      set(state => {
        if (!(wallId in state.perimeterWalls)) throw new NotFoundError('Perimeter wall', wallId)
        const wall = state.perimeterWalls[wallId]

        wall.thickness = thickness
        updatePerimeterGeometry(state, wall.perimeterId)
        updateTimestampDraft(state, wallId)
      })
    },

    updateAllPerimeterWallsAssembly: (perimeterId: PerimeterId, assemblyId: PerimeterWallAssemblyId) => {
      set(state => {
        if (!(perimeterId in state.perimeters)) throw new NotFoundError('Perimeter', perimeterId)
        const perimeter = state.perimeters[perimeterId]

        perimeter.wallIds.forEach(wallId => {
          const wall = state.perimeterWalls[wallId]
          wall.wallAssemblyId = assemblyId
        })

        updateTimestampDraft(state, ...perimeter.wallIds)
      })
    },

    updateAllPerimeterWallsThickness: (perimeterId: PerimeterId, thickness: Length) => {
      if (thickness <= 0) {
        throw new Error('Wall thickness must be greater than 0')
      }

      set(state => {
        if (!(perimeterId in state.perimeters)) throw new NotFoundError('Perimeter', perimeterId)
        const perimeter = state.perimeters[perimeterId]

        perimeter.wallIds.forEach(wallId => {
          const wall = state.perimeterWalls[wallId]
          wall.thickness = thickness
        })

        updatePerimeterGeometry(state, perimeterId)

        updateTimestampDraft(state, ...perimeter.wallIds)
      })
    },

    canSwitchCornerConstructedByWall: (cornerId: PerimeterCornerId): boolean => {
      const state = get()
      if (!(cornerId in state.perimeterCorners)) throw new NotFoundError('Perimeter corner', cornerId)
      const corner = state.perimeterCorners[cornerId]

      const constructingWallId = corner.constructedByWall === 'previous' ? corner.previousWallId : corner.nextWallId

      const cornerPosition = corner.constructedByWall === 'previous' ? 'end' : 'start'

      return !hasPostsInCornerArea(state, constructingWallId, cornerPosition)
    },

    updatePerimeterCornerConstructedByWall: (cornerId: PerimeterCornerId, constructedByWall: 'previous' | 'next') => {
      set(state => {
        if (!(cornerId in state.perimeterCorners)) throw new NotFoundError('Perimeter corner', cornerId)
        const corner = state.perimeterCorners[cornerId]

        const constructingWallId = corner.constructedByWall === 'previous' ? corner.previousWallId : corner.nextWallId

        const cornerPosition = corner.constructedByWall === 'previous' ? 'end' : 'start'

        if (hasPostsInCornerArea(state, constructingWallId, cornerPosition)) {
          console.warn('Cannot switch corner: wall has posts in corner area')
          return
        }

        corner.constructedByWall = constructedByWall
        updateTimestampDraft(state, cornerId)
      })
    },

    getPerimeterById: (perimeterId: PerimeterId) => {
      const state = get()
      if (!(perimeterId in state.perimeters)) throw new NotFoundError('Perimeter', perimeterId)
      const perimeter = state.perimeters[perimeterId]
      const geometry = state._perimeterGeometry[perimeterId]
      return { ...perimeter, ...geometry }
    },

    getPerimeterWallById: (wallId: PerimeterWallId) => {
      const state = get()
      if (!(wallId in state.perimeterWalls)) throw new NotFoundError('Perimeter wall', wallId)
      const wall = state.perimeterWalls[wallId]
      const geometry = state._perimeterWallGeometry[wallId]
      return { ...wall, ...geometry }
    },

    getPerimeterCornerById: (cornerId: PerimeterCornerId) => {
      const state = get()
      if (!(cornerId in state.perimeterCorners)) throw new NotFoundError('Perimeter corner', cornerId)
      const corner = state.perimeterCorners[cornerId]
      const geometry = state._perimeterCornerGeometry[cornerId]
      return { ...corner, ...geometry }
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

    getAllPerimeterWalls: () => {
      const state = get()
      return Object.values(state.perimeterWalls).map(p => ({ ...p, ...state._perimeterWallGeometry[p.id] }))
    },

    getPerimeterWallsById: (perimeterId: PerimeterId) => {
      const state = get()
      const perimeter = state.perimeters[perimeterId]
      const walls = perimeter.wallIds.map(wallId => {
        if (!(wallId in state.perimeterWalls)) throw new NotFoundError('Perimeter wall', wallId)
        const wall = state.perimeterWalls[wallId]
        const geometry = state._perimeterWallGeometry[wallId]
        return { ...wall, ...geometry }
      })
      return walls
    },

    getPerimeterCornersById: (perimeterId: PerimeterId) => {
      const state = get()
      const perimeter = state.perimeters[perimeterId]
      const corners = perimeter.cornerIds.map(cornerId => {
        if (!(cornerId in state.perimeterCorners)) throw new NotFoundError('Perimeter corner', cornerId)
        const corner = state.perimeterCorners[cornerId]
        const geometry = state._perimeterCornerGeometry[cornerId]
        return { ...corner, ...geometry }
      })
      return corners
    },

    movePerimeter: (perimeterId: PerimeterId, offset: Vec2) => {
      set(state => {
        if (!(perimeterId in state.perimeters)) return
        const perimeter = state.perimeters[perimeterId]

        for (const id of perimeter.cornerIds) {
          const corner = state.perimeterCorners[id]
          corner.referencePoint = addVec2(corner.referencePoint, offset)
        }

        for (const nodeId of perimeter.wallNodeIds) {
          const node = state.wallNodes[nodeId]
          if (node.type === 'inner') {
            node.position = addVec2(node.position, offset)
          }
        }

        updatePerimeterGeometry(state, perimeterId)
        updateAllWallNodeGeometry(state, perimeterId)

        updateTimestampDraft(state, perimeterId, ...perimeter.cornerIds)
      })

      return true
    },

    updatePerimeterBoundary: (perimeterId: PerimeterId, newBoundary: Vec2[]) => {
      if (newBoundary.length < 3) {
        return false
      }

      const newPolygon = ensurePolygonIsClockwise({ points: newBoundary })

      if (wouldClosingPolygonSelfIntersect(newPolygon)) {
        return false
      }

      let success = false
      set(state => {
        if (!(perimeterId in state.perimeters)) throw new NotFoundError('Perimeter', perimeterId)
        const perimeter = state.perimeters[perimeterId]
        if (perimeter.cornerIds.length !== newPolygon.points.length) return

        for (let i = 0; i < perimeter.cornerIds.length; i++) {
          const corner = state.perimeterCorners[perimeter.cornerIds[i]]
          corner.referencePoint = newPolygon.points[i]
        }

        updatePerimeterGeometry(state, perimeterId)

        updateTimestampDraft(state, perimeterId, ...perimeter.cornerIds)
        success = true
      })

      return success
    },

    setWallBaseRingBeam: (wallId: PerimeterWallId, assemblyId: RingBeamAssemblyId) => {
      set(state => {
        if (!(wallId in state.perimeterWalls)) return
        const wall = state.perimeterWalls[wallId]

        wall.baseRingBeamAssemblyId = assemblyId
        updateTimestampDraft(state, wallId)
      })
    },

    setWallTopRingBeam: (wallId: PerimeterWallId, assemblyId: RingBeamAssemblyId) => {
      set(state => {
        if (!(wallId in state.perimeterWalls)) return
        const wall = state.perimeterWalls[wallId]

        wall.topRingBeamAssemblyId = assemblyId
        updateTimestampDraft(state, wallId)
      })
    },

    removeWallBaseRingBeam: (wallId: PerimeterWallId) => {
      set(state => {
        if (!(wallId in state.perimeterWalls)) return
        const wall = state.perimeterWalls[wallId]

        wall.baseRingBeamAssemblyId = undefined
        updateTimestampDraft(state, wallId)
      })
    },

    removeWallTopRingBeam: (wallId: PerimeterWallId) => {
      set(state => {
        if (!(wallId in state.perimeterWalls)) return
        const wall = state.perimeterWalls[wallId]

        wall.topRingBeamAssemblyId = undefined
        updateTimestampDraft(state, wallId)
      })
    },

    setAllWallsBaseRingBeam: (perimeterId: PerimeterId, assemblyId: RingBeamAssemblyId) => {
      set(state => {
        if (!(perimeterId in state.perimeters)) return
        const perimeter = state.perimeters[perimeterId]

        perimeter.wallIds.forEach(wallId => {
          const wall = state.perimeterWalls[wallId]
          wall.baseRingBeamAssemblyId = assemblyId
        })

        updateTimestampDraft(state, ...perimeter.wallIds)
      })
    },

    setAllWallsTopRingBeam: (perimeterId: PerimeterId, assemblyId: RingBeamAssemblyId) => {
      set(state => {
        if (!(perimeterId in state.perimeters)) return
        const perimeter = state.perimeters[perimeterId]

        perimeter.wallIds.forEach(wallId => {
          const wall = state.perimeterWalls[wallId]
          wall.topRingBeamAssemblyId = assemblyId
        })

        updateTimestampDraft(state, ...perimeter.wallIds)
      })
    },

    removeAllWallsBaseRingBeam: (perimeterId: PerimeterId) => {
      set(state => {
        if (!(perimeterId in state.perimeters)) return
        const perimeter = state.perimeters[perimeterId]

        perimeter.wallIds.forEach(wallId => {
          const wall = state.perimeterWalls[wallId]
          wall.baseRingBeamAssemblyId = undefined
        })

        updateTimestampDraft(state, ...perimeter.wallIds)
      })
    },

    removeAllWallsTopRingBeam: (perimeterId: PerimeterId) => {
      set(state => {
        if (!(perimeterId in state.perimeters)) return
        const perimeter = state.perimeters[perimeterId]

        perimeter.wallIds.forEach(wallId => {
          const wall = state.perimeterWalls[wallId]
          wall.topRingBeamAssemblyId = undefined
        })

        updateTimestampDraft(state, ...perimeter.wallIds)
      })
    },

    setPerimeterReferenceSide: (perimeterId: PerimeterId, referenceSide: PerimeterReferenceSide) => {
      set(state => {
        if (!(perimeterId in state.perimeters)) return
        const perimeter = state.perimeters[perimeterId]
        if (perimeter.referenceSide === referenceSide) return

        for (const id of perimeter.cornerIds) {
          const corner = state.perimeterCorners[id]
          const geometry = state._perimeterCornerGeometry[id]
          corner.referencePoint =
            referenceSide === 'inside' ? copyVec2(geometry.insidePoint) : copyVec2(geometry.outsidePoint)
        }

        perimeter.referenceSide = referenceSide
        updatePerimeterGeometry(state, perimeterId)

        updateTimestampDraft(state, perimeterId, ...perimeter.cornerIds)
      })
    }
  }
})

const removeCornerAndMergeWalls = (state: StoreState, perimeter: Perimeter, corner: PerimeterCorner): void => {
  const wall1 = state.perimeterWalls[corner.previousWallId]
  const wall2 = state.perimeterWalls[corner.nextWallId]
  const mergedThickness = Math.max(wall1.thickness, wall2.thickness)

  const geometry = state._perimeterCornerGeometry[corner.id]
  const isColinear = geometry.interiorAngle === 180

  const mergedId = createPerimeterWallId()

  const captured = captureConstraintsForMerge(state, {
    removedWallIds: [wall1.id, wall2.id],
    removedCornerIds: [corner.id]
  })

  let entityIds: WallEntityId[] = []
  let wallNodeIds: WallNodeId[] = []
  if (isColinear) {
    entityIds = [...wall1.entityIds, ...wall2.entityIds]
    wallNodeIds = [...wall1.wallNodeIds, ...wall2.wallNodeIds]
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
    for (const nodeId of wall1.wallNodeIds) {
      const node = state.wallNodes[nodeId]
      if (node.type === 'perimeter') {
        node.wallId = mergedId
      }
    }
    for (const nodeId of wall2.wallNodeIds) {
      const node = state.wallNodes[nodeId]
      if (node.type === 'perimeter') {
        node.wallId = mergedId
        node.offsetFromCornerStart += wall1Geometry.wallLength
      }
    }
  }

  const mergedWall: PerimeterWall = {
    id: mergedId,
    perimeterId: corner.perimeterId,
    startCornerId: wall1.startCornerId,
    endCornerId: wall2.endCornerId,
    thickness: mergedThickness,
    wallAssemblyId: wall1.wallAssemblyId,
    entityIds,
    wallNodeIds
  }

  perimeter.cornerIds = perimeter.cornerIds.filter(id => id !== corner.id)
  perimeter.wallIds = perimeter.wallIds
    .map(id => (id === wall1.id ? mergedWall.id : id === wall2.id ? null : id))
    .filter(id => id != null)

  state.perimeterCorners[wall1.startCornerId].nextWallId = mergedWall.id
  state.perimeterCorners[wall2.endCornerId].previousWallId = mergedWall.id

  state.perimeterWalls[mergedWall.id] = mergedWall

  cleanUpOrphaned(state)
  updatePerimeterGeometry(state, corner.perimeterId)

  const mergedGeom = state._perimeterWallGeometry[mergedId]
  const preferredConstraintSide: 'left' | 'right' = perimeter.referenceSide === 'inside' ? 'right' : 'left'
  applyMergedConstraintsDraft(state, captured, {
    mergedWallId: mergedId,
    removedWallIds: [wall1.id, wall2.id],
    isColinear,
    preferredConstraintSide,
    mergedInsideLength: mergedGeom.insideLength,
    mergedOutsideLength: mergedGeom.outsideLength
  })
}

const removeWallAndMergeAdjacent = (state: StoreState, wall: PerimeterWall): void => {
  const perimeter = state.perimeters[wall.perimeterId]
  const startCorner = state.perimeterCorners[wall.startCornerId]
  const endCorner = state.perimeterCorners[wall.endCornerId]
  const prevWall = state.perimeterWalls[startCorner.previousWallId]
  const nextWall = state.perimeterWalls[endCorner.nextWallId]
  const newStartCorner = state.perimeterCorners[prevWall.startCornerId]
  const newEndCorner = state.perimeterCorners[nextWall.endCornerId]

  const startGeom = state._perimeterCornerGeometry[startCorner.id]
  const endGeom = state._perimeterCornerGeometry[endCorner.id]
  const isColinear = startGeom.interiorAngle === 180 && endGeom.interiorAngle === 180

  const captured = captureConstraintsForMerge(state, {
    removedWallIds: [prevWall.id, wall.id, nextWall.id],
    removedCornerIds: [startCorner.id, endCorner.id]
  })

  perimeter.cornerIds = perimeter.cornerIds.filter(id => id !== startCorner.id && id !== endCorner.id)

  const mergedThickness = Math.max(prevWall.thickness, nextWall.thickness)
  const mergedWall: PerimeterWall = {
    id: createPerimeterWallId(),
    perimeterId: perimeter.id,
    startCornerId: newStartCorner.id,
    endCornerId: newEndCorner.id,
    thickness: mergedThickness,
    wallAssemblyId: prevWall.wallAssemblyId,
    entityIds: [],
    wallNodeIds: []
  }
  state.perimeterWalls[mergedWall.id] = mergedWall

  perimeter.wallIds = perimeter.wallIds
    .map(id => (id === prevWall.id ? mergedWall.id : id === wall.id || id === nextWall.id ? null : id))
    .filter(id => id != null)

  newStartCorner.nextWallId = mergedWall.id
  newEndCorner.previousWallId = mergedWall.id

  cleanUpOrphaned(state)
  updatePerimeterGeometry(state, perimeter.id)

  const mergedGeom = state._perimeterWallGeometry[mergedWall.id]
  const preferredConstraintSide: 'left' | 'right' = perimeter.referenceSide === 'inside' ? 'right' : 'left'
  applyMergedConstraintsDraft(state, captured, {
    mergedWallId: mergedWall.id,
    removedWallIds: [prevWall.id, wall.id, nextWall.id],
    isColinear,
    preferredConstraintSide,
    mergedInsideLength: mergedGeom.insideLength,
    mergedOutsideLength: mergedGeom.outsideLength
  })
}
