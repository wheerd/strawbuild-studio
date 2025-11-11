import type { ImagePoint } from '@/editor/plan-overlay/types'

export function calculatePixelDistance(pointA: ImagePoint, pointB: ImagePoint): number {
  const deltaX = pointB.x - pointA.x
  const deltaY = pointB.y - pointA.y
  return Math.hypot(deltaX, deltaY)
}

export function calculateMmPerPixel(realDistanceMm: number, pixelDistance: number): number {
  if (realDistanceMm <= 0) {
    throw new Error('Real-world distance must be greater than zero.')
  }

  if (pixelDistance <= 0) {
    throw new Error('Calibration points must be apart to calculate scale.')
  }

  return realDistanceMm / pixelDistance
}
