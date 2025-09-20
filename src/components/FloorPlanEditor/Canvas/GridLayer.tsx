import React, { useEffect } from 'react'
import { Layer, Line } from 'react-konva/lib/ReactKonvaCore'
import { useShowGrid, useEditorStore } from '@/components/FloorPlanEditor/hooks/useEditorStore'
import { COLORS } from '@/theme/colors'

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

// Calculate appropriate grid size based on zoom level
function calculateDynamicGridSize(zoom: number): number {
  // Target spacing in pixels on screen
  const targetPixelSpacing = 30

  // Calculate world spacing needed to achieve target pixel spacing
  const worldSpacing = targetPixelSpacing / zoom

  // Nice grid values in mm (10mm, 20mm, 50mm, 100mm, 200mm, 500mm, 1m, 2m, 5m, 10m, 20m, 50m)
  const niceValues = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000]

  // Find the closest nice value that's >= worldSpacing
  const gridSize = niceValues.find(value => value >= worldSpacing) ?? niceValues[niceValues.length - 1]

  return gridSize
}

export function GridLayer({ width = 800, height = 600, viewport }: GridLayerProps): React.JSX.Element {
  const showGrid = useShowGrid()
  const setGridSize = useEditorStore(state => state.setGridSize)

  // Calculate dynamic grid size based on current zoom
  const dynamicGridSize = calculateDynamicGridSize(viewport.zoom)

  // Update the store's gridSize for display purposes
  useEffect(() => {
    setGridSize(dynamicGridSize)
  }, [dynamicGridSize, setGridSize])

  if (!showGrid) {
    return <Layer name="grid" />
  }

  const lines: React.JSX.Element[] = []

  const startX = Math.floor(-viewport.panX / viewport.zoom / dynamicGridSize) * dynamicGridSize
  const endX = Math.ceil((width - viewport.panX) / viewport.zoom / dynamicGridSize) * dynamicGridSize
  const startY = -Math.floor(-viewport.panY / viewport.zoom / dynamicGridSize) * dynamicGridSize
  const endY = -Math.ceil((height - viewport.panY) / viewport.zoom / dynamicGridSize) * dynamicGridSize

  // Calculate stroke width that scales appropriately with zoom
  const baseStrokeWidth = 1
  const strokeWidth = Math.max(0.5, baseStrokeWidth / viewport.zoom)

  for (let x = startX; x <= endX; x += dynamicGridSize) {
    lines.push(
      <Line
        key={`v-${x}`}
        points={[x, startY, x, endY]}
        stroke={COLORS.canvas.grid}
        strokeWidth={strokeWidth}
        listening={false}
      />
    )
  }

  for (let y = startY; y >= endY; y -= dynamicGridSize) {
    lines.push(
      <Line
        key={`h-${y}`}
        points={[startX, y, endX, y]}
        stroke={COLORS.canvas.grid}
        strokeWidth={strokeWidth}
        listening={false}
      />
    )
  }

  return (
    <Layer name="grid" listening={false}>
      {lines}
    </Layer>
  )
}
