import React, { Suspense, useEffect } from 'react'
import { Outlet, Route, Routes, useLocation, useMatches } from 'react-router-dom'

import { AppSkeleton } from '@/app/skeletons/AppSkeleton'
import { useAuth } from '@/app/user/useAuth'
import { startChunkPreloading } from '@/shared/services/chunkPreloader'

const FloorPlanEditor = React.lazy(async () => {
  const module = await import('@/editor/FloorPlanEditor')
  return { default: module.FloorPlanEditor }
})

interface LocationState {
  backgroundLocation?: Location
}

interface RouteHandle {
  isModal?: boolean
}

export function Layout(): React.JSX.Element {
  const location = useLocation()
  const matches = useMatches()
  const state = location.state as LocationState | null
  const explicitBackground = state?.backgroundLocation

  const isModalRoute = matches.some(match => (match.handle as RouteHandle | undefined)?.isModal === true)

  const backgroundLocation = explicitBackground ?? (isModalRoute ? { pathname: '/' } : null)

  useAuth()

  useEffect(() => {
    startChunkPreloading()
  }, [])

  return (
    <>
      <Suspense fallback={<AppSkeleton />}>
        <Routes location={backgroundLocation ?? location}>
          <Route index element={<FloorPlanEditor />} />
        </Routes>
      </Suspense>

      {backgroundLocation && (
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
      )}
    </>
  )
}
