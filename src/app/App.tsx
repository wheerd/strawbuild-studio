import React, { Suspense } from 'react'

import { AppSkeleton } from '@/app/skeletons/AppSkeleton'

const FloorPlanEditor = React.lazy(
  async () =>
    await import('@/editor/FloorPlanEditor').then(module => ({
      default: module.FloorPlanEditor
    }))
)

function App(): React.JSX.Element {
  return (
    <Suspense fallback={<AppSkeleton />}>
      <FloorPlanEditor />
    </Suspense>
  )
}

export default App
