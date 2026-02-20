import React from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { createBrowserRouter } from 'react-router-dom'

import { ErrorFallback } from '@/shared/components/ErrorBoundary'

import { Layout } from './Layout'
import { AuthModalRoute } from './user/AuthModalRoute'
import { UpdatePasswordModalRoute } from './user/UpdatePasswordModalRoute'

const FloorPlanEditor = React.lazy(
  async () =>
    await import('@/editor/FloorPlanEditor').then(module => ({
      default: module.FloorPlanEditor
    }))
)

export const router = createBrowserRouter([
  {
    path: '*',
    element: (
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <Layout />
      </ErrorBoundary>
    ),
    children: [
      { index: true, element: <FloorPlanEditor /> },
      { path: 'auth/:tab', element: <AuthModalRoute />, handle: { isModal: true } },
      { path: 'auth/update-password', element: <UpdatePasswordModalRoute />, handle: { isModal: true } }
    ]
  }
])
