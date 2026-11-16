import { type Vec2, direction, distVec2, perpendicular, scaleAddVec2 } from '@/shared/geometry'

export interface ArrowProps extends React.SVGProps<SVGPathElement> {
  arrowStart: Vec2
  arrowEnd: Vec2
  color: string
  strokeWidth: number
  pointerLength?: number
  pointerWidth?: number
}

export function Arrow({ arrowStart, arrowEnd, strokeWidth, pointerLength, pointerWidth, color, ...props }: ArrowProps) {
  const length = distVec2(arrowStart, arrowEnd)
  if (length === 0) return null

  const dir = direction(arrowStart, arrowEnd)
  const perp = perpendicular(dir)

  pointerLength ??= length / 3
  pointerWidth ??= strokeWidth * 2

  const pointerBase = scaleAddVec2(arrowEnd, dir, -pointerLength)

  const halfWidth = pointerWidth / 2

  // Arrowhead wings
  const leftWing = scaleAddVec2(pointerBase, perp, halfWidth)
  const rightWing = scaleAddVec2(pointerBase, perp, -halfWidth)

  // SVG path
  const d = `
    M ${arrowStart[0]} ${arrowStart[1]}
    L ${pointerBase[0]} ${pointerBase[1]}
    L ${leftWing[0]} ${leftWing[1]}
    L ${arrowEnd[0]} ${arrowEnd[1]}
    L ${rightWing[0]} ${rightWing[1]}
    L ${pointerBase[0]} ${pointerBase[1]}
    Z
  `

  return <path d={d} fill={color} stroke={color} strokeWidth={strokeWidth} {...props} />
}

export interface BidirectionalArrowProps extends Omit<ArrowProps, 'arrowStart' | 'arrowEnd' | 'direction'> {
  center: Vec2
  direction: Vec2
  length: number
}

export function BidirectionalArrow({ center, direction: arrowDirection, length, ...props }: BidirectionalArrowProps) {
  const start = scaleAddVec2(center, arrowDirection, -length)
  const end = scaleAddVec2(center, arrowDirection, length)

  return (
    <g>
      <Arrow arrowStart={center} arrowEnd={start} {...props} />
      <Arrow arrowStart={center} arrowEnd={end} {...props} />
    </g>
  )
}
