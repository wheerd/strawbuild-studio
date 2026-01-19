import { useMemo } from 'react'

import { useZoom } from '@/editor/hooks/useViewportStore'
import { type Polygon2D, type Vec2, offsetPolygon } from '@/shared/geometry'
import { polygonToSvgPath } from '@/shared/utils/svg'

export function SelectionOutline({ points }: { points: Vec2[] }): React.JSX.Element | null {
  const zoom = useZoom()

  // Calculate offset polygon
  const offset = 4 / zoom
  const polygon: Polygon2D = useMemo(() => offsetPolygon({ points }, offset), [points, offset])
  const path = polygonToSvgPath(polygon)

  // Calculate zoom-responsive values
  const strokeWidth = 4 / zoom
  const dashPattern = `${10 / zoom} ${10 / zoom}`

  return (
    <path
      d={path}
      className="fill-none stroke-blue-600/80"
      strokeWidth={strokeWidth}
      strokeDasharray={dashPattern}
      strokeLinecap="round"
      pointerEvents="none"
    />
  )
}
