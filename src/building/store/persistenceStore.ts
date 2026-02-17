import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export interface PersistenceState {
  isSaving: boolean
  lastSaved: Date | null
  saveError: string | null
  isHydrated: boolean
  isCloudSyncing: boolean
  lastCloudSync: Date | null
  cloudSyncError: string | null
}

export interface PersistenceActions {
  setSaving: (isSaving: boolean) => void
  setSaveSuccess: (timestamp: Date) => void
  setSaveError: (error: string | null) => void
  setHydrated: (isHydrated: boolean) => void
  setCloudSyncing: (isSyncing: boolean) => void
  setCloudSyncSuccess: (timestamp: Date) => void
  setCloudSyncError: (error: string | null) => void
}

export type PersistenceStore = PersistenceState & PersistenceActions

export const usePersistenceStore = create<PersistenceStore>()(
  devtools(
    set => ({
      isSaving: false,
      lastSaved: null,
      saveError: null,
      isHydrated: false,
      isCloudSyncing: false,
      lastCloudSync: null,
      cloudSyncError: null,

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
      },

      setCloudSyncing: (isCloudSyncing: boolean) => {
        set({ isCloudSyncing, cloudSyncError: null }, false, 'persistence/setCloudSyncing')
      },

      setCloudSyncSuccess: (timestamp: Date) => {
        set(
          {
            isCloudSyncing: false,
            lastCloudSync: timestamp,
            cloudSyncError: null
          },
          false,
          'persistence/setCloudSyncSuccess'
        )
      },

      setCloudSyncError: (error: string | null) => {
        set(
          {
            isCloudSyncing: false,
            cloudSyncError: error
          },
          false,
          'persistence/setCloudSyncError'
        )
      }
    }),
    { name: 'persistence-store' }
  )
)

export const useIsHydrated = (): boolean => usePersistenceStore(state => state.isHydrated)
export const useIsCloudSyncing = (): boolean => usePersistenceStore(state => state.isCloudSyncing)
export const useLastCloudSync = (): Date | null => usePersistenceStore(state => state.lastCloudSync)
export const useCloudSyncError = (): string | null => usePersistenceStore(state => state.cloudSyncError)

export const getPersistenceActions = (): PersistenceActions => usePersistenceStore.getState()
