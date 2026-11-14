import React, { Suspense, lazy } from 'react'
import { Navigate } from 'react-router-dom'

import { Skeleton } from '@/shared/ui/components/skeleton'

import { ConfigLayout } from './ConfigLayout'

const MaterialsConfigContent = lazy(async () => {
  const module = await import('@/materials/ui/MaterialsConfigContent')
  return { default: module.MaterialsConfigContent }
})

const LayerSetsContent = lazy(async () => {
  const module = await import('./layers/LayerSetsContent')
  return { default: module.LayerSetsContent }
})

const PerimeterWallAssemblyContent = lazy(async () => {
  const module = await import('./wall-assembly/WallAssemblyContent')
  return { default: module.WallAssemblyContent }
})

const InteriorWallAssemblyContent = lazy(async () => {
  const module = await import('./interior-wall-assembly/InteriorWallAssemblyContent')
  return { default: module.InteriorWallAssemblyContent }
})

const OpeningAssemblyContent = lazy(async () => {
  const module = await import('./opening-assembly/OpeningAssemblyContent')
  return { default: module.OpeningAssemblyContent }
})

const FloorAssemblyConfigContent = lazy(async () => {
  const module = await import('./floor-assembly/FloorAssemblyConfigContent')
  return { default: module.FloorAssemblyConfigContent }
})

const RoofAssemblyConfigContent = lazy(async () => {
  const module = await import('./roof-assembly/RoofAssemblyConfigContent')
  return { default: module.RoofAssemblyConfigContent }
})

const RingBeamAssemblyContent = lazy(async () => {
  const module = await import('./ring-beam-assembly/RingBeamAssemblyContent')
  return { default: module.RingBeamAssemblyContent }
})

function ConfigContentSkeleton(): React.JSX.Element {
  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <Skeleton className="h-10 w-48" />
      <div className="flex gap-4">
        <Skeleton className="h-96 w-64 shrink-0" />
        <Skeleton className="h-96 flex-1" />
      </div>
    </div>
  )
}

export const configRoutes = {
  path: 'config',
  element: <ConfigLayout />,
  children: [
    { index: true, element: <Navigate to="materials" replace /> },
    {
      path: 'materials/:itemId?',
      element: (
        <Suspense fallback={<ConfigContentSkeleton />}>
          <MaterialsConfigContent />
        </Suspense>
      )
    },
    {
      path: 'layers/:itemId?',
      element: (
        <Suspense fallback={<ConfigContentSkeleton />}>
          <LayerSetsContent />
        </Suspense>
      )
    },
    {
      path: 'perimeter-walls/:itemId?',
      element: (
        <Suspense fallback={<ConfigContentSkeleton />}>
          <PerimeterWallAssemblyContent />
        </Suspense>
      )
    },
    {
      path: 'walls/:itemId?',
      element: <Navigate to="../perimeter-walls" replace />
    },
    {
      path: 'interior-walls/:itemId?',
      element: (
        <Suspense fallback={<ConfigContentSkeleton />}>
          <InteriorWallAssemblyContent />
        </Suspense>
      )
    },
    {
      path: 'openings/:itemId?',
      element: (
        <Suspense fallback={<ConfigContentSkeleton />}>
          <OpeningAssemblyContent />
        </Suspense>
      )
    },
    {
      path: 'floors/:itemId?',
      element: (
        <Suspense fallback={<ConfigContentSkeleton />}>
          <FloorAssemblyConfigContent />
        </Suspense>
      )
    },
    {
      path: 'roofs/:itemId?',
      element: (
        <Suspense fallback={<ConfigContentSkeleton />}>
          <RoofAssemblyConfigContent />
        </Suspense>
      )
    },
    {
      path: 'ringbeams/:itemId?',
      element: (
        <Suspense fallback={<ConfigContentSkeleton />}>
          <RingBeamAssemblyContent />
        </Suspense>
      )
    }
  ]
}
