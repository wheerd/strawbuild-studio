import { Box, Grid } from '@radix-ui/themes'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ErrorBoundary } from 'react-error-boundary'

import { ConfigurationModal } from '@/construction/config/components/ConfigurationModal'
import { type ConfigTab, ConfigurationModalContext } from '@/construction/config/context/ConfigurationModalContext'
import { FeatureErrorFallback } from '@/shared/components/ErrorBoundary'
import { WelcomeModal } from '@/shared/components/WelcomeModal'
import { useWelcomeModal } from '@/shared/hooks/useWelcomeModal'
import { CanvasThemeProvider } from '@/shared/theme/CanvasThemeContext'

import { MainToolbar } from './MainToolbar'
import { SidePanel } from './SidePanel'
import { FloorPlanStage } from './canvas/layers/FloorPlanStage'
import { useAutoFitOnHydration } from './hooks/useAutoFitOnHydration'
import { LengthInputComponent } from './services/length-input'
import { StatusBar } from './status-bar/StatusBar'
import { keyboardShortcutManager } from './tools/system/KeyboardShortcutManager'

export function FloorPlanEditor(): React.JSX.Element {
  useAutoFitOnHydration()
  const { isOpen, mode, openManually, handleAccept } = useWelcomeModal()

  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

  const [configModalOpen, setConfigModalOpen] = useState(false)
  const [configActiveTab, setConfigActiveTab] = useState<ConfigTab>('materials')
  const [configSelectedItemId, setConfigSelectedItemId] = useState<string | undefined>()

  const openConfiguration = useCallback((tab: ConfigTab, itemId?: string) => {
    setConfigActiveTab(tab)
    setConfigSelectedItemId(itemId)
    setConfigModalOpen(true)
  }, [])

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't intercept keyboard events when user is typing in input fields
      const target = event.target as HTMLElement
      const isInputElement = target.matches(
        'input[type=text], input[type=number], input:not([type]), select, textarea, [contenteditable="true"]'
      )

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
      const isInputElement = target.matches(
        'input[type=text], input[type=number], input:not([type]), select, textarea, [contenteditable="true"]'
      )

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
      const sidePanelWidth = 320

      const newDimensions = {
        width: Math.max(offsetWidth - sidePanelWidth, 400),
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

    // Check if the click target is inside the side panel
    const isInSidePanel = target.closest('.side-panel')

    // Only focus the container if we're clicking on the canvas area
    if (!isInteractiveElement && !isInSidePanel && containerRef.current) {
      containerRef.current.focus()
    }
  }, [])

  return (
    <ConfigurationModalContext.Provider value={{ openConfiguration }}>
      <Grid
        ref={containerRef}
        rows="auto 1fr"
        style={{
          width: '100vw',
          height: '100vh',
          margin: 0,
          padding: 0,
          backgroundColor: 'var(--gray-2)'
        }}
        tabIndex={0}
        onClick={handleClick}
        data-testid="floor-plan-editor"
      >
        {/* Top Toolbar - Tabs for tool groups + tools */}
        <Box style={{ zIndex: 100, borderBottom: '1px solid var(--gray-6)' }}>
          <MainToolbar onInfoClick={openManually} />
        </Box>

        {/* Configuration Modal - Rendered at app level */}
        <ConfigurationModal
          open={configModalOpen}
          onOpenChange={setConfigModalOpen}
          activeTab={configActiveTab}
          onTabChange={setConfigActiveTab}
          initialSelectionId={configSelectedItemId}
        />

        {/* Welcome Modal */}
        <WelcomeModal isOpen={isOpen} mode={mode} onAccept={handleAccept} />

        {/* Main Content Area - Canvas + Side Panel */}
        <Grid p="0" gap="0" columns="1fr 320px" style={{ overflow: 'hidden' }}>
          {/* Canvas Area */}
          <Box
            style={{
              position: 'relative',
              overflow: 'hidden',
              backgroundColor: 'var(--color-background)',
              borderRight: '1px solid var(--gray-6)'
            }}
          >
            <ErrorBoundary FallbackComponent={FeatureErrorFallback}>
              <CanvasThemeProvider>
                <FloorPlanStage width={dimensions.width} height={dimensions.height} />
                <StatusBar />
                <LengthInputComponent />
              </CanvasThemeProvider>
            </ErrorBoundary>
          </Box>

          {/* Right Side Panel */}
          <ErrorBoundary FallbackComponent={FeatureErrorFallback}>
            <SidePanel />
          </ErrorBoundary>
        </Grid>
      </Grid>
    </ConfigurationModalContext.Provider>
  )
}
