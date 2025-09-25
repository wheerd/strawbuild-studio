import React from 'react'
import { Circle, Group, Line } from 'react-konva/lib/ReactKonvaCore'

import { useZoom } from '@/editor/hooks/useViewportStore'
import { useReactiveTool } from '@/editor/tools/system/hooks/useReactiveTool'
import type { ToolOverlayComponentProps } from '@/editor/tools/system/types'
import { offsetPolygon } from '@/shared/geometry'
import { COLORS } from '@/shared/theme/colors'

import type { PerimeterPresetTool } from './PerimeterPresetTool'

/**
 * React overlay component for PerimeterPresetTool with zoom-responsive rendering.
 * Shows ghost preview of the preset perimeter during placement.
 */
export function PerimeterPresetToolOverlay({
  tool
}: ToolOverlayComponentProps<PerimeterPresetTool>): React.JSX.Element | null {
  const { state } = useReactiveTool(tool)
  const zoom = useZoom()

  // Only render preview when placing and we have a preview polygon
  if (!state.previewPolygon || !state.presetConfig) {
    return null
  }

  const polygon = state.previewPolygon
  const config = state.presetConfig

  // Calculate zoom-responsive values
  const scaledLineWidth = Math.max(1, 2 / zoom)
  const dashSize = 8 / zoom
  const gapSize = 4 / zoom
  const scaledDashPattern = [dashSize, gapSize]
  const scaledPointRadius = 3 / zoom
  const scaledPointStrokeWidth = 1 / zoom
  const scaledCrosshairSize = 20 / zoom
  const scaledCrosshairWidth = 1 / zoom

  // Calculate outer wall polygon using offsetPolygon helper
  let outerPolygonPoints: number[] | null = null
  try {
    // Use offsetPolygon to expand the inner polygon by wall thickness
    const outerPoints = offsetPolygon(polygon.points, config.thickness)
    if (outerPoints.length > 0) {
      // Convert to flat array format for Konva Line component and close the polygon
      outerPolygonPoints = [...outerPoints.flatMap(p => [p[0], p[1]]), outerPoints[0][0], outerPoints[0][1]]
    }
  } catch (error) {
    console.warn('Failed to calculate outer polygon:', error)
  }

  return (
    <Group>
      {/* Outer wall rectangle (dashed outline, no fill) */}
      {outerPolygonPoints && (
        <Line
          points={outerPolygonPoints}
          stroke={COLORS.ui.gray700}
          strokeWidth={scaledLineWidth}
          dash={scaledDashPattern}
          opacity={0.6}
          closed
          listening={false}
        />
      )}

      {/* Inner space polygon (interior area with fill) */}
      <Line
        points={[...polygon.points.flatMap(p => [p[0], p[1]]), polygon.points[0][0], polygon.points[0][1]]}
        stroke={COLORS.ui.primary}
        strokeWidth={scaledLineWidth}
        dash={scaledDashPattern}
        opacity={0.8}
        fill={COLORS.ui.primary}
        fillOpacity={0.1}
        closed
        listening={false}
      />

      {/* Corner points for better visibility */}
      {polygon.points.map((point, index) => (
        <Circle
          key={`corner-${index}`}
          x={point[0]}
          y={point[1]}
          radius={scaledPointRadius}
          fill={COLORS.ui.primary}
          stroke={COLORS.ui.white}
          strokeWidth={scaledPointStrokeWidth}
          opacity={0.9}
          listening={false}
        />
      ))}

      {/* Center crosshair for placement reference */}
      {state.previewPosition && (
        <Group opacity={0.6} listening={false}>
          {/* Horizontal crosshair line */}
          <Line
            points={[
              state.previewPosition[0] - scaledCrosshairSize,
              state.previewPosition[1],
              state.previewPosition[0] + scaledCrosshairSize,
              state.previewPosition[1]
            ]}
            stroke={COLORS.ui.primary}
            strokeWidth={scaledCrosshairWidth}
            listening={false}
          />
          {/* Vertical crosshair line */}
          <Line
            points={[
              state.previewPosition[0],
              state.previewPosition[1] - scaledCrosshairSize,
              state.previewPosition[0],
              state.previewPosition[1] + scaledCrosshairSize
            ]}
            stroke={COLORS.ui.primary}
            strokeWidth={scaledCrosshairWidth}
            listening={false}
          />
        </Group>
      )}
    </Group>
  )
}
