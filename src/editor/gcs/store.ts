import {
  Algorithm,
  type Constraint,
  type GcsWrapper,
  type SketchLine,
  type SketchPoint,
  SolveStatus
} from '@salusoft89/planegcs'
import { create } from 'zustand'

import type { PerimeterWithGeometry } from '@/building/model'
import { getModelActions } from '@/building/store'
import { createGcs } from '@/editor/gcs/gcsInstance'

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
  populateFromPerimeters: (perimeters: PerimeterWithGeometry[]) => void

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

    populateFromPerimeters: perimeters => {
      set({
        points: {},
        lines: [],
        visualLines: [],
        constraints: {},
        drag: null
      })

      const { actions } = get()
      const modelActions = getModelActions()

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
    }
  }
}))

export const useGcsPoints = (): GcsStoreState['points'] => useGcsStore(state => state.points)
export const useGcsLines = (): GcsStoreState['lines'] => useGcsStore(state => state.lines)
export const useGcsVisualLines = (): GcsStoreState['visualLines'] => useGcsStore(state => state.visualLines)
export const useGcsDrag = (): GcsStoreState['drag'] => useGcsStore(state => state.drag)
export const useGcsActions = (): GcsStoreActions => useGcsStore(state => state.actions)
