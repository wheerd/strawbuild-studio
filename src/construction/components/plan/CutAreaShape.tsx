import { type Projection, projectPoint } from '@/construction/geometry'
import type { HighlightedCut } from '@/construction/model'
import { useAreaLabel } from '@/construction/useAreaLabel'
import { type Bounds3D, newVec3 } from '@/shared/geometry'

import './areas.css'

export interface CutAreaShapeProps {
  cut: HighlightedCut
  projection: Projection
  worldBounds: Bounds3D
}

const EXTENSION = 500

export function CutAreaShape({ cut, projection, worldBounds }: CutAreaShapeProps): React.JSX.Element {
  const label = useAreaLabel(cut.areaType)
  // Create line in 3D world space at the cut position, spanning the other two dimensions
  const start =
    cut.axis === 'x'
      ? newVec3(cut.position, worldBounds.min[1] - EXTENSION, worldBounds.min[2] - EXTENSION)
      : cut.axis === 'y'
        ? newVec3(worldBounds.min[0] - EXTENSION, cut.position, worldBounds.min[2] - EXTENSION)
        : newVec3(worldBounds.min[0] - EXTENSION, worldBounds.min[1] - EXTENSION, cut.position)
  const end =
    cut.axis === 'x'
      ? newVec3(cut.position, worldBounds.max[1] + EXTENSION, worldBounds.max[2] + EXTENSION)
      : cut.axis === 'y'
        ? newVec3(worldBounds.max[0] + EXTENSION, cut.position, worldBounds.max[2] + EXTENSION)
        : newVec3(worldBounds.max[0] + EXTENSION, worldBounds.max[1] + EXTENSION, cut.position)

  const projectedStart = projectPoint(start, projection)
  const projectedEnd = projectPoint(end, projection)

  // Axis is not visible in the current projection
  if (projectedStart[0] !== projectedEnd[0] && projectedStart[1] !== projectedEnd[1]) {
    return <></>
  }
  return (
    <g className={`area-cut area-cut-${cut.areaType}`}>
      <line x1={projectedStart[0]} y1={projectedStart[1]} x2={projectedEnd[0]} y2={projectedEnd[1]} />

      {label && (
        <>
          <g className="text" transform={`translate(${projectedStart[0]} ${projectedStart[1]})`}>
            <text x={0} y={0} textAnchor="middle" dominantBaseline="middle">
              {label}
            </text>
          </g>
          <g className="text" transform={`translate(${projectedEnd[0]} ${projectedEnd[1]})`}>
            <text x={0} y={0} textAnchor="middle" dominantBaseline="middle">
              {label}
            </text>
          </g>
        </>
      )}
    </g>
  )
}
