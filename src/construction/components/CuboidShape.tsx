import { subtract } from '@/shared/geometry'

import { type Projection, bounds3Dto2D } from '../geometry'
import type { Cuboid } from '../shapes'

export interface CuboidShapeProps {
  shape: Cuboid
  projection: Projection
  fill: string
  stroke?: string
  strokeWidth?: number
  showDebugMarkers?: boolean
}

export function CuboidShape({
  shape,
  projection,
  fill,
  stroke = '#000',
  strokeWidth = 5,
  showDebugMarkers = false
}: CuboidShapeProps): React.JSX.Element {
  const bounds = bounds3Dto2D(shape.bounds, projection)
  const [x, y] = bounds.min
  const [length, width] = subtract(bounds.max, bounds.min)

  return (
    <g>
      <rect x={x} y={y} width={length} height={width} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />

      {/* Debug markers */}
      {showDebugMarkers && <circle cx={x} cy={y} r="2" fill="blue" />}
    </g>
  )
}
