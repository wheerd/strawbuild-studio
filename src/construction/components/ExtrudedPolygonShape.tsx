import { useMemo } from 'react'

import { type Projection } from '@/construction/geometry'
import { type ExtrudedPolygon, extrudedPolygonFaces } from '@/construction/shapes'
import { Bounds2D, type Polygon2D, type PolygonWithHoles2D } from '@/shared/geometry'

export interface ExtrudedPolygonShapeProps {
  shape: ExtrudedPolygon
  projection: Projection
  showDebugMarkers?: boolean
}

function polygonToSvgPath(polygon: Polygon2D) {
  return `M${polygon.points.map(([px, py]) => `${px},${py}`).join(' L')}`
}

function polygonWithHolesToSvgPath(polygon: PolygonWithHoles2D) {
  return [polygon.outer, ...polygon.holes].map(polygonToSvgPath).join(' ')
}

export function ExtrudedPolygonShape({ shape, projection }: ExtrudedPolygonShapeProps): React.JSX.Element {
  const faces: PolygonWithHoles2D[] = useMemo(() => {
    return Array.from(extrudedPolygonFaces(shape))
      .map(
        f =>
          ({
            outer: { points: f.outer.map(o => projection(o)) },
            holes: f.holes.map(h => ({ points: h.map(p => projection(p)) }))
          }) as PolygonWithHoles2D
      )
      .filter(f => {
        const bounds = Bounds2D.fromPoints(f.outer.points)
        return bounds.width !== 0 && bounds.height !== 0
      })
  }, [shape, projection])

  return (
    <g>
      {faces.map((face, index) => (
        <path className="apply-material" key={index} d={polygonWithHolesToSvgPath(face)} />
      ))}
    </g>
  )
}
