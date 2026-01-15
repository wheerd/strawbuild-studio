import { create } from 'zustand'

import { type Vec2 } from '@/shared/geometry'

interface PointerPosition {
  stage: Vec2 | null
  world: Vec2 | null
}

interface PointerPositionActions {
  setPosition: (stage: Vec2, world: Vec2) => void
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
      set({ stage, world })
    },
    clear: () => {
      set(INITIAL_STATE)
    }
  }
}))

export const usePointerWorldPosition = (): Vec2 | null => pointerPositionStore(state => state.world)

export const usePointerStagePosition = (): Vec2 | null => pointerPositionStore(state => state.stage)

export const usePointerPositionActions = (): PointerPositionActions => pointerPositionStore(state => state.actions)

export const pointerPositionActions = (): PointerPositionActions => pointerPositionStore.getState().actions
