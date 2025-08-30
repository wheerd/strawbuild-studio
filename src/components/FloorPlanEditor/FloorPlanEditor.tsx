import { useState, useEffect, useRef, useCallback } from 'react'
import { FloorPlanStage } from './Canvas/FloorPlanStage'
import { useFloors } from '@/model/store'
import { useEditorStore } from './hooks/useEditorStore'
import { ToolContextProvider, MainToolbar, PropertiesPanel, initializeToolSystem } from './Tools'
import { toolManager } from './Tools/ToolSystem/ToolManager'
import { keyboardShortcutManager } from './Tools/ToolSystem/KeyboardShortcutManager'
import { useToolContext } from './Tools/ToolSystem/ToolContext'
import './FloorPlanEditor.css'

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
      const toolbarHeight = 120 // Increased for tab-style toolbar with two rows
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

  const handleClick = useCallback(() => {
    // Ensure the editor has focus for keyboard events
    if (containerRef.current) {
      containerRef.current.focus()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="floor-plan-editor full-screen"
      tabIndex={0}
      onClick={handleClick}
      data-testid="floor-plan-editor"
    >
      {/* Top Toolbar - Tabs for tool groups + tools */}
      <div className="top-toolbar">
        <MainToolbar />
      </div>

      {/* Main Content Area - Canvas + Properties Panel */}
      <div className="editor-content">
        {/* Canvas Area */}
        <div className="canvas-section">
          <FloorPlanStage width={dimensions.width} height={dimensions.height} />
        </div>

        {/* Right Properties Panel */}
        <div className="right-panel">
          <PropertiesPanel />
        </div>
      </div>
    </div>
  )
}

export function FloorPlanEditor(): React.JSX.Element {
  const [isToolSystemReady, setIsToolSystemReady] = useState(false)

  const floors = useFloors()
  const setActiveFloor = useEditorStore(state => state.setActiveFloor)

  // Initialize tool system once
  useEffect(() => {
    if (!isToolSystemReady) {
      try {
        initializeToolSystem(toolManager)
        setIsToolSystemReady(true)
        console.log('Tool system ready')
      } catch (error) {
        console.error('Failed to initialize tool system:', error)
      }
    }
  }, [isToolSystemReady])

  // Sync editor store with model store's default floor
  useEffect(() => {
    if (floors.size > 0) {
      const groundFloor = Array.from(floors.values())[0]
      if (groundFloor != null) {
        setActiveFloor(groundFloor.id)
      }
    }
  }, [floors, setActiveFloor])

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
