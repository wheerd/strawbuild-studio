import { useCallback } from 'react'
import { useActiveTool, useEditorStore } from '../hooks/useEditorStore'
import { useModelStore } from '../../../model/store'
import { FloorSelector } from './FloorSelector'

export function Toolbar (): React.JSX.Element {
  const activeTool = useActiveTool()
  
  // Use individual selectors instead of useEditorActions() to avoid object creation
  const setActiveTool = useEditorStore(state => state.setActiveTool)
  const setShowGrid = useEditorStore(state => state.setShowGrid)
  const setGridSize = useEditorStore(state => state.setGridSize)
  
  // Use individual selectors for model actions
  const addConnectionPoint = useModelStore(state => state.addConnectionPoint)
  const addWall = useModelStore(state => state.addWall)
  const addRoom = useModelStore(state => state.addRoom)

  const tools = [
    { id: 'select' as const, label: 'Select', icon: '↖' },
    { id: 'wall' as const, label: 'Wall', icon: '▬' },
    { id: 'room' as const, label: 'Room', icon: '⬜' }
  ]

  const createSampleBuilding = useCallback(() => {
    const point1 = addConnectionPoint({ x: 100, y: 100 })
    const point2 = addConnectionPoint({ x: 400, y: 100 })
    const point3 = addConnectionPoint({ x: 400, y: 300 })
    const point4 = addConnectionPoint({ x: 100, y: 300 })

    const wall1 = addWall(point1.id, point2.id, 200, 3000)
    const wall2 = addWall(point2.id, point3.id, 200, 3000)
    const wall3 = addWall(point3.id, point4.id, 200, 3000)
    const wall4 = addWall(point4.id, point1.id, 200, 3000)

    addRoom('Living Room', [wall1.id, wall2.id, wall3.id, wall4.id])
  }, [addConnectionPoint, addWall, addRoom])

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
          onClick={() => setGridSize(25)}
          title='Small Grid'
        >
          25mm
        </button>
        <button
          className='tool-button'
          onClick={() => setGridSize(50)}
          title='Medium Grid'
        >
          50mm
        </button>
        <button
          className='tool-button'
          onClick={() => setGridSize(100)}
          title='Large Grid'
        >
          100mm
        </button>
      </div>

      <FloorSelector />
    </div>
  )
}
