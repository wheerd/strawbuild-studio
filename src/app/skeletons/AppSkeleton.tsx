import { Box, Flex } from '@radix-ui/themes'
import React from 'react'

import { CanvasSkeleton, PropertiesPanelSkeleton, ToolbarSkeleton } from '.'

/**
 * App-level skeleton that shows when React has loaded but FloorPlanEditor is still loading
 * This is a more refined version of the HTML skeleton
 */
export function AppSkeleton(): React.JSX.Element {
  return (
    <Box
      style={{
        width: '100vw',
        height: '100vh',
        margin: 0,
        padding: 0,
        overflow: 'hidden',
        backgroundColor: 'var(--gray-2)'
      }}
      data-testid="app-skeleton"
    >
      {/* Top Toolbar Skeleton */}
      <Box style={{ flexShrink: 0, zIndex: 100, borderBottom: '1px solid var(--gray-6)' }}>
        <ToolbarSkeleton />
      </Box>

      {/* Main Content Area - Canvas + Properties Panel */}
      <Flex style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
        {/* Canvas Area Skeleton */}
        <CanvasSkeleton />

        {/* Right Properties Panel Skeleton */}
        <Box
          style={{
            width: '320px',
            flexShrink: 0,
            backgroundColor: 'var(--gray-2)',
            overflowY: 'auto'
          }}
        >
          <PropertiesPanelSkeleton />
        </Box>
      </Flex>

      {/* Enhanced loading indicator */}
      <Box
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          padding: '12px 16px',
          backgroundColor: 'var(--gray-12)',
          color: 'white',
          borderRadius: 'var(--radius-3)',
          fontSize: '13px',
          fontWeight: '500',
          zIndex: 1000,
          boxShadow: 'var(--shadow-4)'
        }}
      >
        ⚡ Initializing tools...
      </Box>
    </Box>
  )
}
