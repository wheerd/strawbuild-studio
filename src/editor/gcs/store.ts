import {
  Algorithm,
  type GcsWrapper,
  type SketchLine,
  type SketchPoint,
  make_gcs_wrapper as makeGcsWrapper
} from '@salusoft89/planegcs'
import wasmUrl from '@salusoft89/planegcs/dist/planegcs_dist/planegcs.wasm?url'
import { create } from 'zustand'

interface DragState {
  pointId: string
  constraintXId: string
  constraintYId: string
  paramXPos: number
  paramYPos: number
}

interface GcsStoreState {
  points: Record<string, { x: number; y: number; fixed: boolean }>
  lines: { id: string; p1Id: string; p2Id: string }[]
  constraints: Record<string, unknown>[]
  gcs: GcsWrapper | null
  gcsReady: boolean
  drag: DragState | null
}

interface GcsStoreActions {
  initGCS: () => Promise<void>

  addPoint: (id: string, x: number, y: number, fixed?: boolean) => void
  addLine: (id: string, p1Id: string, p2Id: string) => void
  addConstraint: (constraint: Record<string, unknown>) => void

  startDrag: (pointId: string, mouseX: number, mouseY: number) => void
  updateDrag: (mouseX: number, mouseY: number) => void
  endDrag: () => void

  solve: () => number
  applySolution: () => void

  reset: () => void
}

type GcsStore = GcsStoreState & { actions: GcsStoreActions }

const useGcsStore = create<GcsStore>()((set, get) => ({
  points: {},
  lines: [] as { id: string; p1Id: string; p2Id: string }[],
  constraints: [] as Record<string, unknown>[],
  gcs: null,
  gcsReady: false,
  drag: null,

  actions: {
    initGCS: async () => {
      const gcs = await makeGcsWrapper(wasmUrl)
      const { actions } = get()

      set({ gcs, gcsReady: true })

      actions.reset()
    },

    addPoint: (id, x, y, fixed = false) => {
      const state = get()
      const gcs = state.gcs
      if (!gcs) return

      const point: SketchPoint = { id, type: 'point', x, y, fixed }
      gcs.push_primitive(point)

      set(state => ({
        points: {
          ...state.points,
          [id]: { x, y, fixed }
        }
      }))
    },

    addLine: (id, p1Id, p2Id) => {
      const state = get()
      const gcs = state.gcs
      if (!gcs) return

      const line: SketchLine = { id, type: 'line', p1_id: p1Id, p2_id: p2Id }
      gcs.push_primitive(line)

      set(state => ({
        lines: [...state.lines, { id, p1Id, p2Id }]
      }))
    },

    addConstraint: constraint => {
      const state = get()
      const gcs = state.gcs
      if (!gcs) return

      gcs.push_primitive(constraint as never)

      set(state => ({
        constraints: [...state.constraints, constraint]
      }))
    },

    startDrag: (pointId, mouseX, mouseY) => {
      const state = get()
      const point = state.points[pointId]
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (point?.fixed || !state.gcs) return

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
      } as never)

      gcs.push_primitive({
        type: 'equal',
        id: constraintYId,
        param1: { o_id: pointId, prop: 'y' },
        param2: mouseY,
        temporary: true,
        driving: true
      } as never)

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

      gcs.solve(Algorithm.DogLeg)
      gcs.apply_solution()
      state.actions.applySolution()
    },

    endDrag: () => {
      const state = get()
      if (!state.drag || !state.gcs) return

      const gcs = state.gcs
      const { points, lines, constraints } = state

      gcs.clear_data()
      set({
        points: {},
        lines: [] as { id: string; p1Id: string; p2Id: string }[],
        constraints: [] as Record<string, unknown>[],
        drag: null
      })

      const gcsActions = get().actions

      Object.entries(points).forEach(([id, point]) => {
        gcsActions.addPoint(id, point.x, point.y, point.fixed)
      })

      for (const line of lines) {
        gcsActions.addLine(line.id, line.p1Id, line.p2Id)
      }

      for (const constraint of constraints) {
        gcsActions.addConstraint(constraint)
      }

      gcs.solve(Algorithm.DogLeg)
      gcs.apply_solution()
      gcsActions.applySolution()
    },

    solve: () => {
      const state = get()
      const gcs = state.gcs
      if (!gcs) return -1

      const result = gcs.solve(Algorithm.DogLeg)
      return result
    },

    applySolution: () => {
      const state = get()
      const gcs = state.gcs
      if (!gcs) return

      gcs.apply_solution()

      const primitives = gcs.sketch_index.get_primitives()
      const newPoints: Record<string, { x: number; y: number; fixed: boolean }> = {}

      for (const primitive of primitives) {
        if (primitive.type === 'point') {
          newPoints[primitive.id] = {
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

    reset: () => {
      const gcs = get().gcs
      if (!gcs) return

      gcs.clear_data()
      set({
        points: {},
        lines: [] as { id: string; p1Id: string; p2Id: string }[],
        constraints: [] as Record<string, unknown>[],
        drag: null
      })

      const { actions } = get()

      actions.addPoint('A', 0, 0, true)
      actions.addPoint('B', 2000, 0, false)
      actions.addPoint('C', 2000, 2000, false)
      actions.addPoint('D', 0, 2000, false)

      actions.addLine('AB', 'A', 'B')
      actions.addLine('BC', 'B', 'C')
      actions.addLine('CD', 'C', 'D')
      actions.addLine('DA', 'D', 'A')

      actions.addConstraint({
        id: 'dist_ab',
        type: 'p2p_distance',
        p1_id: 'A',
        p2_id: 'B',
        distance: 2000
      })

      actions.addConstraint({
        id: 'parallel_ab_cd',
        type: 'parallel',
        l1_id: 'AB',
        l2_id: 'CD'
      })

      actions.addConstraint({
        id: 'parallel_bc_da',
        type: 'parallel',
        l1_id: 'BC',
        l2_id: 'DA'
      })

      actions.addConstraint({
        id: 'perp_ab_bc',
        type: 'perpendicular_ll',
        l1_id: 'AB',
        l2_id: 'BC'
      })

      void actions.solve()
      actions.applySolution()
    }
  }
}))

export const useGcsPoints = (): GcsStoreState['points'] => useGcsStore(state => state.points)
export const useGcsLines = (): GcsStoreState['lines'] => useGcsStore(state => state.lines)
export const useGcsDrag = (): GcsStoreState['drag'] => useGcsStore(state => state.drag)
export const useGcsReady = (): GcsStoreState['gcsReady'] => useGcsStore(state => state.gcsReady)
export const useGcsActions = (): GcsStoreActions => useGcsStore(state => state.actions)
