import { type Projection, bounds3Dto2D } from '@/construction/geometry'
import type { CutCuboid } from '@/construction/shapes'
import { subtract } from '@/shared/geometry'

export interface CutCuboidShapeProps {
  shape: CutCuboid
  projection: Projection
  fill: string
  stroke?: string
  strokeWidth?: number
  showDebugMarkers?: boolean
}

export function CutCuboidShape({
  shape,
  projection,
  fill,
  stroke = '#000',
  strokeWidth = 5,
  showDebugMarkers = true
}: CutCuboidShapeProps): React.JSX.Element {
  const calculatePolygonPoints = (shape: CutCuboid): string => {
    const bounds = bounds3Dto2D(shape.bounds, projection)
    const [x, y] = bounds.min
    const [length, width] = subtract(bounds.max, bounds.min)

    const points: [number, number][] = [
      [x, y], // bottom-left (start, inside edge)
      [x, y + width], // top-left (start, outside edge)
      [x + length, y + width], // top-right (end, outside edge)
      [x + length, y] // bottom-right (end, inside edge)
    ]

    // Apply start cut if present (at x position)
    if (shape.startCut && shape.startCut.plane === 'xy' && shape.startCut.axis === 'y') {
      const angleRad = (shape.startCut.angle * Math.PI) / 180
      const offsetDistance = width * Math.tan(angleRad)

      if (offsetDistance < 0) {
        points[0] = [x - offsetDistance, y]
      } else {
        points[1] = [x + offsetDistance, y + width]
      }
    }

    // Apply end cut if present (at x + length position)
    if (shape.endCut && shape.endCut.plane === 'xy' && shape.endCut.axis === 'y') {
      const angleRad = (shape.endCut.angle * Math.PI) / 180
      const offsetDistance = width * Math.tan(angleRad)

      if (offsetDistance < 0) {
        points[2] = [x + length + offsetDistance, y + width]
      } else {
        points[3] = [x + length - offsetDistance, y]
      }
    }

    // Convert to SVG coordinate system (flip Y) - hardcoded transformation
    return points.map(([px, py]) => `${px},${py}`).join(' ')
  }

  const polygonPoints = calculatePolygonPoints(shape)

  return (
    <g>
      <polygon points={polygonPoints} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />

      {/* Debug markers */}
      {showDebugMarkers && (
        <g>
          {/* Origin marker */}
          <circle cx={shape.offset[0]} cy={shape.offset[1]} r="20" fill="blue" />
        </g>
      )}
    </g>
  )
}
