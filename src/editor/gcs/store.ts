import { type Constraint, type SketchLine, type SketchPoint } from '@salusoft89/planegcs'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import type {
  Constraint as BuildingConstraint,
  ConstraintId,
  PerimeterCornerId,
  PerimeterId,
  WallId
} from '@/building/model'
import type { PerimeterCornerWithGeometry } from '@/building/model/perimeters'
import type { OpeningWithGeometry, WallPostWithGeometry } from '@/building/model/wallEntities'
import { getModelActions } from '@/building/store'
import { referenceSideToConstraintSide } from '@/editor/gcs/constraintGenerator'
import { midpoint, scaleAddVec2 } from '@/shared/geometry/2d'

import {
  type TranslationContext,
  getReferencedCornerIds,
  getReferencedWallIds,
  nodeNonRefSidePointForNextWall,
  nodeNonRefSidePointForPrevWall,
  nodeRefSidePointId,
  translateBuildingConstraint,
  translatedConstraintIds,
  wallEntityPointId,
  wallNonRefLineId,
  wallRefLineId
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
  buildingConstraints: Record<string, BuildingConstraint>
  perimeterRegistry: Record<PerimeterId, PerimeterRegistryEntry>
  conflictingConstraintIds: Set<string>
  redundantConstraintIds: Set<string>
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

  addBuildingConstraint: (constraint: BuildingConstraint) => void
  removeBuildingConstraint: (id: ConstraintId) => void
  setConstraintStatus: (conflicting: string[], redundant: string[]) => void
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
  conflictingConstraintIds: new Set(),
  redundantConstraintIds: new Set(),

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

      // Check for duplicate
      if (constraint.id in state.buildingConstraints) {
        console.warn(`Building constraint with id "${constraint.id}" already exists, skipping.`)
        return constraint.id
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

      const translated = translateBuildingConstraint(constraint, constraint.id, context)

      set(state => {
        const newConstraints = { ...state.constraints }
        for (const c of translated) {
          newConstraints[c.id] = c
        }
        return {
          buildingConstraints: { ...state.buildingConstraints, [constraint.id]: constraint },
          constraints: newConstraints
        }
      })
    },

    removeBuildingConstraint: id => {
      const state = get()

      if (!(id in state.buildingConstraints)) {
        console.warn(`Building constraint with key "${id}" not found, skipping removal.`)
        return
      }

      const idsToRemove = new Set(translatedConstraintIds(id))

      set(state => {
        const newConstraints = { ...state.constraints }
        for (const id of idsToRemove) {
          delete newConstraints[id]
        }

        const { [id]: _, ...remainingBuildingConstraints } = state.buildingConstraints
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

      /**
       * Helper function to add wall entity (opening/post) geometry and structural constraints.
       *
       * @param entity - The wall entity with geometry
       * @param refLineId - The GCS line ID for the wall's reference side
       * @param isRefInside - Whether the reference side is the inside of the perimeter
       * @param entry - The perimeter registry entry to track created IDs
       */
      const addWallEntityGeometry = (
        entity: OpeningWithGeometry | WallPostWithGeometry,
        isRefInside: boolean,
        entry: PerimeterRegistryEntry
      ): void => {
        const { insideLine, outsideLine, width } = entity

        // Calculate center points
        const insideCenter = midpoint(insideLine.start, insideLine.end)
        const outsideCenter = midpoint(outsideLine.start, outsideLine.end)

        // Determine ref vs nonref based on which side is "inside"
        const ref = isRefInside
          ? { start: insideLine.start, center: insideCenter, end: insideLine.end }
          : { start: outsideLine.start, center: outsideCenter, end: outsideLine.end }

        const nonref = isRefInside
          ? { start: outsideLine.start, center: outsideCenter, end: outsideLine.end }
          : { start: insideLine.start, center: insideCenter, end: insideLine.end }

        // Point IDs
        const startRef = wallEntityPointId(entity.id, 'start', true)
        const centerRef = wallEntityPointId(entity.id, 'center', true)
        const endRef = wallEntityPointId(entity.id, 'end', true)
        const startNonRef = wallEntityPointId(entity.id, 'start', false)
        const centerNonRef = wallEntityPointId(entity.id, 'center', false)
        const endNonRef = wallEntityPointId(entity.id, 'end', false)

        // Add all 6 points (start/center/end for ref and nonref sides)
        actions.addPoint(startRef, ref.start[0], ref.start[1], false)
        actions.addPoint(centerRef, ref.center[0], ref.center[1], false)
        actions.addPoint(endRef, ref.end[0], ref.end[1], false)
        actions.addPoint(startNonRef, nonref.start[0], nonref.start[1], false)
        actions.addPoint(centerNonRef, nonref.center[0], nonref.center[1], false)
        actions.addPoint(endNonRef, nonref.end[0], nonref.end[1], false)

        entry.pointIds.push(startRef, centerRef, endRef, startNonRef, centerNonRef, endNonRef)

        // Constraint: All points must be on the wall line
        const refLineId = wallRefLineId(entity.wallId)
        const nonrefLineId = wallNonRefLineId(entity.wallId)

        const startOnRef = `${entity.id}_start_on_ref`
        const centerOnRef = `${entity.id}_center_on_ref`
        const endOnRef = `${entity.id}_end_on_ref`
        const startOnNonRef = `${entity.id}_start_on_nonref`
        const centerOnNonRef = `${entity.id}_center_on_nonref`
        const endOnNonRef = `${entity.id}_end_on_nonref`

        actions.addConstraint({ id: startOnRef, type: 'point_on_line_pl', p_id: startRef, l_id: refLineId })
        actions.addConstraint({ id: centerOnRef, type: 'point_on_line_pl', p_id: centerRef, l_id: refLineId })
        actions.addConstraint({ id: endOnRef, type: 'point_on_line_pl', p_id: endRef, l_id: refLineId })
        actions.addConstraint({ id: startOnNonRef, type: 'point_on_line_pl', p_id: startNonRef, l_id: nonrefLineId })
        actions.addConstraint({ id: centerOnNonRef, type: 'point_on_line_pl', p_id: centerNonRef, l_id: nonrefLineId })
        actions.addConstraint({ id: endOnNonRef, type: 'point_on_line_pl', p_id: endNonRef, l_id: nonrefLineId })

        entry.constraintIds.push(startOnRef, centerOnRef, endOnRef, startOnNonRef, centerOnNonRef, endOnNonRef)

        // Constraint: Center point must be on perpendicular bisector of start and end
        const centerBisectorRef = `${entity.id}_center_bisector_ref`
        const centerBisectorNonRef = `${entity.id}_center_bisector_nonref`

        actions.addConstraint({
          id: centerBisectorRef,
          type: 'point_on_perp_bisector_ppp',
          p_id: centerRef,
          lp1_id: startRef,
          lp2_id: endRef
        })
        actions.addConstraint({
          id: centerBisectorNonRef,
          type: 'point_on_perp_bisector_ppp',
          p_id: centerNonRef,
          lp1_id: startNonRef,
          lp2_id: endNonRef
        })

        entry.constraintIds.push(centerBisectorRef, centerBisectorNonRef)

        // Constraint: Width must be maintained (distance between start and end)
        const widthRef = `${entity.id}_width_ref`

        actions.addConstraint({ id: widthRef, type: 'p2p_distance', p1_id: startRef, p2_id: endRef, distance: width })

        entry.constraintIds.push(widthRef)

        // Constraint: Ref and nonref points must be aligned perpendicularly to wall
        const alignCenter = `${entity.id}_align_center`

        actions.addConstraint({
          id: alignCenter,
          type: 'perpendicular_pppp',
          l1p1_id: startRef,
          l1p2_id: endRef,
          l2p1_id: centerRef,
          l2p2_id: centerNonRef,
          driving: true
        })

        entry.constraintIds.push(alignCenter)
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

      const isRefInside = modelActions.getPerimeterById(perimeterId).referenceSide === 'inside'

      // Add points for each corner
      for (const corner of corners) {
        const refPointId = nodeRefSidePointId(corner.id)
        const nonRefPrevId = nodeNonRefSidePointForPrevWall(corner.id)
        const nonRefNextId = nodeNonRefSidePointForNextWall(corner.id)

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

        for (const opening of modelActions.getWallOpeningsById(wall.id)) {
          addWallEntityGeometry(opening, isRefInside, entry)
        }

        for (const post of modelActions.getWallPostsById(wall.id)) {
          addWallEntityGeometry(post, isRefInside, entry)
        }
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

      if (!(perimeterId in state.perimeterRegistry)) {
        console.warn(`Perimeter "${perimeterId}" not found in GCS registry, skipping removal.`)
        return
      }

      const entry = state.perimeterRegistry[perimeterId]
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
    },

    setConstraintStatus: (conflicting, redundant) => {
      set(() => ({
        conflictingConstraintIds: new Set(conflicting),
        redundantConstraintIds: new Set(redundant)
      }))
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

export const useConstraintStatus = (
  constraintId: ConstraintId | undefined
): {
  conflicting: boolean
  redundant: boolean
} => {
  return useGcsStore(
    useShallow(state => {
      if (!constraintId) {
        return { conflicting: false, redundant: false }
      }
      const possibleIds = translatedConstraintIds(constraintId)
      return {
        conflicting: possibleIds.some(id => state.conflictingConstraintIds.has(id)),
        redundant: possibleIds.some(id => state.redundantConstraintIds.has(id))
      }
    })
  )
}

export const useAllConstraintStatus = (): {
  conflictingCount: number
  redundantCount: number
} => {
  return useGcsStore(
    useShallow(state => ({
      conflictingCount: state.conflictingConstraintIds.size,
      redundantCount: state.redundantConstraintIds.size
    }))
  )
}

export const getGcsActions = (): GcsStoreActions => useGcsStore.getState().actions
export const getGcsState = (): GcsStoreState => useGcsStore.getState()
