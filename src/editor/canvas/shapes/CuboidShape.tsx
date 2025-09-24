import type { Cuboid } from '@/construction/walls'

export interface CuboidShapeProps {
  shape: Cuboid
  fill: string
  stroke?: string
  strokeWidth?: number
  showDebugMarkers?: boolean
}

export function CuboidShape({
  shape,
  fill,
  stroke = '#000',
  strokeWidth = 5,
  showDebugMarkers = false
}: CuboidShapeProps): React.JSX.Element {
  const [x, y] = shape.position
  const [length, width] = shape.size

  // Hardcoded coordinate transformation (flip Y)
  const svgY = -y - width

  return (
    <g>
      <rect x={x} y={svgY} width={length} height={width} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />

      {/* Debug markers */}
      {showDebugMarkers && <circle cx={x} cy={-y} r="2" fill="blue" />}
    </g>
  )
}
