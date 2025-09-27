import { Box, Flex } from '@radix-ui/themes'
import { useCallback, useEffect, useRef, useState } from 'react'

import { FloorPlanStage } from './canvas/layers/FloorPlanStage'
import { AutoSaveIndicator } from './overlays/AutoSaveIndicator'
import { GridSizeDisplay } from './overlays/GridSizeDisplay'
import { StoreySelector } from './overlays/StoreySelector'
import { PropertiesPanel } from './properties/PropertiesPanel'
import { LengthInputComponent } from './services/length-input'
import { MainToolbar } from './toolbar/MainToolbar'
import { keyboardShortcutManager } from './tools/system/KeyboardShortcutManager'

function FloorPlanEditorContent(): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't intercept keyboard events when user is typing in input fields
      const target = event.target as HTMLElement
      const isInputElement = target.matches('input, select, button, textarea, [contenteditable="true"]')

      if (isInputElement) {
        return // Let the input handle the event normally
      }

      // Handle keyboard shortcuts directly with new tool store
      if (keyboardShortcutManager.handleKeyDown(event)) {
        event.preventDefault()
      }
    },
    [] // Stable handler with no dependencies
  )
  // Handle keyboard shortcuts
  const handleKeyUp = useCallback(
    (event: KeyboardEvent) => {
      // Don't intercept keyboard events when user is typing in input fields
      const target = event.target as HTMLElement
      const isInputElement = target.matches('input, select, button, textarea, [contenteditable="true"]')

      if (isInputElement) {
        return // Let the input handle the event normally
      }

      // Handle keyboard shortcuts directly with new tool store
      if (keyboardShortcutManager.handleKeyUp(event)) {
        event.preventDefault()
      }
    },
    [] // Stable handler with no dependencies
  )

  // Add keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])

  useEffect(() => {
    document.addEventListener('keyup', handleKeyUp)
    return () => {
      document.removeEventListener('keyup', handleKeyUp)
    }
  }, [handleKeyUp])

  const updateDimensions = useCallback(() => {
    if (containerRef.current != null) {
      const { offsetWidth, offsetHeight } = containerRef.current
      const toolbarHeight = 64 // Single row toolbar with icon buttons
      const propertiesPanelWidth = 320

      const newDimensions = {
        width: Math.max(offsetWidth - propertiesPanelWidth, 400),
        height: Math.max(offsetHeight - toolbarHeight, 400)
      }

      setDimensions(prevDimensions => {
        if (prevDimensions.width !== newDimensions.width || prevDimensions.height !== newDimensions.height) {
          return newDimensions
        }
        return prevDimensions
      })
    }
  }, [])

  useEffect(() => {
    updateDimensions()

    const handleResize = (): void => {
      updateDimensions()
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [updateDimensions])

  const handleClick = useCallback((event: React.MouseEvent) => {
    // Only steal focus if clicking on the canvas area, not on UI elements like inputs
    const target = event.target as HTMLElement

    // Check if the click target is an input, select, button, or other interactive element
    const isInteractiveElement = target.matches('input, select, button, textarea, [contenteditable="true"]')

    // Check if the click target is inside the properties panel
    const isInPropertiesPanel = target.closest('.properties-panel')

    // Only focus the container if we're clicking on the canvas area
    if (!isInteractiveElement && !isInPropertiesPanel && containerRef.current) {
      containerRef.current.focus()
    }
  }, [])

  return (
    <Box
      ref={containerRef}
      style={{
        width: '100vw',
        height: '100vh',
        margin: 0,
        padding: 0,
        overflow: 'hidden',
        backgroundColor: 'var(--gray-2)'
      }}
      tabIndex={0}
      onClick={handleClick}
      data-testid="floor-plan-editor"
    >
      {/* Top Toolbar - Tabs for tool groups + tools */}
      <Box style={{ flexShrink: 0, zIndex: 100, borderBottom: '1px solid var(--gray-6)' }}>
        <MainToolbar />
      </Box>

      {/* Main Content Area - Canvas + Properties Panel */}
      <Flex style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
        {/* Canvas Area */}
        <Box
          style={{
            flex: 1,
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: 'white',
            borderRight: '1px solid var(--gray-6)'
          }}
        >
          <FloorPlanStage width={dimensions.width} height={dimensions.height} />
          <AutoSaveIndicator />
          <GridSizeDisplay />
          <StoreySelector />
          <LengthInputComponent />
        </Box>

        {/* Right Properties Panel */}
        <Box
          style={{
            width: '320px',
            flexShrink: 0,
            backgroundColor: 'var(--gray-2)',
            overflowY: 'auto'
          }}
        >
          <PropertiesPanel />
        </Box>
      </Flex>
    </Box>
  )
}

export function FloorPlanEditor(): React.JSX.Element {
  // Tool system is now hardcoded and ready immediately - no initialization needed!
  return <FloorPlanEditorContent />
}
