import React from 'react'
import { Circle, Group, Line } from 'react-konva/lib/ReactKonvaCore'

import { useZoom } from '@/editor/hooks/useViewportStore'
import { useReactiveTool } from '@/editor/tools/system/hooks/useReactiveTool'
import type { ToolOverlayComponentProps } from '@/editor/tools/system/types'
import { offsetPolygon } from '@/shared/geometry'
import { useCanvasTheme } from '@/shared/theme/CanvasThemeContext'

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
  const theme = useCanvasTheme()

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

  // Calculate complementary polygon based on reference side
  const referencePointsFlat = [...polygon.points.flatMap(p => [p[0], p[1]]), polygon.points[0][0], polygon.points[0][1]]

  let derivedPolygon: number[] | null = null

  try {
    const offset = offsetPolygon(polygon, config.referenceSide === 'inside' ? config.thickness : -config.thickness)
    if (offset.points.length > 0) {
      derivedPolygon = [...offset.points.flatMap(p => [p[0], p[1]]), offset.points[0][0], offset.points[0][1]]
    }
  } catch (error) {
    console.warn('Failed to calculate preset derived polygon:', error)
  }

  const interiorPoints =
    config.referenceSide === 'inside' ? referencePointsFlat : (derivedPolygon ?? referencePointsFlat)
  const exteriorPoints = config.referenceSide === 'inside' ? derivedPolygon : referencePointsFlat

  return (
    <Group>
      {exteriorPoints && (
        <Line
          points={exteriorPoints}
          stroke={theme.text}
          strokeWidth={scaledLineWidth}
          dash={scaledDashPattern}
          opacity={0.6}
          closed
          listening={false}
        />
      )}

      {interiorPoints && (
        <Line
          points={interiorPoints}
          stroke={theme.primary}
          strokeWidth={scaledLineWidth}
          dash={scaledDashPattern}
          opacity={0.8}
          fill={theme.primary}
          fillOpacity={0.1}
          closed
          listening={false}
        />
      )}

      {/* Corner points for better visibility */}
      {polygon.points.map((point, index) => (
        <Circle
          key={`corner-${index}`}
          x={point[0]}
          y={point[1]}
          radius={scaledPointRadius}
          fill={theme.primary}
          stroke={theme.white}
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
            stroke={theme.primary}
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
            stroke={theme.primary}
            strokeWidth={scaledCrosshairWidth}
            listening={false}
          />
        </Group>
      )}
    </Group>
  )
}
