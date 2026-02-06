import type { Vec2 } from '@/shared/geometry'
import { midpoint } from '@/shared/geometry'

export function ConstraintBadge({
  label,
  startPoint,
  endPoint,
  outsideDirection,
  offset
}: {
  label: string
  startPoint: Vec2
  endPoint: Vec2
  outsideDirection: Vec2
  offset: number
}): React.JSX.Element {
  const fontSize = 60
  const mid = midpoint(startPoint, endPoint)
  const badgePoint: [number, number] = [mid[0] + outsideDirection[0] * offset, mid[1] + outsideDirection[1] * offset]

  return (
    <text
      x={0}
      y={0}
      textAnchor="middle"
      dominantBaseline="central"
      fill="var(--color-primary-foreground)"
      stroke="var(--color-primary)"
      fontSize={fontSize}
      strokeWidth={fontSize}
      fontWeight="bold"
      fontFamily="sans-serif"
      transform={`translate(${badgePoint[0]} ${badgePoint[1]}) scale(1, -1)`}
      pointerEvents="none"
      paintOrder="stroke"
    >
      &#x1F512; {label}
    </text>
  )
}
