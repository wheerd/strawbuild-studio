import { RefreshCw } from 'lucide-react'
import React, { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { useInitialSyncError, useIsInitialSyncing } from '@/building/store/persistenceStore'

export function InitialSyncOverlay(): React.JSX.Element | null {
  const { t } = useTranslation('common')
  const isInitialSyncing = useIsInitialSyncing()
  const initialSyncError = useInitialSyncError()
  const hasShownError = useRef(false)

  useEffect(() => {
    if (initialSyncError && !hasShownError.current) {
      hasShownError.current = true
      toast.error(t($ => $.projectMenu.initialSyncError))
    }
    if (!initialSyncError) {
      hasShownError.current = false
    }
  }, [initialSyncError, t])

  if (!isInitialSyncing) return null

  return (
    <div className="bg-background/80 absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <p className="text-lg font-medium">{t($ => $.projectMenu.loadingProject)}</p>
      </div>
    </div>
  )
}
