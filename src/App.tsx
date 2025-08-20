import React, { Suspense } from 'react'
import { Loading } from './components/Loading'
import './App.css'

const FloorPlanEditor = React.lazy(async () => await import('./components/FloorPlanEditor/FloorPlanEditor').then(module => ({ default: module.FloorPlanEditor })))

function App (): React.JSX.Element {
  return (
    <Suspense fallback={<Loading />}>
      <FloorPlanEditor />
    </Suspense>
  )
}

export default App
