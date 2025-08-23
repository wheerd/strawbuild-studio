import { useCallback } from 'react'
import { useActiveTool, useEditorStore, useActiveFloorId, useViewport, useSelectedEntity } from '@/components/FloorPlanEditor/hooks/useEditorStore'
import { useModelStore } from '@/model/store'
import { FloorSelector } from './FloorSelector'
import { calculateFloorBounds } from '@/model/operations'
import { createPoint2D, createLength } from '@/types/geometry'

export function Toolbar (): React.JSX.Element {
  const activeTool = useActiveTool()
  const activeFloorId = useActiveFloorId()
  const viewport = useViewport()
  const selectedEntityId = useSelectedEntity()

  // Use individual selectors instead of useEditorActions() to avoid object creation
  const setActiveTool = useEditorStore(state => state.setActiveTool)
  const setShowGrid = useEditorStore(state => state.setShowGrid)
  const setGridSize = useEditorStore(state => state.setGridSize)
  const setViewport = useEditorStore(state => state.setViewport)
  const deleteSelectedEntity = useEditorStore(state => state.deleteSelectedEntity)

  // Use individual selectors for model actions
  const addPoint = useModelStore(state => state.addPoint)
  const addWall = useModelStore(state => state.addWall)

  const tools = [
    { id: 'select' as const, label: 'Select', icon: '↖' },
    { id: 'wall' as const, label: 'Wall', icon: '▬' },
    { id: 'room' as const, label: 'Room', icon: '⬜' }
  ]

  const createSampleBuilding = useCallback(() => {
    // Create a 3m x 4m room (3000mm x 4000mm) with realistic dimensions
    const point1 = addPoint(createPoint2D(0, 0), activeFloorId) // Bottom-left
    const point2 = addPoint(createPoint2D(4000, 0), activeFloorId) // Bottom-right (4m wide)
    const point3 = addPoint(createPoint2D(4000, 3000), activeFloorId) // Top-right (3m deep)
    const point4 = addPoint(createPoint2D(0, 3000), activeFloorId) // Top-left

    // Create walls with realistic thickness (200mm = 20cm) and height (2700mm = 2.7m)
    // The room will be automatically created when the wall loop is completed
    addWall(point1.id, point2.id, activeFloorId, createLength(200), createLength(2700))
    addWall(point2.id, point3.id, activeFloorId, createLength(200), createLength(2700))
    addWall(point3.id, point4.id, activeFloorId, createLength(200), createLength(2700))
    addWall(point4.id, point1.id, activeFloorId, createLength(200), createLength(2700))

    // No need to manually add room - it will be automatically created by the loop detection
  }, [addPoint, addWall, activeFloorId])

  const fitToView = useCallback(() => {
    // Get the current model state to calculate floor bounds
    const modelState = useModelStore.getState()
    const bounds = calculateFloorBounds(activeFloorId, modelState)

    if (bounds == null) {
      // No content to fit to, reset to default view
      setViewport({
        zoom: 1,
        panX: 0,
        panY: 0
      })
      return
    }

    const padding = 50 // pixels of padding around content
    const boundsWidth = bounds.maxX - bounds.minX
    const boundsHeight = bounds.maxY - bounds.minY

    if (boundsWidth === 0 || boundsHeight === 0) {
      return
    }

    // Calculate zoom to fit content with padding
    const scaleX = (viewport.stageWidth - padding * 2) / boundsWidth
    const scaleY = (viewport.stageHeight - padding * 2) / boundsHeight
    const scale = Math.min(scaleX, scaleY, 2) // Max zoom of 2x

    // Calculate pan to center content
    const centerX = bounds.minX + boundsWidth / 2
    const centerY = bounds.minY + boundsHeight / 2
    const panX = viewport.stageWidth / 2 - centerX * scale
    const panY = viewport.stageHeight / 2 - centerY * scale

    setViewport({
      zoom: scale,
      panX,
      panY
    })
  }, [activeFloorId, viewport, setViewport])

  const handleDeleteSelected = useCallback(() => {
    if (selectedEntityId != null) {
      deleteSelectedEntity()
    }
  }, [selectedEntityId, deleteSelectedEntity])

  return (
    <div className='toolbar'>
      <div className='tool-group'>
        {tools.map(tool => (
          <button
            key={tool.id}
            className={`tool-button ${activeTool === tool.id ? 'active' : ''}`}
            onClick={() => setActiveTool(tool.id)}
            title={tool.label}
          >
            <span style={{ marginRight: '8px' }}>{tool.icon}</span>
            {tool.label}
          </button>
        ))}
      </div>

      <div className='tool-group'>
        <button
          className='tool-button'
          onClick={createSampleBuilding}
          title='Add Sample Room'
        >
          Sample
        </button>
        <button
          className={`tool-button ${selectedEntityId == null ? 'disabled' : ''}`}
          onClick={handleDeleteSelected}
          disabled={selectedEntityId == null}
          title={selectedEntityId != null ? `Delete selected ${selectedEntityId.split('_')[0]}` : 'No selection to delete'}
        >
          <span style={{ marginRight: '8px' }}>🗑️</span>
          Delete
        </button>
      </div>

      <div className='tool-group'>
        <button
          className='tool-button'
          onClick={() => setShowGrid(true)}
          title='Show Grid'
        >
          Grid
        </button>
        <button
          className='tool-button'
          onClick={() => setGridSize(250)}
          title='Fine Grid - 250mm'
        >
          250mm
        </button>
        <button
          className='tool-button'
          onClick={() => setGridSize(500)}
          title='Medium Grid - 500mm'
        >
          500mm
        </button>
        <button
          className='tool-button'
          onClick={() => setGridSize(1000)}
          title='Large Grid - 1m'
        >
          1m
        </button>
      </div>

      <div className='tool-group'>
        <button
          className='tool-button'
          onClick={fitToView}
          title='Fit active floor to view'
        >
          <span style={{ marginRight: '8px' }}>🔍</span>
          Fit View
        </button>
      </div>

      <FloorSelector />
    </div>
  )
}
