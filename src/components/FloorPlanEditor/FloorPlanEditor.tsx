import { useState, useEffect, useRef, useCallback } from 'react'
import { FloorPlanStage } from './Canvas/FloorPlanStage'
import { Toolbar } from './Tools/Toolbar'
import { useFloors } from '@/model/store'
import { useEditorStore } from './hooks/useEditorStore'
import './FloorPlanEditor.css'

export function FloorPlanEditor (): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const floors = useFloors()
  const setActiveFloor = useEditorStore(state => state.setActiveFloor)

  // Sync editor store with model store's default floor
  useEffect(() => {
    if (floors.size > 0) {
      const groundFloor = Array.from(floors.values())[0]
      if (groundFloor != null) {
        setActiveFloor(groundFloor.id)
      }
    }
  }, [floors, setActiveFloor])

  const updateDimensions = useCallback(() => {
    if (containerRef.current != null) {
      const { offsetWidth, offsetHeight } = containerRef.current
      const newDimensions = {
        width: offsetWidth > 0 ? offsetWidth : 800,
        height: Math.max(offsetHeight - 60, 400)
      }

      setDimensions(prevDimensions => {
        if (prevDimensions.width !== newDimensions.width ||
            prevDimensions.height !== newDimensions.height) {
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
    <div ref={containerRef} className='floor-plan-editor'>
      <Toolbar />
      <div className='canvas-container'>
        <FloorPlanStage
          width={dimensions.width}
          height={dimensions.height}
        />
      </div>
    </div>
  )
}
