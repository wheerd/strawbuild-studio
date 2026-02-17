import React, { Suspense, useEffect } from 'react'

import { AppSkeleton } from '@/app/skeletons/AppSkeleton'
import { useAuth } from '@/app/user/useAuth'
import { startChunkPreloading } from '@/shared/services/chunkPreloader'

const FloorPlanEditor = React.lazy(
  async () =>
    await import('@/editor/FloorPlanEditor').then(module => ({
      default: module.FloorPlanEditor
    }))
)

function App(): React.JSX.Element {
  useAuth()
  useEffect(() => {
    startChunkPreloading()
  }, [])

  return (
    <Suspense fallback={<AppSkeleton />}>
      <FloorPlanEditor />
    </Suspense>
  )
}

export default App
