import React from 'react'
import { useEditorStore } from '@/components/FloorPlanEditor/hooks/useEditorStore'
import { formatLength } from '@/utils/formatLength'
import type { Length } from '@/types/geometry'

export function GridSizeDisplay(): React.JSX.Element {
  const showGrid = useEditorStore(state => state.showGrid)
  const gridSize = useEditorStore(state => state.gridSize)

  if (!showGrid) {
    return <></>
  }

  return (
    <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1.5 rounded text-xs font-medium font-mono pointer-events-none z-10 backdrop-blur-sm shadow-lg">
      Grid: {formatLength(gridSize as Length)}
    </div>
  )
}
