import type React from 'react'
import { Suspense, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { AppSkeleton } from '@/app/skeletons/AppSkeleton'
import { useAuth } from '@/app/user/useAuth'
import { startChunkPreloading } from '@/shared/services/chunkPreloader'

interface LocationState {
  backgroundLocation?: Location
}

export function Layout(): React.JSX.Element {
  const location = useLocation()
  const state = location.state as LocationState | null
  const backgroundLocation = state?.backgroundLocation

  useAuth()

  useEffect(() => {
    startChunkPreloading()
  }, [])

  return (
    <>
      <Suspense fallback={<AppSkeleton />}>
        <Outlet context={backgroundLocation ?? location} />
      </Suspense>

      {backgroundLocation && (
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
      )}
    </>
  )
}
