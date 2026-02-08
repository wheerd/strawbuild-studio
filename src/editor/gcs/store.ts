import { type Constraint, type SketchLine, type SketchPoint } from '@salusoft89/planegcs'
import { create } from 'zustand'

import type { ConstraintInput, PerimeterCornerId, PerimeterId, WallId } from '@/building/model'
import type { PerimeterCornerWithGeometry } from '@/building/model/perimeters'
import { getModelActions } from '@/building/store'
import { referenceSideToConstraintSide } from '@/editor/gcs/constraintGenerator'
import { scaleAddVec2 } from '@/shared/geometry/2d'

import {
  type TranslationContext,
  buildingConstraintKey,
  getReferencedCornerIds,
  getReferencedWallIds,
  nodeNonRefSidePointForNextWall,
  nodeNonRefSidePointForPrevWall,
  nodeRefSidePointId,
  translateBuildingConstraint,
  translatedConstraintIds
} from './constraintTranslator'

interface PerimeterRegistryEntry {
  pointIds: string[]
  lineIds: string[]
  constraintIds: string[]
}

interface GcsStoreState {
  points: Record<string, SketchPoint>
  lines: SketchLine[]
  constraints: Record<string, Constraint>
  buildingConstraints: Record<string, ConstraintInput>
  perimeterRegistry: Record<PerimeterId, PerimeterRegistryEntry>
}

interface GcsStoreActions {
  addPerimeterGeometry: (perimeterId: PerimeterId) => void
  removePerimeterGeometry: (perimeterId: PerimeterId) => void

  addPoint: (id: string, x: number, y: number, fixed?: boolean) => void
  addLine: (id: string, p1Id: string, p2Id: string) => void
  addConstraint: (constraint: Constraint) => void

  updatePointPosition: (id: string, x: number, y: number) => void

  removePoints: (ids: string[]) => void
  removeLines: (ids: string[]) => void
  removeConstraints: (ids: string[]) => void

  addBuildingConstraint: (constraint: ConstraintInput) => string
  removeBuildingConstraint: (key: string) => void
}

type GcsStore = GcsStoreState & { actions: GcsStoreActions }

