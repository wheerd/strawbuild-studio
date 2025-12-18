import type { RoofType } from '@/building/model'
import { type Vec2, newVec2 } from '@/shared/geometry'
import { Bounds2D, degreesToRadians } from '@/shared/geometry'

function toPath(points: Vec2[]): string {
  if (points.length === 0) return ''
  return points
    .reduce((path, point, index) => `${path}${index === 0 ? 'M' : 'L'} ${point[0]} ${point[1]} `, '')
    .concat('Z')
}

export function RoofPreview({ slope, type }: { slope: number; type: RoofType }): React.JSX.Element {
  const svgWidth = 250
  const svgHeight = 100

  const height =
    type === 'shed' ? svgWidth * Math.tan(degreesToRadians(slope)) : (svgWidth * Math.tan(degreesToRadians(slope))) / 2 // TODO: correct when not in middle

  const roofPoints =
    type === 'shed'
      ? [newVec2(0, 0), newVec2(svgWidth, height), newVec2(svgWidth, 0)]
      : [newVec2(0, 0), newVec2(svgWidth / 2, height), newVec2(svgWidth, 0)]

  const bounds = Bounds2D.fromPoints(roofPoints)
  const center = bounds.center
  const scale = Math.min(svgWidth / bounds.size[0], svgHeight / bounds.size[1])

  const centerX = svgWidth / 2
  const centerY = svgHeight / 2

  const transformPoint = (point: Vec2) =>
    newVec2((point[0] - center[0]) * scale + centerX, -(point[1] - center[1]) * scale + centerY)

  const scaledRoofPoints = roofPoints.map(transformPoint)
  const roofPath = toPath(scaledRoofPoints)

  return (
    <svg width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
      <path d={roofPath} fill="var(--gray-5)" stroke="var(--gray-10)" strokeWidth="1" />
    </svg>
  )
}
