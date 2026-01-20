import type { Roof } from '@/building/model'
import { polygonToSvgPath } from '@/shared/utils/svg'

export function SvgRoofGhostShape({ roof }: { roof: Roof }): React.JSX.Element {
  const roofPath = polygonToSvgPath(roof.referencePolygon)
  const eavePath = polygonToSvgPath(roof.overhangPolygon)

  return (
    <g className="pointer-events-none">
      <path d={roofPath} className="stroke-border-contrast fill-none stroke-20 opacity-60" strokeDasharray="40 80" />
      <path d={eavePath} className="stroke-border-contrast fill-none stroke-20 opacity-60" strokeDasharray="40 80" />
    </g>
  )
}
