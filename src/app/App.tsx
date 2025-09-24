import React, { Suspense } from 'react'
import { Loading } from '../shared/components/Loading'

const FloorPlanEditor = React.lazy(
  async () =>
    await import('../editor/FloorPlanEditor').then(module => ({
      default: module.FloorPlanEditor
    }))
)

function App(): React.JSX.Element {
  return (
    <Suspense fallback={<Loading />}>
      <FloorPlanEditor />
    </Suspense>
  )
}

export default App
