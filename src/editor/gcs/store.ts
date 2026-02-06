import {
  Algorithm,
  type Constraint,
  type GcsWrapper,
  type SketchLine,
  type SketchPoint,
  SolveStatus
} from '@salusoft89/planegcs'
import { create } from 'zustand'

import type { ConstraintInput, PerimeterCornerId, PerimeterId, PerimeterWallId } from '@/building/model'
import { getModelActions } from '@/building/store'
import { createGcs } from '@/editor/gcs/gcsInstance'

import {
  buildingConstraintKey,
  getReferencedCornerIds,
  getReferencedWallIds,
  translateBuildingConstraint,
  translatedConstraintIds
} from './constraintTranslator'
import { validateSolution } from './validator'

interface DragState {
  pointId: string
  constraintXId: string
  constraintYId: string
  paramXPos: number
  paramYPos: number
}

interface PerimeterRegistryEntry {
  pointIds: string[]
  lineIds: string[]
  visualLineIds: string[]
  constraintIds: string[]
}

interface GcsStoreState {
  points: Record<string, SketchPoint>
  lines: SketchLine[]
  visualLines: { id: string; p1Id: string; p2Id: string }[]
  constraints: Record<string, Constraint>
  buildingConstraints: Record<string, ConstraintInput>
  gcs: GcsWrapper | null
  drag: DragState | null
  cornerOrderMap: Map<PerimeterId, PerimeterCornerId[]>
  perimeterRegistry: Record<PerimeterId, PerimeterRegistryEntry>
}

interface GcsStoreActions {
  initGCS: () => void

  addPerimeterGeometry: (perimeterId: PerimeterId) => void
  removePerimeterGeometry: (perimeterId: PerimeterId) => void

  addPoint: (id: string, x: number, y: number, fixed?: boolean) => void
  addLine: (id: string, p1Id: string, p2Id: string) => void
  addVisualLine: (id: string, p1Id: string, p2Id: string) => void
  addConstraint: (constraint: Constraint) => void

  removePoints: (ids: string[]) => void
  removeLines: (ids: string[]) => void
  removeVisualLines: (ids: string[]) => void
  removeConstraints: (ids: string[]) => void

  addBuildingConstraint: (constraint: ConstraintInput) => string
  removeBuildingConstraint: (key: string) => void

  installDragConstraints: (pointId: string, mouseX: number, mouseY: number) => DragState | null
  startDrag: (pointId: string, mouseX: number, mouseY: number) => void
  updateDrag: (mouseX: number, mouseY: number) => void
  endDrag: () => void

  solve: () => SolveStatus
  applySolution: () => boolean

  reset: () => void
}

type GcsStore = GcsStoreState & { actions: GcsStoreActions }

