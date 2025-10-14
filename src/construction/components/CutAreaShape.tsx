import { vec3 } from 'gl-matrix'

import { type Projection } from '@/construction/geometry'
import type { HighlightedCut } from '@/construction/model'
import type { Bounds2D } from '@/shared/geometry'

import './areas.css'

export interface CutAreaShapeProps {
  cut: HighlightedCut
  projection: Projection
  viewportBounds: Bounds2D
}

const EXTENSION = 500

export function CutAreaShape({ cut, projection, viewportBounds }: CutAreaShapeProps): React.JSX.Element {
  const start =
    cut.axis === 'x'
      ? vec3.fromValues(cut.position, viewportBounds.min[1] - EXTENSION, viewportBounds.min[1] - EXTENSION)
      : cut.axis === 'y'
        ? vec3.fromValues(viewportBounds.min[0] - EXTENSION, cut.position, viewportBounds.min[1] - EXTENSION)
        : vec3.fromValues(viewportBounds.min[0] - EXTENSION, viewportBounds.min[0] - EXTENSION, cut.position)
  const end =
    cut.axis === 'x'
      ? vec3.fromValues(cut.position, viewportBounds.max[1] + EXTENSION, viewportBounds.max[1] + EXTENSION)
      : cut.axis === 'y'
        ? vec3.fromValues(viewportBounds.max[0] + EXTENSION, cut.position, viewportBounds.max[1] + EXTENSION)
        : vec3.fromValues(viewportBounds.max[0] + EXTENSION, viewportBounds.max[0] + EXTENSION, cut.position)

  const projectedStart = projection(start)
  const projectedEnd = projection(end)

  // Axis is not visible in the current projection
  if (projectedStart[0] !== projectedEnd[0] && projectedStart[1] !== projectedEnd[1]) {
    return <></>
  }

  const viewportCenterX = (viewportBounds.min[0] + viewportBounds.max[0]) / 2
  const viewportCenterY = (viewportBounds.min[1] + viewportBounds.max[1]) / 2

  const textX = projectedStart[0] === projectedEnd[0] ? projectedStart[0] : viewportCenterX
  const textY = projectedStart[1] === projectedEnd[1] ? projectedStart[1] : viewportCenterY

  return (
    <g className={`area-cut area-cut-${cut.areaType}`}>
      <line x1={projectedStart[0]} y1={projectedStart[1]} x2={projectedEnd[0]} y2={projectedEnd[1]} />

      {cut.label && (
        <g className="text" transform={`translate(${textX} ${textY})`}>
          <text x={0} y={0} textAnchor="middle" dominantBaseline="middle">
            {cut.label}
          </text>
        </g>
      )}
    </g>
  )
}
