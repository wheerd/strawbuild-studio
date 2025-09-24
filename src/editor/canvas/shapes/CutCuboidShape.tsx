import type { CutCuboid } from '@/construction/walls'

export interface CutCuboidShapeProps {
  shape: CutCuboid
  fill: string
  stroke?: string
  strokeWidth?: number
  showDebugMarkers?: boolean
}

export function CutCuboidShape({
  shape,
  fill,
  stroke = '#000',
  strokeWidth = 5,
  showDebugMarkers = false
}: CutCuboidShapeProps): React.JSX.Element {
  // Hardcoded coordinate transformation (as requested)
  const calculatePolygonPoints = (shape: CutCuboid): string => {
    const [x, y] = shape.position
    const [length, width] = shape.size

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
    return points.map(([px, py]) => `${px},${-py}`).join(' ')
  }

  const polygonPoints = calculatePolygonPoints(shape)

  return (
    <g>
      <polygon points={polygonPoints} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />

      {/* Debug markers */}
      {showDebugMarkers && (
        <g>
          {/* Origin marker */}
          <circle cx={shape.position[0]} cy={-shape.position[1]} r="2" fill="blue" />

          {/* Cut angle indicators */}
          {shape.startCut && (
            <text x={shape.position[0] - 50} y={-shape.position[1] - shape.size[1] / 2} fontSize="12" fill="red">
              Start: {shape.startCut.angle.toFixed(1)}°
            </text>
          )}
          {shape.endCut && (
            <text
              x={shape.position[0] + shape.size[0] + 10}
              y={-shape.position[1] - shape.size[1] / 2}
              fontSize="12"
              fill="red"
            >
              End: {shape.endCut.angle.toFixed(1)}°
            </text>
          )}
        </g>
      )}
    </g>
  )
}
