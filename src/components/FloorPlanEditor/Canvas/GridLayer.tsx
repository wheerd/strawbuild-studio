import React from 'react'
import { Layer, Line } from 'react-konva'
import { useEditorStore } from '@/components/FloorPlanEditor/hooks/useEditorStore'

interface ViewportState {
  zoom: number
  panX: number
  panY: number
}

interface GridLayerProps {
  width?: number
  height?: number
  viewport: ViewportState
}

export function GridLayer ({ width = 800, height = 600, viewport }: GridLayerProps): React.JSX.Element {
  // Use individual selectors instead of useGridSettings() to avoid object creation
  const showGrid = useEditorStore(state => state.showGrid)
  const gridSize = useEditorStore(state => state.gridSize)

  if (!showGrid) {
    return <Layer name='grid' />
  }

  const lines: React.JSX.Element[] = []

  const startX = Math.floor(-viewport.panX / viewport.zoom / gridSize) * gridSize
  const endX = Math.ceil((width - viewport.panX) / viewport.zoom / gridSize) * gridSize
  const startY = Math.floor(-viewport.panY / viewport.zoom / gridSize) * gridSize
  const endY = Math.ceil((height - viewport.panY) / viewport.zoom / gridSize) * gridSize

  for (let x = startX; x <= endX; x += gridSize) {
    lines.push(
      <Line
        key={`v-${x}`}
        points={[x, startY, x, endY]}
        stroke='#e0e0e0'
        strokeWidth={0.5}
        listening={false}
      />
    )
  }

  for (let y = startY; y <= endY; y += gridSize) {
    lines.push(
      <Line
        key={`h-${y}`}
        points={[startX, y, endX, y]}
        stroke='#e0e0e0'
        strokeWidth={0.5}
        listening={false}
      />
    )
  }

  return (
    <Layer name='grid' listening={false}>
      {lines}
    </Layer>
  )
}
