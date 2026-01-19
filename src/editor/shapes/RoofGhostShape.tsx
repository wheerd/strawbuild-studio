import type { Roof } from '@/building/model'
import { polygonToSvgPath } from '@/shared/utils/svg'

export function SvgRoofGhostShape({ roof }: { roof: Roof }): React.JSX.Element {
  const roofPath = polygonToSvgPath(roof.referencePolygon)
  const eavePath = polygonToSvgPath(roof.overhangPolygon)

  return (
    <g className="pointer-events-none">
      <path
        d={roofPath}
        stroke="var(--color-gray-900)"
        fill="none"
        strokeWidth={20}
        strokeDasharray="40 80"
        opacity={0.3}
      />
      <path
        d={eavePath}
        stroke="var(--color-gray-900)"
        fill="none"
        strokeWidth={20}
        strokeDasharray="40 80"
        opacity={0.3}
      />
    </g>
  )
}
