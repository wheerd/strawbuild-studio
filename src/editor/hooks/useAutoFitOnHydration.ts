import { useEffect, useRef } from 'react'

import { getModelActions } from '@/building/store'
import { useIsHydrated } from '@/building/store/persistenceStore'
import { viewportActions } from '@/editor/hooks/useViewportStore'
import { Bounds2D } from '@/shared/geometry'

export function useAutoFitOnHydration(): void {
  const isHydrated = useIsHydrated()
  const hasRun = useRef(false)

  useEffect(() => {
    if (isHydrated && !hasRun.current) {
      hasRun.current = true

      setTimeout(() => {
        const { getActiveStoreyId, getPerimetersByStorey } = getModelActions()
        const activeStoreyId = getActiveStoreyId()
        const perimeters = getPerimetersByStorey(activeStoreyId)

        if (perimeters.length > 0) {
          const outerPoints = perimeters.flatMap(p => p.outerPolygon.points)
          const bounds = Bounds2D.fromPoints(outerPoints)
          viewportActions().fitToView(bounds)
        }
      }, 100) // Small delay so that the viewport canvas size has time to adjust
    }
  }, [isHydrated])
}
