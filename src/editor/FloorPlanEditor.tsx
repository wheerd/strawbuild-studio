import { useCallback, useEffect, useRef, useState } from 'react'
import { ErrorBoundary } from 'react-error-boundary'

import { ConfigurationModal } from '@/construction/config/components/ConfigurationModal'
import { type ConfigTab, ConfigurationModalContext } from '@/construction/config/context/ConfigurationModalContext'
import { FeatureErrorFallback } from '@/shared/components/ErrorBoundary'
import { InitialSyncOverlay } from '@/shared/components/InitialSyncOverlay'
import { WelcomeModal } from '@/shared/components/WelcomeModal'
import { useWelcomeModal } from '@/shared/hooks/useWelcomeModal'
import { initializeCloudSync } from '@/shared/services/CloudSyncManager'

import { MainToolbar } from './MainToolbar'
import { SidePanel } from './SidePanel'
import { ConstraintStatusOverlay } from './components/ConstraintStatusOverlay'
import { ViewModeToggle } from './components/ViewModeToggle'
import { useAutoFitOnProjectChange } from './hooks/useAutoFitOnProjectChange'
import { FloorPlanStage } from './layers/FloorPlanStage'
import { LengthInputComponent } from './services/length-input'
import { StatusBar } from './status-bar/StatusBar'
import { keyboardShortcutManager } from './tools/system/KeyboardShortcutManager'

export function FloorPlanEditor(): React.JSX.Element {
  useEffect(() => void initializeCloudSync(), [])
  useAutoFitOnProjectChange()
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
        'input[type=text], input[type=email], input[type=password], input[type=number], input:not([type]), select, textarea, [contenteditable="true"]'
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

  return (
    <ConfigurationModalContext.Provider value={{ openConfiguration }}>
      <div
        ref={containerRef}
        className="bg-muted m-0 grid h-screen w-screen grid-rows-[auto_1fr] p-0"
        tabIndex={0}
        data-testid="floor-plan-editor"
      >
        {/* Top Toolbar - Tabs for tool groups + tools */}
        <div className="border-border border-b">
          <MainToolbar onInfoClick={openManually} />
        </div>

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

        {/* Main Content Area - Editor + Side Panel */}
        <div className="relative grid grid-cols-[1fr_320px] gap-0 overflow-hidden p-0">
          <InitialSyncOverlay />
          {/* Editor Area */}
          <div className="bg-background border-border relative overflow-hidden border-r">
            <ErrorBoundary FallbackComponent={FeatureErrorFallback}>
              <ViewModeToggle />
              <FloorPlanStage width={dimensions.width} height={dimensions.height} />
              <ConstraintStatusOverlay />
              <StatusBar />
              <LengthInputComponent />
            </ErrorBoundary>
          </div>

          {/* Right Side Panel */}
          <ErrorBoundary FallbackComponent={FeatureErrorFallback}>
            <SidePanel />
          </ErrorBoundary>
        </div>
      </div>
    </ConfigurationModalContext.Provider>
  )
}
