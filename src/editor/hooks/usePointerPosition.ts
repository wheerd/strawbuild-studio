import { create } from 'zustand'

import { type Vec2, newVec2 } from '@/shared/geometry'

interface PointerPosition {
  stage: { x: number; y: number } | null
  world: Vec2 | null
}

interface PointerPositionActions {
  setPosition: (stage: { x: number; y: number }, world: Vec2) => void
  clear: () => void
}

type PointerPositionStore = PointerPosition & { actions: PointerPositionActions }

const INITIAL_STATE: PointerPosition = {
  stage: null,
  world: null
}

const pointerPositionStore = create<PointerPositionStore>()(set => ({
  ...INITIAL_STATE,

  actions: {
    setPosition: (stage, world) => {
      const stageCopy = { x: stage.x, y: stage.y }
      const worldCopy = newVec2(world[0], world[1])
      set({ stage: stageCopy, world: worldCopy })
    },
    clear: () => {
      set(INITIAL_STATE)
    }
  }
}))

export const usePointerWorldPosition = (): Vec2 | null => pointerPositionStore(state => state.world)

export const usePointerStagePosition = (): { x: number; y: number } | null => pointerPositionStore(state => state.stage)

export const usePointerPositionActions = (): PointerPositionActions => pointerPositionStore(state => state.actions)

export const pointerPositionActions = (): PointerPositionActions => pointerPositionStore.getState().actions
