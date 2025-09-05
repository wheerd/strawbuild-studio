import { Line } from 'react-konva'
import type { Vec2 } from '@/types/geometry'
import { offsetPolygon } from '@/types/geometry'
import { useZoom } from '@/components/FloorPlanEditor/hooks/useViewportStore'
import { COLORS } from '@/theme/colors'

interface SelectionOutlineProps {
  points: Vec2[]
}

/**
 * Generic selection outline component that creates a consistent selection visual
 * for all entities. Automatically handles zoom-responsive stroke width and dash patterns.
 */
export function SelectionOutline({ points }: SelectionOutlineProps): React.JSX.Element | null {
  const zoom = useZoom()

  // Calculate offset polygon
  const offset = 4 / zoom
  const offsetPoints = offsetPolygon(points, offset)

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
      stroke={COLORS.selection.outline}
      strokeWidth={strokeWidth}
      dash={dashPattern}
      lineCap="round"
      opacity={0.8}
      closed
      listening={false}
    />
  )
}
