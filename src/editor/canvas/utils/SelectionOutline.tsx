import { useMemo } from 'react'

import { useZoom } from '@/editor/hooks/useViewportStore'
import { type Polygon2D, type Vec2, offsetPolygon } from '@/shared/geometry'
import { useCanvasTheme } from '@/shared/theme/CanvasThemeContext'
import { polygonToSvgPath } from '@/shared/utils/svg'

export function SelectionOutline({ points }: { points: Vec2[] }): React.JSX.Element | null {
  const zoom = useZoom()
  const theme = useCanvasTheme()

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
      fill="none"
      stroke={theme.primaryDark}
      strokeWidth={strokeWidth}
      strokeDasharray={dashPattern}
      strokeLinecap="round"
      opacity={0.8}
      className="pointer-events-none"
    />
  )
}
