import { useId } from 'react'

import { type Projection } from '@/construction/geometry'
import { getVisibleFacesInViewSpace } from '@/construction/manifold/faces'
import type { HighlightedCuboid } from '@/construction/model'
import { type Vec2, newVec2 } from '@/shared/geometry'
import { Bounds2D } from '@/shared/geometry'
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
  const [w, h, d] = cuboid.size
  const [m0, m1, m2, m3, m4, m5, m6, m7, m8, m9, m10, m11, m12, m13, m14, m15] = cuboid.transform
  const manifold = getManifoldModule()
    .Manifold.cube([w, h, d])
    .transform([m0, m1, m2, m3, m4, m5, m6, m7, m8, m9, m10, m11, m12, m13, m14, m15])
  const faces2D = getVisibleFacesInViewSpace(manifold, projection, true)
    .map(f => f.outer.points.map(p => newVec2(p[0], p[1])))
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

      {cuboid.label && (
        <g className="text" transform={`translate(${center[0]} ${center[1]})`}>
          <text x={0} y={0}>
            {cuboid.label}
          </text>
        </g>
      )}
    </g>
  )
}
