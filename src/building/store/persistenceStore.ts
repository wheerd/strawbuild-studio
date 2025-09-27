import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export interface PersistenceState {
  isSaving: boolean
  lastSaved: Date | null
  saveError: string | null
  isHydrated: boolean
}

export interface PersistenceActions {
  setSaving: (isSaving: boolean) => void
  setSaveSuccess: (timestamp: Date) => void
  setSaveError: (error: string | null) => void
  setHydrated: (isHydrated: boolean) => void
}

export type PersistenceStore = PersistenceState & PersistenceActions

export const usePersistenceStore = create<PersistenceStore>()(
  devtools(
    set => ({
      // Initial state
      isSaving: false,
      lastSaved: null,
      saveError: null,
      isHydrated: false,

      // Actions
      setSaving: (isSaving: boolean) => {
        set({ isSaving, saveError: null }, false, 'persistence/setSaving')
      },

      setSaveSuccess: (timestamp: Date) => {
        set(
          {
            isSaving: false,
            lastSaved: timestamp,
            saveError: null
          },
          false,
          'persistence/setSaveSuccess'
        )
      },

      setSaveError: (error: string | null) => {
        set(
          {
            isSaving: false,
            saveError: error
          },
          false,
          'persistence/setSaveError'
        )
      },

      setHydrated: (isHydrated: boolean) => {
        set({ isHydrated, lastSaved: new Date() }, false, 'persistence/setHydrated')
      }
    }),
    { name: 'persistence-store' }
  )
)

export const useIsHydrated = (): boolean => usePersistenceStore(state => state.isHydrated)

// Direct access for non-reactive usage
export const getPersistenceActions = (): PersistenceActions => usePersistenceStore.getState()
