import { vec3 } from 'gl-matrix'
import { useId } from 'react'

import { type Projection } from '@/construction/geometry'
import type { HighlightedPolygon } from '@/construction/model'
import type { Vec3 } from '@/shared/geometry'

import './areas.css'

export interface PolygonAreaShapeProps {
  polygon: HighlightedPolygon
  projection: Projection
}

export function PolygonAreaShape({ polygon, projection }: PolygonAreaShapeProps): React.JSX.Element {
  const polygonId = useId()

  // Helper function to project polygon points and create SVG path
  const createPolygonPath = (polygon: HighlightedPolygon): { pathData: string; center: [number, number] } => {
    // Project polygon points to 2D
    const projectedPoints = polygon.polygon.points.map(point => {
      // Convert 2D polygon point to 3D point on the specified plane for projection
      let point3D: Vec3
      switch (polygon.plane) {
        case 'xy':
          point3D = vec3.fromValues(point[0], point[1], 0)
          break
        case 'xz':
          point3D = vec3.fromValues(point[0], 0, point[1])
          break
        case 'yz':
          point3D = vec3.fromValues(0, point[0], point[1])
          break
        default:
          throw new Error(`Unsupported plane: ${polygon.plane}`)
      }
      const projected = projection(point3D)
      return [projected[0], projected[1]]
    })

    // Create SVG path string
    const pathData =
      projectedPoints.map((point, i) => `${i === 0 ? 'M' : 'L'} ${point[0]} ${point[1]}`).join(' ') + ' Z'

    // Calculate center for label positioning
    const centerX = projectedPoints.reduce((sum, p) => sum + p[0], 0) / projectedPoints.length
    const centerY = projectedPoints.reduce((sum, p) => sum + p[1], 0) / projectedPoints.length

    return { pathData, center: [centerX, centerY] }
  }

  const { pathData, center } = createPolygonPath(polygon)

  return (
    <g className={`area-polygon area-polygon-${polygon.areaType}`}>
      <clipPath id={polygonId}>
        <path d={pathData} />
      </clipPath>
      <path d={pathData} clipPath={`url(#${polygonId})`} />

      {polygon.label && (
        <text x={center[0]} y={center[1]}>
          {polygon.label}
        </text>
      )}
    </g>
  )
}
