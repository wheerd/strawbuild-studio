import { type Polygon2D, type PolygonWithHoles2D, type Vec2, radiansToDegrees } from '@/shared/geometry'

export function polygonToSvgPath(polygon: Polygon2D) {
  return `M${polygon.points.map(p => `${p[0]},${p[1]}`).join(' L')} Z`
}

export function polygonWithHolesToSvgPath(polygon: PolygonWithHoles2D) {
  return [polygon.outer, ...polygon.holes].map(polygonToSvgPath).join(' ')
}

export function readableTextAngle(dir: Vec2) {
  let textAngleRad = Math.atan2(dir[1], dir[0])

  while (textAngleRad > Math.PI / 2) {
    textAngleRad -= Math.PI
  }
  while (textAngleRad <= -Math.PI / 2) {
    textAngleRad += Math.PI
  }

  return radiansToDegrees(textAngleRad)
}
