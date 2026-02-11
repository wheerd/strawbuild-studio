import { create } from 'zustand'

export type ConstraintDisplayMode = 'side' | 'center'

interface ConstraintDisplayModeState {
  mode: ConstraintDisplayMode
  toggleMode: () => void
  setMode: (mode: ConstraintDisplayMode) => void
}

export const useConstraintDisplayMode = create<ConstraintDisplayModeState>(set => ({
  mode: 'side',
  toggleMode: () => {
    set(state => ({ mode: state.mode === 'side' ? 'center' : 'side' }))
  },
  setMode: mode => {
    set({ mode })
  }
}))
