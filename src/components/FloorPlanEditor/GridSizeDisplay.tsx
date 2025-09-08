import React from 'react'
import { useEditorStore } from '@/components/FloorPlanEditor/hooks/useEditorStore'

// Format grid size for display with appropriate units
function formatGridSize(sizeInMm: number): string {
  if (sizeInMm < 1000) {
    return `${sizeInMm}mm`
  } else {
    const sizeInM = sizeInMm / 1000
    // Use integer display for whole meters, otherwise show one decimal
    if (sizeInM % 1 === 0) {
      return `${sizeInM}m`
    } else {
      return `${sizeInM.toFixed(1)}m`
    }
  }
}

export function GridSizeDisplay(): React.JSX.Element {
  const showGrid = useEditorStore(state => state.showGrid)
  const gridSize = useEditorStore(state => state.gridSize)

  if (!showGrid) {
    return <></>
  }

  return (
    <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1.5 rounded text-xs font-medium font-mono pointer-events-none z-[1000] backdrop-blur-sm shadow-lg">
      Grid: {formatGridSize(gridSize)}
    </div>
  )
}
