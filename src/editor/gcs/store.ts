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
import { type Vec2, midpoint, projectVec2, scaleAddVec2 } from '@/shared/geometry/2d'

import {
  type TranslationContext,
  getReferencedCornerIds,
  getReferencedWallIds,
  nodeNonRefSidePointForNextWall,
  nodeNonRefSidePointForPrevWall,
  nodeRefSidePointId,
  translateBuildingConstraint,
  translatedConstraintIds,
  wallEntityOnLineConstraintId,
  wallEntityPointId,
  wallEntityWidthConstraintId,
  wallNonRefLineId,
  wallNonRefSideProjectedPoint,
  wallRefLineId
} from './constraintTranslator'

interface PerimeterRegistryEntry {
  pointIds: string[]
  lineIds: string[]
  constraintIds: string[]
}

interface GcsStoreState {
  points: Record<string, SketchPoint>
  tmpPoints?: Record<string, SketchPoint>
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

  addPoint: (id: string, pos: Vec2, fixed?: boolean) => void
  addLine: (id: string, p1Id: string, p2Id: string) => void
  addConstraint: (constraint: Constraint) => void

  updatePointPosition: (id: string, pos: Vec2) => void

  removePoints: (ids: string[]) => void
  removeLines: (ids: string[]) => void
  removeConstraints: (ids: string[]) => void

  addBuildingConstraint: (constraint: BuildingConstraint) => void
  removeBuildingConstraint: (id: ConstraintId) => void
  setConstraintStatus: (conflicting: string[], redundant: string[]) => void

