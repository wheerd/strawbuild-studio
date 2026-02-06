import {
  Algorithm,
  type Constraint,
  type GcsWrapper,
  type SketchLine,
  type SketchPoint,
  SolveStatus
} from '@salusoft89/planegcs'
import { create } from 'zustand'

import type {
  Constraint as BuildingConstraint,
  PerimeterCornerId,
  PerimeterId,
  PerimeterWallId,
  PerimeterWithGeometry
} from '@/building/model'
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

interface GcsStoreState {
  points: Record<string, SketchPoint>
  lines: SketchLine[]
  visualLines: { id: string; p1Id: string; p2Id: string }[]
  constraints: Record<string, Constraint>
  buildingConstraints: Record<string, BuildingConstraint>
  gcs: GcsWrapper | null
  drag: DragState | null
  cornerOrderMap: Map<PerimeterId, PerimeterCornerId[]>
}

interface GcsStoreActions {
  initGCS: () => void
  populateFromPerimeters: (perimeters: PerimeterWithGeometry[]) => void

  addPoint: (id: string, x: number, y: number, fixed?: boolean) => void
  addLine: (id: string, p1Id: string, p2Id: string) => void
  addVisualLine: (id: string, p1Id: string, p2Id: string) => void
  addConstraint: (constraint: Constraint) => void

  addBuildingConstraint: (constraint: BuildingConstraint) => string
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

    populateFromPerimeters: perimeters => {
      const cornerOrderMap = new Map<PerimeterId, PerimeterCornerId[]>()
      for (const perimeter of perimeters) {
        cornerOrderMap.set(perimeter.id, [...perimeter.cornerIds])
      }

      // Collect the set of valid corner IDs and wall IDs from the new perimeters
      const validCornerIds = new Set<PerimeterCornerId>()
      const validWallIds = new Set<PerimeterWallId>()
      const modelActions = getModelActions()

      for (const perimeter of perimeters) {
        const corners = modelActions.getPerimeterCornersById(perimeter.id)
        const walls = modelActions.getPerimeterWallsById(perimeter.id)
        for (const corner of corners) {
          validCornerIds.add(corner.id)
        }
        for (const wall of walls) {
          validWallIds.add(wall.id)
        }
      }

      // Filter existing building constraints: keep only those whose references still exist
      const previousBuildingConstraints = get().buildingConstraints
      const survivingConstraints: Record<string, BuildingConstraint> = {}

      for (const [key, constraint] of Object.entries(previousBuildingConstraints)) {
        const referencedCorners = getReferencedCornerIds(constraint)
        const referencedWalls = getReferencedWallIds(constraint)

        const allCornersExist = referencedCorners.every(id => validCornerIds.has(id))
        const allWallsExist = referencedWalls.every(id => validWallIds.has(id))

        if (allCornersExist && allWallsExist) {
          survivingConstraints[key] = constraint
        }
      }

      // Reset geometry state (but not buildingConstraints yet)
      set({
        points: {},
        lines: [],
        visualLines: [],
        constraints: {},
        buildingConstraints: {},
        drag: null,
        cornerOrderMap
      })

      const { actions } = get()

      // Repopulate geometry from perimeters
      for (const perimeter of perimeters) {
        const corners = modelActions.getPerimeterCornersById(perimeter.id)
        const walls = modelActions.getPerimeterWallsById(perimeter.id)

        for (const corner of corners) {
          actions.addPoint(`corner_${corner.id}_in`, corner.insidePoint[0], corner.insidePoint[1], false)
          actions.addPoint(`corner_${corner.id}_out`, corner.outsidePoint[0], corner.outsidePoint[1], false)
          actions.addVisualLine(`corner_${corner.id}_line`, `corner_${corner.id}_in`, `corner_${corner.id}_out`)
        }

        for (const wall of walls) {
          const startIn = `corner_${wall.startCornerId}_in`
          const startOut = `corner_${wall.startCornerId}_out`
          const endIn = `corner_${wall.endCornerId}_in`
          const endOut = `corner_${wall.endCornerId}_out`

          actions.addLine(`wall_${wall.id}_in`, startIn, endIn)
          actions.addLine(`wall_${wall.id}_out`, startOut, endOut)

          actions.addConstraint({
            id: `parallel_${wall.id}`,
            type: 'parallel',
            l1_id: `wall_${wall.id}_in`,
            l2_id: `wall_${wall.id}_out`
          })

          actions.addConstraint({
            id: `thickness_${wall.id}`,
            type: 'p2l_distance',
            p_id: startOut,
            l_id: `wall_${wall.id}_in`,
            distance: wall.thickness
          })
        }
      }

      // Re-add surviving building constraints
      for (const constraint of Object.values(survivingConstraints)) {
        actions.addBuildingConstraint(constraint)
      }
    }
  }
}))

export const useGcsPoints = (): GcsStoreState['points'] => useGcsStore(state => state.points)
export const useGcsLines = (): GcsStoreState['lines'] => useGcsStore(state => state.lines)
export const useGcsVisualLines = (): GcsStoreState['visualLines'] => useGcsStore(state => state.visualLines)
export const useGcsDrag = (): GcsStoreState['drag'] => useGcsStore(state => state.drag)
export const useGcsBuildingConstraints = (): GcsStoreState['buildingConstraints'] =>
  useGcsStore(state => state.buildingConstraints)
export const useGcsActions = (): GcsStoreActions => useGcsStore(state => state.actions)

// Non-hook getters for use outside React components (e.g. in tests or imperative code)
export const getGcsActions = (): GcsStoreActions => useGcsStore.getState().actions
export const getGcsState = (): GcsStoreState => useGcsStore.getState()