const useGcsStore = create<GcsStore>()((set, get) => ({
  points: {},
  lines: [],
  constraints: {},
  buildingConstraints: {},
  gcs: null,
  drag: null,
  cornerOrderMap: new Map(),
  perimeterRegistry: {},

  actions: {
    addPoint: (id, x, y, fixed = false) => {
      set(state => ({
        points: { ...state.points, [id]: { id, type: 'point', x, y, fixed } }
      }))
    },

    addLine: (id, p1Id, p2Id) => {
      set(state => ({
        lines: [...state.lines, { id, type: 'line', p1_id: p1Id, p2_id: p2Id }]
      }))
    },

    addConstraint: constraint => {
      set(state => ({
        constraints: { ...state.constraints, [constraint.id]: { ...constraint } }
      }))
    },

    updatePointPosition: (id, x, y) => {
      set(state => ({
        points: { ...state.points, [id]: { ...state.points[id], x, y } }
      }))
    },

    removePoints: ids => {
      if (ids.length === 0) return
      const toRemove = new Set(ids)
      set(state => {
        const newPoints = { ...state.points }
        for (const id of toRemove) {
          delete newPoints[id]
        }
        return { points: newPoints }
      })
    },

    removeLines: ids => {
      if (ids.length === 0) return
      const toRemove = new Set(ids)
      set(state => ({
        lines: state.lines.filter(l => !toRemove.has(l.id))
      }))
    },

    removeConstraints: ids => {
      if (ids.length === 0) return
      const toRemove = new Set(ids)
      set(state => {
        const newConstraints = { ...state.constraints }
        for (const id of toRemove) {
          delete newConstraints[id]
        }
        return { constraints: newConstraints }
      })
    },

    addBuildingConstraint: constraint => {
      const state = get()
      const key = buildingConstraintKey(constraint)

      // Check for duplicate
      if (key in state.buildingConstraints) {
        console.warn(`Building constraint with key "${key}" already exists, skipping.`)
        return key
      }

      // Validate that all referenced corners exist as GCS points
      const cornerIds = getReferencedCornerIds(constraint)
      for (const cornerId of cornerIds) {
        const refId = `corner_${cornerId}_ref`
        if (!(refId in state.points)) {
          throw new Error(`Cannot add building constraint: corner "${cornerId}" not found in GCS points.`)
        }
      }

      // Validate that all referenced walls exist as GCS lines
      const wallIds = getReferencedWallIds(constraint)
      for (const wallId of wallIds) {
        const refLineId = `wall_${wallId}_ref`
        if (!state.lines.some(l => l.id === refLineId)) {
          throw new Error(`Cannot add building constraint: wall "${wallId}" not found in GCS lines.`)
        }
      }

      // Translate and add the planegcs constraints
      const modelActionsRef = getModelActions()
      const context: TranslationContext = {
        getLineStartPointId: (lineId: string) => {
          const line = state.lines.find(l => l.id === lineId)
          return line?.p1_id
        },
        getWallCornerIds: (wallId: WallId) => {
          try {
            const wall = modelActionsRef.getPerimeterWallById(wallId as `outwall_${string}`)
            return { startCornerId: wall.startCornerId, endCornerId: wall.endCornerId }
          } catch {
            return undefined
          }
        },
        getCornerAdjacentWallIds: (cornerId: PerimeterCornerId) => {
          try {
            const corner = modelActionsRef.getPerimeterCornerById(cornerId)
            return { previousWallId: corner.previousWallId, nextWallId: corner.nextWallId }
          } catch {
            return undefined
          }
        },
        getReferenceSide: (cornerId: PerimeterCornerId) => {
          const corner = modelActionsRef.getPerimeterCornerById(cornerId)
          const perimeter = modelActionsRef.getPerimeterById(corner.perimeterId)
          return referenceSideToConstraintSide(perimeter.referenceSide)
        }
      }

      const translated = translateBuildingConstraint(constraint, key, context)

      set(state => {
        const newConstraints = { ...state.constraints }
        for (const c of translated) {
          newConstraints[c.id] = c
        }
        return {
          buildingConstraints: { ...state.buildingConstraints, [key]: constraint },
          constraints: newConstraints
        }
      })

      return key
    },

    removeBuildingConstraint: key => {
      const state = get()

      if (!(key in state.buildingConstraints)) {
        console.warn(`Building constraint with key "${key}" not found, skipping removal.`)
        return
      }

      const idsToRemove = new Set(translatedConstraintIds(key))

      set(state => {
        const newConstraints = { ...state.constraints }
        for (const id of idsToRemove) {
          delete newConstraints[id]
        }

        const { [key]: _, ...remainingBuildingConstraints } = state.buildingConstraints
        return {
          buildingConstraints: remainingBuildingConstraints,
          constraints: newConstraints
        }
      })
    },

    addPerimeterGeometry: perimeterId => {
      const state = get()
      const { actions } = state

      // If already tracked, remove first (graceful upsert)
      if (perimeterId in state.perimeterRegistry) {
        actions.removePerimeterGeometry(perimeterId)
      }

      const modelActions = getModelActions()
      const corners = modelActions.getPerimeterCornersById(perimeterId)
      const walls = modelActions.getPerimeterWallsById(perimeterId)

      const entry: PerimeterRegistryEntry = {
        pointIds: [],
        lineIds: [],
        constraintIds: []
      }

      // Build corner lookup map first
      const cornerGeomMap = new Map<PerimeterCornerId, PerimeterCornerWithGeometry>()
      for (const corner of corners) {
        cornerGeomMap.set(corner.id, corner)
      }

      // Add points for each corner
      for (const corner of corners) {
        const refPointId = nodeRefSidePointId(corner.id)
        const nonRefPrevId = nodeNonRefSidePointForPrevWall(corner.id)
        const nonRefNextId = nodeNonRefSidePointForNextWall(corner.id)

        const isRefInside = modelActions.getPerimeterById(perimeterId).referenceSide === 'inside'
        const refPos = isRefInside ? corner.insidePoint : corner.outsidePoint
        const nonRefPos = isRefInside ? corner.outsidePoint : corner.insidePoint

        // Add reference side point
        actions.addPoint(refPointId, refPos[0], refPos[1], false)

        if (corner.interiorAngle !== 180) {
          actions.addPoint(nonRefPrevId, nonRefPos[0], nonRefPos[1], false)
          actions.addPoint(nonRefNextId, nonRefPos[0], nonRefPos[1], false)
        } else {
          // Add non-reference side points with wall-specific thickness offsets
          const prevWall = walls.find(w => w.endCornerId === corner.id)
          const nextWall = walls.find(w => w.startCornerId === corner.id)

          if (prevWall) {
            const prevPos = scaleAddVec2(
              refPos,
              prevWall.outsideDirection,
              isRefInside ? prevWall.thickness : -prevWall.thickness
            )
            actions.addPoint(nonRefPrevId, prevPos[0], prevPos[1], false)
          }

          if (nextWall) {
            const nextPos = scaleAddVec2(
              refPos,
              nextWall.outsideDirection,
              isRefInside ? nextWall.thickness : -nextWall.thickness
            )
            actions.addPoint(nonRefNextId, nextPos[0], nextPos[1], false)
          }
        }

        entry.pointIds.push(refPointId, nonRefPrevId, nonRefNextId)
      }

      // Add lines for each wall
      for (const wall of walls) {
        const startRef = `corner_${wall.startCornerId}_ref`
        const startNonRef = `corner_${wall.startCornerId}_nonref_next`
        const endRef = `corner_${wall.endCornerId}_ref`
        const endNonRef = `corner_${wall.endCornerId}_nonref_prev`

        const refLineId = `wall_${wall.id}_ref`
        const nonRefLineId = `wall_${wall.id}_nonref`

        actions.addLine(refLineId, startRef, endRef)
        actions.addLine(nonRefLineId, startNonRef, endNonRef)
        entry.lineIds.push(refLineId, nonRefLineId)
        const parallelId = `parallel_${wall.id}`
        actions.addConstraint({
          id: parallelId,
          type: 'parallel',
          l1_id: refLineId,
          l2_id: nonRefLineId
        })
        entry.constraintIds.push(parallelId)

        const thicknessId = `thickness_${wall.id}`
        actions.addConstraint({
          id: thicknessId,
          type: 'p2l_distance',
          p_id: startNonRef,
          l_id: refLineId,
          distance: wall.thickness
        })
        entry.constraintIds.push(thicknessId)
      }

      // Add corner structure constraints for non-reference side
      for (const corner of corners) {
        const refPointId = `corner_${corner.id}_ref`
        const nonRefPrevId = `corner_${corner.id}_nonref_prev`
        const nonRefNextId = `corner_${corner.id}_nonref_next`

        const prevWall = walls.find(w => w.endCornerId === corner.id)
        const nextWall = walls.find(w => w.startCornerId === corner.id)

        if (!prevWall || !nextWall) continue

        const isColinear = corner.interiorAngle === 180

        if (isColinear) {
          const prevCornerId = prevWall.startCornerId
          const prevCornerRefId = `corner_${prevCornerId}_ref`

          const perp1Id = `corner_${corner.id}_nonref_perp1`
          actions.addConstraint({
            id: perp1Id,
            type: 'perpendicular_pppp',
            l1p1_id: prevCornerRefId,
            l1p2_id: refPointId,
            l2p1_id: refPointId,
            l2p2_id: nonRefPrevId,
            driving: true
          })
          entry.constraintIds.push(perp1Id)

          const nextCornerId = nextWall.endCornerId
          const nextCornerRefId = `corner_${nextCornerId}_ref`

          const perp2Id = `corner_${corner.id}_nonref_perp2`
          actions.addConstraint({
            id: perp2Id,
            type: 'perpendicular_pppp',
            l1p1_id: refPointId,
            l1p2_id: nextCornerRefId,
            l2p1_id: refPointId,
            l2p2_id: nonRefNextId,
            driving: true
          })
          entry.constraintIds.push(perp2Id)
        } else {
          const equalityId = `corner_${corner.id}_nonref_eq`
          actions.addConstraint({
            id: equalityId,
            type: 'p2p_coincident',
            p1_id: nonRefPrevId,
            p2_id: nonRefNextId,
            driving: true
          })
          entry.constraintIds.push(equalityId)
        }
      }

      set(state => ({
        perimeterRegistry: { ...state.perimeterRegistry, [perimeterId]: entry }
      }))
    },

    removePerimeterGeometry: perimeterId => {
      const state = get()
      const { actions } = state
      const entry = state.perimeterRegistry[perimeterId]

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!entry) {
        console.warn(`Perimeter "${perimeterId}" not found in GCS registry, skipping removal.`)
        return
      }

      // Remove structural constraints, lines, and points
      actions.removeConstraints(entry.constraintIds)
      actions.removeLines(entry.lineIds)
      actions.removePoints(entry.pointIds)

      set(state => {
        const { [perimeterId]: _, ...remainingRegistry } = state.perimeterRegistry
        return {
          perimeterRegistry: remainingRegistry,
          drag: null
        }
      })
    }
  }
}))

export const useGcsPoints = (): GcsStoreState['points'] => useGcsStore(state => state.points)
export const useGcsLines = (): GcsStoreState['lines'] => useGcsStore(state => state.lines)
export const useGcsBuildingConstraints = (): GcsStoreState['buildingConstraints'] =>
  useGcsStore(state => state.buildingConstraints)
export const useGcsPerimeterRegistry = (): GcsStoreState['perimeterRegistry'] =>
  useGcsStore(state => state.perimeterRegistry)
export const useGcsActions = (): GcsStoreActions => useGcsStore(state => state.actions)

// Non-hook getters for use outside React components (e.g. in tests or imperative code)
export const getGcsActions = (): GcsStoreActions => useGcsStore.getState().actions
export const getGcsState = (): GcsStoreState => useGcsStore.getState()
