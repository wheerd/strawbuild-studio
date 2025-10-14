import { type Projection, bounds3Dto2D } from '@/construction/geometry'
import type { Cuboid } from '@/construction/shapes'
import { subtract } from '@/shared/geometry'

export interface CuboidShapeProps {
  shape: Cuboid
  projection: Projection
  showDebugMarkers?: boolean
}

export function CuboidShape({ shape, projection, showDebugMarkers = false }: CuboidShapeProps): React.JSX.Element {
  const bounds = bounds3Dto2D(shape.bounds, projection)
  const [x, y] = bounds.min
  const [length, width] = subtract(bounds.max, bounds.min)

  return (
    <g>
      <rect className="apply-material" x={x} y={y} width={length} height={width} />

      {/* Debug markers */}
      {showDebugMarkers && <circle cx={x} cy={y} r="2" fill="blue" />}
    </g>
  )
}
