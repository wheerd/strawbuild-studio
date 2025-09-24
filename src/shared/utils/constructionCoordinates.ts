import type { Vec3, Vec2 } from '@/shared/geometry'
import { createVec2 } from '@/shared/geometry'

export type ViewType = 'outside' | 'inside'

export interface SvgCoordinates {
  x: number
  y: number
}

/**
 * Convert construction element coordinates to SVG coordinates
 */
export const convertConstructionToSvg = (
  position: Vec3,
  size: Vec3,
  wallHeight: number,
  wallLength: number,
  view: ViewType
): { position: SvgCoordinates; size: SvgCoordinates } => {
  const basePosition = {
    x: position[0],
    y: wallHeight - position[2] - size[2]
  }

  // For inside view, mirror the x-axis
  if (view === 'inside') {
    basePosition.x = wallLength - position[0] - size[0]
  }

  return {
    position: basePosition,
    size: {
      x: size[0],
      y: size[2]
    }
  }
}

/**
 * Convert a single point from construction coordinates to SVG coordinates
 */
export const convertPointToSvg = (
  x: number,
  z: number,
  wallHeight: number,
  wallLength: number,
  view: ViewType = 'outside'
): Vec2 => {
  let svgX = x
  if (view === 'inside') {
    svgX = wallLength - x
  }
  const svgY = wallHeight - z
  return createVec2(svgX, svgY)
}
