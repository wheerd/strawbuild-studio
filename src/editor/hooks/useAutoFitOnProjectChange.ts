import { useCallback, useEffect, useRef } from 'react'

import { useModelActions } from '@/building/store'
import { useIsHydrated } from '@/building/store/persistenceStore'
import { useViewportActions } from '@/editor/hooks/useViewportStore'
import { subscribeToProjectChanges } from '@/projects/store'

export function useAutoFitOnProjectChange(): void {
  const { getActiveStoreyId, getBounds } = useModelActions()
  const { fitToView } = useViewportActions()
  const isHydrated = useIsHydrated()
  const hasRun = useRef(false)

  const handleFitToView = useCallback(() => {
    const activeStoreyId = getActiveStoreyId()
    const bounds = getBounds(activeStoreyId)
    if (!bounds.isEmpty) {
      fitToView(bounds)
    }
  }, [getActiveStoreyId, getBounds, fitToView])

  useEffect(() => {
    if (isHydrated && !hasRun.current) {
      hasRun.current = true
      setTimeout(handleFitToView, 100) // Small delay so that the viewport size has time to adjust
    }
  }, [isHydrated, handleFitToView])

  useEffect(() => subscribeToProjectChanges(handleFitToView), [handleFitToView])
}
