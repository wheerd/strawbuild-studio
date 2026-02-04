import {
  Algorithm,
  type Constraint,
  type GcsWrapper,
  type SketchLine,
  type SketchPoint,
  SolveStatus
} from '@salusoft89/planegcs'
import { create } from 'zustand'

import { createPerimeterWallId } from '@/building/model'
import { createGcs } from '@/editor/gcs/gcsInstance'
import type { Length } from '@/shared/geometry'

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
  gcs: GcsWrapper | null
  drag: DragState | null
}

interface GcsStoreActions {
  initGCS: () => void
  populateInitialState: () => void

  addPoint: (id: string, x: number, y: number, fixed?: boolean) => void
  addLine: (id: string, p1Id: string, p2Id: string) => void
  addVisualLine: (id: string, p1Id: string, p2Id: string) => void
  addConstraint: (constraint: Constraint) => void

  startDrag: (pointId: string, mouseX: number, mouseY: number) => void
  updateDrag: (mouseX: number, mouseY: number) => void
  endDrag: () => void

  solve: () => SolveStatus
  applySolution: () => void

  reset: () => void
}

type GcsStore = GcsStoreState & { actions: GcsStoreActions }

const useGcsStore = create<GcsStore>()((set, get) => ({
  points: {},
  lines: [],
  visualLines: [],
  constraints: {},
  gcs: null,
  drag: null,

  actions: {
    initGCS: () => {
      const state = get()
      if (!state.gcs) {
        set({ gcs: createGcs() })
      }

      state.actions.populateInitialState()
      state.actions.reset()
      state.actions.applySolution()
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

    startDrag: (pointId, mouseX, mouseY) => {
      const state = get()
      const point = state.points[pointId]
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (point?.fixed || !state.gcs) return

      state.actions.reset()
      const gcs = state.gcs
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

      const dragState = {
        pointId,
        constraintXId,
        constraintYId,
        paramXPos,
        paramYPos
      }

      set({
        drag: dragState
      })
    },

    updateDrag: (mouseX, mouseY) => {
      const state = get()
      if (!state.drag || !state.gcs) return

      const { paramXPos, paramYPos } = state.drag
      const gcs = state.gcs

      gcs.gcs.set_p_param(paramXPos, mouseX, true)
      gcs.gcs.set_p_param(paramYPos, mouseY, true)

      if (gcs.solve(Algorithm.DogLeg) === SolveStatus.Success) {
        state.actions.applySolution()
      }
    },

    endDrag: () => {
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
      if (!gcs) return

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

      set({
        points: newPoints
      })
    },

    populateInitialState: () => {
      set({
        points: {},
        lines: [],
        visualLines: [],
        constraints: {},
        drag: null
      })

      const { actions } = get()

      actions.addPoint('A_in', 0, 0, false)
      actions.addPoint('B_in', 2000, 0, false)
      actions.addPoint('C_in', 2000, 2000, false)
      actions.addPoint('D_in', 0, 2000, false)

      actions.addPoint('A_out', -150, -150, false)
      actions.addPoint('B_out', 2200, -150, false)
      actions.addPoint('C_out', 2200, 2200, false)
      actions.addPoint('D_out', -150, 2200, false)

      const wallAB = addWall(actions, 'A', 'B', 200)
      addWall(actions, 'B', 'C', 150)
      addWall(actions, 'C', 'D', 200)
      const wallDA = addWall(actions, 'D', 'A', 150)

      actions.addConstraint({
        id: `length_AB`,
        type: 'p2p_distance',
        p1_id: 'A_in',
        p2_id: 'B_in',
        distance: 3000
      })

      actions.addConstraint({
        id: `length_BC`,
        type: 'p2p_distance',
        p1_id: 'B_out',
        p2_id: 'C_out',
        distance: 2000
      })

      actions.addConstraint({
        id: `perp_A`,
        type: 'perpendicular_ll',
        l1_id: `wall_${wallAB}_out`,
        l2_id: `wall_${wallDA}_out`
      })

      actions.addVisualLine('corner_A_line', 'A_in', 'A_out')
      actions.addVisualLine('corner_B_line', 'B_in', 'B_out')
      actions.addVisualLine('corner_C_line', 'C_in', 'C_out')
      actions.addVisualLine('corner_D_line', 'D_in', 'D_out')
    }
  }
}))

function addWall(actions: GcsStoreActions, start: string, end: string, thickness: Length) {
  const wallId = createPerimeterWallId()
  const startIn = `${start}_in`
  const startOut = `${start}_out`
  const endIn = `${end}_in`
  const endOut = `${end}_out`

  actions.addLine(`wall_${wallId}_in`, startIn, endIn)
  actions.addLine(`wall_${wallId}_out`, startOut, endOut)

  actions.addConstraint({
    id: `parallel_${wallId}`,
    type: 'parallel',
    l1_id: `wall_${wallId}_in`,
    l2_id: `wall_${wallId}_out`
  })
  actions.addConstraint({
    id: `thickness_${wallId}`,
    type: 'p2l_distance',
    p_id: startOut,
    l_id: `wall_${wallId}_in`,
    distance: thickness
  })

  return wallId
}

export const useGcsPoints = (): GcsStoreState['points'] => useGcsStore(state => state.points)
export const useGcsLines = (): GcsStoreState['lines'] => useGcsStore(state => state.lines)
export const useGcsVisualLines = (): GcsStoreState['visualLines'] => useGcsStore(state => state.visualLines)
export const useGcsDrag = (): GcsStoreState['drag'] => useGcsStore(state => state.drag)
export const useGcsActions = (): GcsStoreActions => useGcsStore(state => state.actions)
