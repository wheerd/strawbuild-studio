import type { PerimeterWithGeometry } from '@/building/model'
import { polygonToSvgPath } from '@/shared/utils/svg'

export function PerimeterGhostShape({ perimeter }: { perimeter: PerimeterWithGeometry }): React.JSX.Element {
  const innerPath = polygonToSvgPath(perimeter.innerPolygon)
  const outerPath = polygonToSvgPath(perimeter.outerPolygon)

  return (
    <g className="pointer-events-none">
      <path
        d={innerPath}
        stroke="var(--color-border-contrast)"
        fill="var(--color-muted)"
        strokeWidth={20}
        strokeDasharray="40 80"
        opacity={0.3}
      />

      <path
        d={outerPath}
        stroke="var(--color-border-contrast)"
        fill="none"
        strokeWidth={20}
        strokeDasharray="40 80"
        opacity={0.3}
      />
    </g>
  )
}
