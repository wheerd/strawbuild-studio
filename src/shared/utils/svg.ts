import type { Polygon2D, PolygonWithHoles2D } from '@/shared/geometry'

export function polygonToSvgPath(polygon: Polygon2D) {
  return `M${polygon.points.map(p => `${p[0]},${p[1]}`).join(' L')} Z`
}

export function polygonWithHolesToSvgPath(polygon: PolygonWithHoles2D) {
  return [polygon.outer, ...polygon.holes].map(polygonToSvgPath).join(' ')
}
