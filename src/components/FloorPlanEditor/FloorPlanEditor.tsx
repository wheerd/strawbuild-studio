import { useState, useEffect, useRef, useCallback } from 'react'
import { FloorPlanStage } from './Canvas/FloorPlanStage'
import { GridSizeDisplay } from './GridSizeDisplay'
import { StoreySelector } from './StoreySelector'
import { useModelStore } from '@/model/store'
import { useEditorStore } from './hooks/useEditorStore'
import { ToolContextProvider, MainToolbar, PropertiesPanel, initializeToolSystem } from './Tools'
import { toolManager } from './Tools/ToolSystem/ToolManager'
import { keyboardShortcutManager } from './Tools/ToolSystem/KeyboardShortcutManager'
import { useToolContext } from './Tools/ToolSystem/ToolContext'

// Inner component that has access to ToolContext
function FloorPlanEditorContent(): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const toolContext = useToolContext()
  const toolContextRef = useRef(toolContext)

  // Keep toolContextRef updated
  useEffect(() => {
    toolContextRef.current = toolContext
  }, [toolContext])

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't intercept keyboard events when user is typing in input fields
      const target = event.target as HTMLElement
      const isInputElement = target.matches('input, select, button, textarea, [contenteditable="true"]')

      if (isInputElement) {
        return // Let the input handle the event normally
      }

      // Use ref to get current context without dependency issues
      if (keyboardShortcutManager.handleKeyDown(event, toolContextRef.current)) {
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
    <div
      ref={containerRef}
      className="w-screen h-screen flex flex-col bg-gray-50 m-0 p-0 overflow-hidden"
      tabIndex={0}
      onClick={handleClick}
      data-testid="floor-plan-editor"
    >
      {/* Top Toolbar - Tabs for tool groups + tools */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 shadow-sm z-[100]">
        <MainToolbar />
      </div>

      {/* Main Content Area - Canvas + Properties Panel */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Canvas Area */}
        <div className="flex-1 relative overflow-hidden bg-white border-r border-gray-200">
          <FloorPlanStage width={dimensions.width} height={dimensions.height} />
          <GridSizeDisplay />
          <StoreySelector />
        </div>

        {/* Right Properties Panel */}
        <div className="w-80 flex-shrink-0 bg-gray-50 border-l border-gray-200 overflow-y-auto flex flex-col">
          <PropertiesPanel />
        </div>
      </div>
    </div>
  )
}

export function FloorPlanEditor(): React.JSX.Element {
  const [isToolSystemReady, setIsToolSystemReady] = useState(false)

  const storeys = useModelStore(state => state.storeys)
  const setActiveStorey = useEditorStore(state => state.setActiveStorey)

  // Initialize tool system once
  useEffect(() => {
    if (!isToolSystemReady) {
      try {
        initializeToolSystem(toolManager)
        setIsToolSystemReady(true)
      } catch (error) {
        console.error('Failed to initialize tool system:', error)
      }
    }
  }, [isToolSystemReady])

  // Sync editor store with model store's default floor
  useEffect(() => {
    if (storeys.size > 0) {
      const firstStorey = Array.from(storeys.values())[0]
      if (firstStorey != null) {
        setActiveStorey(firstStorey.id)
      }
    }
  }, [storeys, setActiveStorey])

  if (!isToolSystemReady) {
    return (
      <div className="floor-plan-editor loading">
        <div className="loading-message">
          <p>Initializing tool system...</p>
        </div>
      </div>
    )
  }

  return (
    <ToolContextProvider>
      <FloorPlanEditorContent />
    </ToolContextProvider>
  )
}
