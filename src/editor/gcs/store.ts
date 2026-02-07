import { type Constraint, type SketchLine, type SketchPoint } from '@salusoft89/planegcs'
import { create } from 'zustand'

import type { ConstraintInput, PerimeterCornerId, PerimeterId, WallId } from '@/building/model'
import { getModelActions } from '@/building/store'
import { referenceSideToConstraintSide } from '@/editor/gcs/constraintGenerator'

import {
  type TranslationContext,
  buildingConstraintKey,
  getReferencedCornerIds,
  getReferencedWallIds,
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
        const inId = `corner_${cornerId}_in`
        const outId = `corner_${cornerId}_out`
        if (!(inId in state.points) || !(outId in state.points)) {
          throw new Error(`Cannot add building constraint: corner "${cornerId}" not found in GCS points.`)
        }
      }

      // Validate that all referenced walls exist as GCS lines
      const wallIds = getReferencedWallIds(constraint)
      for (const wallId of wallIds) {
        const lineId = `wall_${wallId}_in`
        if (!state.lines.some(l => l.id === lineId)) {
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

      // Add points for each corner
      for (const corner of corners) {
        const inId = `corner_${corner.id}_in`
        const outId = `corner_${corner.id}_out`
        actions.addPoint(inId, corner.insidePoint[0], corner.insidePoint[1], false)
        actions.addPoint(outId, corner.outsidePoint[0], corner.outsidePoint[1], false)
        entry.pointIds.push(inId, outId)
      }

      // Add lines and structural constraints for each wall
      for (const wall of walls) {
        const startIn = `corner_${wall.startCornerId}_in`
        const startOut = `corner_${wall.startCornerId}_out`
        const endIn = `corner_${wall.endCornerId}_in`
        const endOut = `corner_${wall.endCornerId}_out`

        const inLineId = `wall_${wall.id}_in`
        const outLineId = `wall_${wall.id}_out`
        actions.addLine(inLineId, startIn, endIn)
        actions.addLine(outLineId, startOut, endOut)
        entry.lineIds.push(inLineId, outLineId)

        const parallelId = `parallel_${wall.id}`
        actions.addConstraint({
          id: parallelId,
          type: 'parallel',
          l1_id: inLineId,
          l2_id: outLineId
        })
        entry.constraintIds.push(parallelId)

        const thicknessId = `thickness_${wall.id}`
        actions.addConstraint({
          id: thicknessId,
          type: 'p2l_distance',
          p_id: startOut,
          l_id: inLineId,
          distance: wall.thickness
        })
        entry.constraintIds.push(thicknessId)
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