const useGcsStore = create<GcsStore>()((set, get) => ({
  points: {},
  lines: [],
  visualLines: [],
  constraints: {},
  buildingConstraints: {},
  gcs: null,
  drag: null,
  cornerOrderMap: new Map(),
  perimeterRegistry: {},

  actions: {
    initGCS: () => {
      const state = get()
      if (!state.gcs) {
        set({ gcs: createGcs() })
      }
    },

    installDragConstraints: (pointId, mouseX, mouseY) => {
      const state = get()
      const gcs = state.gcs
      if (!gcs) throw new Error('No GCS')

      const point = state.points[pointId]
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (point?.fixed) {
        return null
      }

      const constraintXId = `drag_${pointId}_x_${Date.now()}`
      const constraintYId = `drag_${pointId}_y_${Date.now()}`

      gcs.push_primitive({
        type: 'equal',
        id: constraintXId,
        param1: { o_id: pointId, prop: 'x' },
        param2: mouseX,
        temporary: true,
        driving: true
      })

      gcs.push_primitive({
        type: 'equal',
        id: constraintYId,
        param1: { o_id: pointId, prop: 'y' },
        param2: mouseY,
        temporary: true,
        driving: true
      })

      const paramXPos = gcs.p_param_index.get(constraintXId) ?? -1
      const paramYPos = gcs.p_param_index.get(constraintYId) ?? -1

      return { pointId, constraintXId, constraintYId, paramXPos, paramYPos }
    },

    reset: () => {
      const state = get()
      if (!state.gcs) {
        return
      }

      const gcs = state.gcs
      gcs.clear_data()

      for (const point of Object.values(state.points)) {
        gcs.push_primitive(point)
      }

      for (const line of state.lines) {
        gcs.push_primitive(line)
      }

      for (const constraint of Object.values(state.constraints)) {
        gcs.push_primitive(constraint)
      }
    },

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

    addVisualLine: (id, p1Id, p2Id) => {
      set(state => ({
        visualLines: [...state.visualLines, { id, p1Id, p2Id }]
      }))
    },

    addConstraint: constraint => {
      set(state => ({
        constraints: { ...state.constraints, [constraint.id]: { ...constraint } }
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

    removeVisualLines: ids => {
      if (ids.length === 0) return
      const toRemove = new Set(ids)
      set(state => ({
        visualLines: state.visualLines.filter(l => !toRemove.has(l.id))
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
      const context = {
        getLineStartPointId: (lineId: string) => {
          const line = state.lines.find(l => l.id === lineId)
          return line?.p1_id
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

    startDrag: (pointId, mouseX, mouseY) => {
      const state = get()
      const point = state.points[pointId]
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (point?.fixed || !state.gcs) return

      state.actions.reset()
      const dragData = state.actions.installDragConstraints(pointId, mouseX, mouseY)
      set({ drag: dragData })
    },

    updateDrag: (mouseX, mouseY) => {
      const state = get()
      if (!state.drag || !state.gcs) return

      const { paramXPos, paramYPos } = state.drag
      const gcs = state.gcs

      gcs.gcs.set_p_param(paramXPos, mouseX, true)
      gcs.gcs.set_p_param(paramYPos, mouseY, true)

      if (gcs.solve(Algorithm.DogLeg) === SolveStatus.Success) {
        if (!state.actions.applySolution()) {
          const dragData = state.actions.installDragConstraints(state.drag.pointId, mouseX, mouseY)
          set({ drag: dragData })
        }
      }
    },

    endDrag: () => {
      const state = get()
      if (!state.drag) return

      state.actions.reset()

      set({ drag: null })
    },

    solve: () => {
      const state = get()
      const gcs = state.gcs
      if (!gcs) throw new Error('No GCS')

      const result = gcs.solve(Algorithm.DogLeg)
      return result
    },

    applySolution: () => {
      const state = get()
      const gcs = state.gcs
      if (!gcs) return false

      gcs.apply_solution()

      const primitives = gcs.sketch_index.get_primitives()
      const newPoints: Record<string, SketchPoint> = {}

      for (const primitive of primitives) {
        if (primitive.type === 'point') {
          newPoints[primitive.id] = {
            ...state.points[primitive.id],
            x: primitive.x,
            y: primitive.y,
            fixed: primitive.fixed
          }
        }
      }

      const validation = validateSolution(newPoints, state.cornerOrderMap)

      if (validation.valid) {
        set({
          points: newPoints
        })
        return true
      }

      console.warn(validation)

      state.actions.reset()
      return false
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
      const perimeter = modelActions.getPerimeterById(perimeterId)

      const entry: PerimeterRegistryEntry = {
        pointIds: [],
        lineIds: [],
        visualLineIds: [],
        constraintIds: []
      }

      // Add points for each corner
      for (const corner of corners) {
        const inId = `corner_${corner.id}_in`
        const outId = `corner_${corner.id}_out`
        actions.addPoint(inId, corner.insidePoint[0], corner.insidePoint[1], false)
        actions.addPoint(outId, corner.outsidePoint[0], corner.outsidePoint[1], false)
        entry.pointIds.push(inId, outId)

        const visualId = `corner_${corner.id}_line`
        actions.addVisualLine(visualId, inId, outId)
        entry.visualLineIds.push(visualId)
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

      // Update registry and corner order map
      const newCornerOrderMap = new Map(state.cornerOrderMap)
      newCornerOrderMap.set(perimeterId, [...perimeter.cornerIds])

      set(state => ({
        perimeterRegistry: { ...state.perimeterRegistry, [perimeterId]: entry },
        cornerOrderMap: newCornerOrderMap
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

      // Collect corner and wall IDs belonging to this perimeter
      const perimeterCornerIds = new Set<PerimeterCornerId>()
      const perimeterWallIds = new Set<PerimeterWallId>()

      for (const pointId of entry.pointIds) {
        // Point IDs are like "corner_{cornerId}_in" or "corner_{cornerId}_out"
        const match = /^corner_(.+?)_(in|out)$/.exec(pointId)
        if (match) {
          perimeterCornerIds.add(match[1] as PerimeterCornerId)
        }
      }

      for (const lineId of entry.lineIds) {
        // Line IDs are like "wall_{wallId}_in" or "wall_{wallId}_out"
        const match = /^wall_(.+?)_(in|out)$/.exec(lineId)
        if (match) {
          perimeterWallIds.add(match[1] as PerimeterWallId)
        }
      }

      // Remove building constraints whose referenced entities belong to this perimeter
      const buildingConstraintKeysToRemove: string[] = []
      for (const [key, constraint] of Object.entries(state.buildingConstraints)) {
        const referencedCorners = getReferencedCornerIds(constraint)
        const referencedWalls = getReferencedWallIds(constraint)

        const usesPerimeterCorner = referencedCorners.some(id => perimeterCornerIds.has(id))
        const usesPerimeterWall = referencedWalls.some(id => perimeterWallIds.has(id))

        if (usesPerimeterCorner || usesPerimeterWall) {
          buildingConstraintKeysToRemove.push(key)
        }
      }

      for (const key of buildingConstraintKeysToRemove) {
        actions.removeBuildingConstraint(key)
      }

      // Remove structural constraints, lines, visual lines, and points
      actions.removeConstraints(entry.constraintIds)
      actions.removeLines(entry.lineIds)
      actions.removeVisualLines(entry.visualLineIds)
      actions.removePoints(entry.pointIds)

      // Update registry and corner order map
      const newCornerOrderMap = new Map(state.cornerOrderMap)
      newCornerOrderMap.delete(perimeterId)

      set(state => {
        const { [perimeterId]: _, ...remainingRegistry } = state.perimeterRegistry
        return {
          perimeterRegistry: remainingRegistry,
          cornerOrderMap: newCornerOrderMap,
          drag: null
        }
      })
    }
  }
}))

export const useGcsPoints = (): GcsStoreState['points'] => useGcsStore(state => state.points)
export const useGcsLines = (): GcsStoreState['lines'] => useGcsStore(state => state.lines)
export const useGcsVisualLines = (): GcsStoreState['visualLines'] => useGcsStore(state => state.visualLines)
export const useGcsDrag = (): GcsStoreState['drag'] => useGcsStore(state => state.drag)
export const useGcsBuildingConstraints = (): GcsStoreState['buildingConstraints'] =>
  useGcsStore(state => state.buildingConstraints)
export const useGcsPerimeterRegistry = (): GcsStoreState['perimeterRegistry'] =>
  useGcsStore(state => state.perimeterRegistry)
export const useGcsActions = (): GcsStoreActions => useGcsStore(state => state.actions)

// Non-hook getters for use outside React components (e.g. in tests or imperative code)
export const getGcsActions = (): GcsStoreActions => useGcsStore.getState().actions
export const getGcsState = (): GcsStoreState => useGcsStore.getState()
