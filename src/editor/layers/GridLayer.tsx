import { useEffect } from 'react'

import { useGridActions, useShowGrid } from '@/editor/hooks/useGrid'

interface ViewportState {
  zoom: number
  panX: number
  panY: number
}

interface SvgGridLayerProps {
  width?: number
  height?: number
  viewport: ViewportState
}

// Calculate appropriate grid size based on zoom level
export function calculateDynamicGridSize(zoom: number): number {
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
export function GridLayer({ width = 800, height = 600, viewport }: SvgGridLayerProps): React.JSX.Element {
  const showGrid = useShowGrid()
  const { setGridSize } = useGridActions()

  // Calculate dynamic grid size based on current zoom
  const dynamicGridSize = calculateDynamicGridSize(viewport.zoom)

  // Update the store's gridSize for display purposes
  useEffect(() => {
    setGridSize(dynamicGridSize)
  }, [dynamicGridSize, setGridSize])

  if (!showGrid) {
    return <g data-layer="grid" />
  }

  const lines: React.JSX.Element[] = []

  // Calculate visible range in world coordinates
  // Same calculation as GridLayer.tsx
  const startX = Math.floor(-viewport.panX / viewport.zoom / dynamicGridSize) * dynamicGridSize
  const endX = Math.ceil((width - viewport.panX) / viewport.zoom / dynamicGridSize) * dynamicGridSize
  const startY = -Math.floor(-viewport.panY / viewport.zoom / dynamicGridSize) * dynamicGridSize
  const endY = -Math.ceil((height - viewport.panY) / viewport.zoom / dynamicGridSize) * dynamicGridSize

  // Calculate stroke width that scales appropriately with zoom
  const baseStrokeWidth = 1
  const strokeWidth = Math.max(0.5, baseStrokeWidth / viewport.zoom)

  // Vertical lines
  for (let x = startX; x <= endX; x += dynamicGridSize) {
    const isAxis = x === 0
    lines.push(
      <line
        key={`v-${x}`}
        x1={x}
        y1={startY}
        x2={x}
        y2={endY}
        className={isAxis ? 'stroke-red-600/50' : 'stroke-gray-600/50'}
        strokeWidth={isAxis ? strokeWidth * 2 : strokeWidth}
      />
    )
  }

  // Horizontal lines
  for (let y = startY; y >= endY; y -= dynamicGridSize) {
    const isAxis = y === 0
    lines.push(
      <line
        key={`h-${y}`}
        x1={startX}
        y1={y}
        x2={endX}
        y2={y}
        className={isAxis ? 'stroke-green-600/50' : 'stroke-gray-600/50'}
        strokeWidth={isAxis ? strokeWidth * 2 : strokeWidth}
      />
    )
  }

  return (
    <g data-layer="grid" className="pointer-events-none">
      {lines}
    </g>
  )
}
