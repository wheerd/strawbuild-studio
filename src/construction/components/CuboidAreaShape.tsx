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
  const [centerX, centerY] = bounds2D.center
  const { min } = bounds2D
  const { width, height } = bounds2D

  return (
    <g
      className={`area-cuboid area-cuboid-${cuboid.areaType}`}
      transform={createSvgTransform(cuboid.transform, projection, rotationProjection)}
    >
      <clipPath id={cuboidId}>
        <rect
          x={min[0]}
          y={min[1]}
          width={width}
          height={height}
        />
      </clipPath>
      <rect
        x={min[0]}
        y={min[1]}
        width={width}
        height={height}
        clipPath={`url(#${cuboidId})`}
      />

      {cuboid.label && (
        <g className="text" transform={`translate(${centerX} ${centerY})`}>
          <text x={0} y={0}>
            {cuboid.label}
          </text>
        </g>
      )}
    </g>
  )
}
