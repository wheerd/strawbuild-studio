import type { FloorArea } from '@/building/model'
import { polygonToSvgPath } from '@/shared/utils/svg'

export function FloorAreaShape({ area }: { area: FloorArea }): React.JSX.Element {
  const d = polygonToSvgPath(area.area)

  return (
    <path
      d={d}
      fill="var(--color-gray-200)"
      stroke="var(--color-primary)"
      strokeWidth={30}
      data-entity-id={area.id}
      data-entity-type="floor-area"
      data-parent-ids="[]"
    />
  )
}
