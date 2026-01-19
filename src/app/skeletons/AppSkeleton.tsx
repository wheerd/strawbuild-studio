import React from 'react'

import { EditorSkeleton, SidePanelSkeleton, ToolbarSkeleton } from '.'

export function AppSkeleton(): React.JSX.Element {
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        margin: 0,
        padding: 0,
        overflow: 'hidden',
        backgroundColor: 'var(--color-gray-200)'
      }}
      data-testid="app-skeleton"
    >
      <div style={{ flexShrink: 0, zIndex: 100, borderBottom: '1px solid var(--color-gray-600)' }}>
        <ToolbarSkeleton />
      </div>

      <div className="flex" style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
        <EditorSkeleton />

        <div
          style={{
            width: '320px',
            flexShrink: 0,
            backgroundColor: 'var(--color-gray-200)',
            overflowY: 'auto'
          }}
        >
          <SidePanelSkeleton />
        </div>
      </div>
    </div>
  )
}
