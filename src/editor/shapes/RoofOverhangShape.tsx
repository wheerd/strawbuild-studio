import type { RoofOverhang } from '@/building/model'
import { offsetPolygon } from '@/shared/geometry'
import { MATERIAL_COLORS } from '@/shared/theme/colors'
import { polygonToSvgPath } from '@/shared/utils/svg'

export function RoofOverhangShape({ overhang }: { overhang: RoofOverhang }): React.JSX.Element {
  const pathD = polygonToSvgPath(overhang.area)
  const triggerArea = polygonToSvgPath(offsetPolygon(overhang.area, 100))

  return (
    <g
      name={`roof-overhang-${overhang.id}`}
      data-entity-id={overhang.id}
      data-entity-type="roof-overhang"
      data-parent-ids={JSON.stringify([overhang.roofId])}
    >
      <path d={pathD} fill={MATERIAL_COLORS.roof} opacity={0.3} stroke="var(--color-gray-900)" strokeWidth={10} />

      {/* Invisible trigger area when overhang is 0 so that side can still be selected */}
      <path d={triggerArea} fill="black" opacity={0} />
    </g>
  )
}
