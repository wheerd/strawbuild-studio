import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

import { createFileInput } from '@/shared/services/exportImport'

export interface PersistenceState {
  isSaving: boolean
  lastSaved: Date | null
  saveError: string | null
  isHydrated: boolean
  isExporting: boolean
  isImporting: boolean
  exportError: string | null
  importError: string | null
}

export interface PersistenceActions {
  setSaving: (isSaving: boolean) => void
  setSaveSuccess: (timestamp: Date) => void
  setSaveError: (error: string | null) => void
  setHydrated: (isHydrated: boolean) => void
  setExporting: (isExporting: boolean) => void
  setImporting: (isImporting: boolean) => void
  setExportError: (error: string | null) => void
  setImportError: (error: string | null) => void
  exportProject: () => void
  importProject: () => void
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
      isExporting: false,
      isImporting: false,
      exportError: null,
      importError: null,

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
      },

      setExporting: (isExporting: boolean) => {
        set({ isExporting, exportError: null }, false, 'persistence/setExporting')
      },

      setImporting: (isImporting: boolean) => {
        set({ isImporting, importError: null }, false, 'persistence/setImporting')
      },

      setExportError: (error: string | null) => {
        set({ isExporting: false, exportError: error }, false, 'persistence/setExportError')
      },

      setImportError: (error: string | null) => {
        set({ isImporting: false, importError: error }, false, 'persistence/setImportError')
      },

      exportProject: async () => {
        const actions = usePersistenceStore.getState()
        actions.setExporting(true)

        try {
          const { ProjectImportExportService } = await import('@/shared/services/ProjectImportExportService')
          const result = await ProjectImportExportService.exportProject()

          if (result.success) {
            actions.setExporting(false)
          } else {
            actions.setExportError(result.error)
          }
        } catch (error) {
          actions.setExportError(error instanceof Error ? error.message : 'Failed to export')
        }
      },

      importProject: () => {
        const actions = usePersistenceStore.getState()
        actions.setImporting(true)

        createFileInput(async (content: string) => {
          try {
            const { ProjectImportExportService } = await import('@/shared/services/ProjectImportExportService')
            const result = await ProjectImportExportService.importProject(content)

            if (result.success) {
              actions.setImporting(false)
            } else {
              actions.setImportError(result.error)
            }
          } catch (error) {
            actions.setImportError(error instanceof Error ? error.message : 'Failed to import')
          }
        })
      }
    }),
    { name: 'persistence-store' }
  )
)

export const useIsHydrated = (): boolean => usePersistenceStore(state => state.isHydrated)

// Direct access for non-reactive usage
export const getPersistenceActions = (): PersistenceActions => usePersistenceStore.getState()
