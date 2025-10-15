import { Line } from 'react-konva/lib/ReactKonvaCore'

import { useZoom } from '@/editor/hooks/useViewportStore'
import type { Polygon2D, Vec2 } from '@/shared/geometry'
import { offsetPolygon } from '@/shared/geometry'
import { useCanvasTheme } from '@/shared/theme/CanvasThemeContext'

interface SelectionOutlineProps {
  points: Vec2[]
}

/**
 * Generic selection outline component that creates a consistent selection visual
 * for all entities. Automatically handles zoom-responsive stroke width and dash patterns.
 */
export function SelectionOutline({ points }: SelectionOutlineProps): React.JSX.Element | null {
  const zoom = useZoom()
  const theme = useCanvasTheme()

  // Calculate offset polygon
  const offset = 4 / zoom
  const offsetPolygonResult: Polygon2D = offsetPolygon({ points }, offset)
  const offsetPoints = offsetPolygonResult.points

  // If offsetting failed or produced invalid polygon, don't render
  if (offsetPoints.length < 3) {
    return null
  }

  const flatPoints = offsetPoints.flatMap(point => [point[0], point[1]])

  // Calculate zoom-responsive values
  const strokeWidth = 4 / zoom
  const dashPattern = [10 / zoom, 10 / zoom]

  return (
    <Line
      points={flatPoints}
      stroke={theme.primaryDark}
      strokeWidth={strokeWidth}
      dash={dashPattern}
      lineCap="round"
      opacity={0.8}
      closed
      listening={false}
    />
  )
}