  setTmpPoints: (tmpPoints?: Record<string, SketchPoint>) => void
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
    addPoint: (id, pos, fixed = false) => {
      set(state => ({
        points: { ...state.points, [id]: { id, type: 'point', x: pos[0], y: pos[1], fixed } }
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

    updatePointPosition: (id, pos) => {
      set(state => ({
        points: { ...state.points, [id]: { ...state.points[id], x: pos[0], y: pos[1] } }
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
        actions.addPoint(refPointId, refPos, false)

        if (corner.interiorAngle !== 180) {
          actions.addPoint(nonRefPrevId, nonRefPos, false)
          actions.addPoint(nonRefNextId, nonRefPos, false)
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
            actions.addPoint(nonRefPrevId, prevPos, false)
          }

          if (nextWall) {
            const nextPos = scaleAddVec2(
              refPos,
              nextWall.outsideDirection,
              isRefInside ? nextWall.thickness : -nextWall.thickness
            )
            actions.addPoint(nonRefNextId, nextPos, false)
          }
        }

        entry.pointIds.push(refPointId, nonRefPrevId, nonRefNextId)
      }

      const addWallEntityGeometry = (
        entity: OpeningWithGeometry | WallPostWithGeometry,
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

        // Point IDs
        const startRef = wallEntityPointId(entity.id, 'start')
        const centerRef = wallEntityPointId(entity.id, 'center')
        const endRef = wallEntityPointId(entity.id, 'end')

        // Add all 3 points (start/center/end for ref side)
        actions.addPoint(startRef, ref.start, false)
        actions.addPoint(centerRef, ref.center, false)
        actions.addPoint(endRef, ref.end, false)

        entry.pointIds.push(startRef, centerRef, endRef)

        // Constraint: All points must be on the wall line
        const refLineId = wallRefLineId(entity.wallId)

        const startOnRef = wallEntityOnLineConstraintId(entity.id, 'start')
        const centerOnRef = wallEntityOnLineConstraintId(entity.id, 'center')
        const endOnRef = wallEntityOnLineConstraintId(entity.id, 'end')

        actions.addConstraint({ id: startOnRef, type: 'point_on_line_pl', p_id: startRef, l_id: refLineId })
        actions.addConstraint({ id: centerOnRef, type: 'point_on_line_pl', p_id: centerRef, l_id: refLineId })
        actions.addConstraint({ id: endOnRef, type: 'point_on_line_pl', p_id: endRef, l_id: refLineId })

        entry.constraintIds.push(startOnRef, centerOnRef, endOnRef)

        // Constraint: Center point must be on perpendicular bisector of start and end
        const centerBisectorRef = `${entity.id}_center_bisector_ref`
        actions.addConstraint({
          id: centerBisectorRef,
          type: 'point_on_perp_bisector_ppp',
          p_id: centerRef,
          lp1_id: startRef,
          lp2_id: endRef
        })
        entry.constraintIds.push(centerBisectorRef)

        // Constraint: Width must be maintained (distance between start and end)
        const widthRef = wallEntityWidthConstraintId(entity.id)
        actions.addConstraint({ id: widthRef, type: 'p2p_distance', p1_id: startRef, p2_id: endRef, distance: width })
        entry.constraintIds.push(widthRef)
      }

      for (const wall of walls) {
        const startRef = nodeRefSidePointId(wall.startCornerId)
        const startNonRef = nodeNonRefSidePointForNextWall(wall.startCornerId)
        const endRef = nodeRefSidePointId(wall.endCornerId)
        const endNonRef = nodeNonRefSidePointForPrevWall(wall.endCornerId)

        const startNonRefProj = wallNonRefSideProjectedPoint(wall.id, 'start')
        const endNonRefProj = wallNonRefSideProjectedPoint(wall.id, 'end')

        const refLine = isRefInside ? wall.insideLine : wall.outsideLine
        const startCorner = cornerGeomMap.get(wall.startCornerId)
        if (!startCorner) throw new Error(`Missing corner ${wall.startCornerId}`)
        const startPoint = isRefInside ? startCorner.outsidePoint : startCorner.insidePoint
        const startProjected = scaleAddVec2(
          refLine.start,
          wall.direction,
          projectVec2(refLine.start, startPoint, wall.direction)
        )
        actions.addPoint(startNonRefProj, startProjected)

        const endCorner = cornerGeomMap.get(wall.endCornerId)
        if (!endCorner) throw new Error(`Missing corner ${wall.endCornerId}`)
        const endPoint = isRefInside ? endCorner.outsidePoint : endCorner.insidePoint
        const endProjected = scaleAddVec2(
          refLine.end,
          wall.direction,
          projectVec2(refLine.end, endPoint, wall.direction)
        )
        actions.addPoint(endNonRefProj, endProjected)
        entry.pointIds.push(startNonRefProj, endNonRefProj)

        const refLineId = wallRefLineId(wall.id)
        const nonRefLineId = wallNonRefLineId(wall.id)
        actions.addLine(refLineId, startRef, endRef)
        actions.addLine(nonRefLineId, startNonRef, endNonRef)
        entry.lineIds.push(refLineId, nonRefLineId)

        const projStartOnLineId = `${wall.id}_proj_start_on_line`
        actions.addConstraint({
          id: projStartOnLineId,
          type: 'point_on_line_pl',
          p_id: startNonRefProj,
          l_id: refLineId
        })
        const projStartPerpId = `${wall.id}_proj_start_perp`
        actions.addConstraint({
          id: projStartPerpId,
          type: 'perpendicular_pppp',
          l1p1_id: startNonRefProj,
          l1p2_id: startNonRef,
          l2p1_id: startRef,
          l2p2_id: endRef
        })

        const projEndOnLineId = `${wall.id}_proj_end_on_line`
        actions.addConstraint({
          id: projEndOnLineId,
          type: 'point_on_line_pl',
          p_id: endNonRefProj,
          l_id: refLineId
        })
        const projEndPerpId = `${wall.id}_proj_end_perp`
        actions.addConstraint({
          id: projEndPerpId,
          type: 'perpendicular_pppp',
          l1p1_id: endNonRefProj,
          l1p2_id: endNonRef,
          l2p1_id: startRef,
          l2p2_id: endRef
        })

        const parallelId = `${wall.id}_parallel`
        actions.addConstraint({
          id: parallelId,
          type: 'parallel',
          l1_id: refLineId,
          l2_id: nonRefLineId
        })

        const thicknessId = `${wall.id}_thickness`
        actions.addConstraint({
          id: thicknessId,
          type: 'p2l_distance',
          p_id: startNonRef,
          l_id: refLineId,
          distance: wall.thickness
        })
        entry.constraintIds.push(
          parallelId,
          thicknessId,
          projStartOnLineId,
          projEndOnLineId,
          projStartPerpId,
          projEndPerpId
        )

        for (const opening of modelActions.getWallOpeningsById(wall.id)) {
          addWallEntityGeometry(opening, entry)
        }

        for (const post of modelActions.getWallPostsById(wall.id)) {
          addWallEntityGeometry(post, entry)
        }
      }

      // Add corner structure constraints for non-reference side
      for (const corner of corners) {
        const refPointId = nodeRefSidePointId(corner.id)
        const nonRefPrevId = nodeNonRefSidePointForPrevWall(corner.id)
        const nonRefNextId = nodeNonRefSidePointForNextWall(corner.id)

        const prevWall = walls.find(w => w.endCornerId === corner.id)
        const nextWall = walls.find(w => w.startCornerId === corner.id)

        if (!prevWall || !nextWall) continue

        const isColinear = corner.interiorAngle === 180

        if (isColinear) {
          const prevCornerRefId = nodeRefSidePointId(prevWall.startCornerId)
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

          const nextCornerRefId = nodeRefSidePointId(nextWall.endCornerId)
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
    },

    setTmpPoints(tmpPoints) {
      set(() => ({ tmpPoints }))
    }
  }
}))

export const useGcsPoints = (): GcsStoreState['points'] => useGcsStore(state => state.tmpPoints ?? state.points)
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
