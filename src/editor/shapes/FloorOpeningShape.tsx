import type { FloorOpening } from '@/building/model'
import { polygonToSvgPath } from '@/shared/utils/svg'

export function FloorOpeningShape({ opening }: { opening: FloorOpening }): React.JSX.Element {
  const d = polygonToSvgPath(opening.area)

  return (
    <path
      d={d}
      fill="url(#hatch)"
      stroke="var(--amber-10)"
      strokeWidth={10}
      strokeDasharray="80 40"
      data-entity-id={opening.id}
      data-entity-type="floor-opening"
      data-parent-ids="[]"
    />
  )
}
