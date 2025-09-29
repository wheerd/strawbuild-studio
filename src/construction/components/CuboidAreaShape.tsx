import { useId } from 'react'

import { type Projection, type RotationProjection, bounds3Dto2D, createSvgTransform } from '@/construction/geometry'
import type { HighlightedCuboid } from '@/construction/model'

import './areas.css'

export interface CuboidAreaShapeProps {
  cuboid: HighlightedCuboid
  projection: Projection
  rotationProjection: RotationProjection
}

export function CuboidAreaShape({ cuboid, projection, rotationProjection }: CuboidAreaShapeProps): React.JSX.Element {
  const cuboidId = useId()
  const bounds2D = bounds3Dto2D(cuboid.bounds, projection)
  const cx = (bounds2D.max[0] + bounds2D.min[0]) / 2
  const cy = (bounds2D.max[1] + bounds2D.min[1]) / 2

  return (
    <g
      className={`area-cuboid area-cuboid-${cuboid.areaType}`}
      transform={createSvgTransform(cuboid.transform, projection, rotationProjection)}
    >
      <clipPath id={cuboidId}>
        <rect
          x={bounds2D.min[0]}
          y={bounds2D.min[1]}
          width={bounds2D.max[0] - bounds2D.min[0]}
          height={bounds2D.max[1] - bounds2D.min[1]}
        />
      </clipPath>
      <rect
        x={bounds2D.min[0]}
        y={bounds2D.min[1]}
        width={bounds2D.max[0] - bounds2D.min[0]}
        height={bounds2D.max[1] - bounds2D.min[1]}
        clipPath={`url(#${cuboidId})`}
      />

      {cuboid.label && (
        <g className="text" transform={`translate( ${cx} ${cy})`}>
          <text x={0} y={0}>
            {cuboid.label}
          </text>
        </g>
      )}
    </g>
  )
}
