import { useId } from 'react'

import { type Projection } from '@/construction/geometry'
import { getVisibleFacesInViewSpace } from '@/construction/manifold/faces'
import { asManifoldTransform } from '@/construction/manifoldUtils'
import type { HighlightedCuboid } from '@/construction/model'
import { useAreaLabel } from '@/construction/useAreaLabel'
import { Bounds2D, type Vec2, newVec2 } from '@/shared/geometry'
import { getManifoldModule } from '@/shared/geometry/manifoldInstance'

import './areas.css'

export interface CuboidAreaShapeProps {
  cuboid: HighlightedCuboid
  projection: Projection
}

function polygonToSvgPath(points: Vec2[]) {
  return `M${points.map(([px, py]) => `${px},${py}`).join(' L')}`
}

export function CuboidAreaShape({ cuboid, projection }: CuboidAreaShapeProps): React.JSX.Element | null {
  const cuboidId = useId()
  const label = useAreaLabel(cuboid.areaType)
  const [w, h, d] = cuboid.size
  const manifold = getManifoldModule().Manifold.cube([w, h, d]).transform(asManifoldTransform(cuboid.transform))
  const faces2D = getVisibleFacesInViewSpace(manifold, projection, true)
    .map(f => f.polygon.outer.points.map(p => newVec2(p[0], p[1])))
    .filter(f => !Bounds2D.fromPoints(f).isEmpty)

  if (faces2D.length === 0) {
    return null
  }

  const center = Bounds2D.fromPoints(faces2D[0]).center

  return (
    <g className={`area-cuboid area-cuboid-${cuboid.areaType}`}>
      <clipPath id={cuboidId}>
        <path d={polygonToSvgPath(faces2D[0])} />
      </clipPath>
      <path d={polygonToSvgPath(faces2D[0])} clipPath={`url(#${cuboidId})`} />

      {label && (
        <g className="text" transform={`translate(${center[0]} ${center[1]})`}>
          <text x={0} y={0}>
            {label}
          </text>
        </g>
      )}
    </g>
  )
}
