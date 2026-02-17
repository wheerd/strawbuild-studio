import React from 'react'
import { createBrowserRouter } from 'react-router-dom'

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
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <FloorPlanEditor /> },
      { path: 'auth/:tab', element: <AuthModalRoute /> },
      { path: 'auth/update-password', element: <UpdatePasswordModalRoute /> }
    ]
  }
])
