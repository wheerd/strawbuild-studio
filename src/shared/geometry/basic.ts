import { vec2, vec3 } from 'gl-matrix'

export type Length = number
export type Area = number
export type Volume = number

// Helper functions to create branded types
export const millimeters = (value: number): Length => value
export const meters = (value: number): Length => value * 1000
export const centimeters = (value: number): Length => value * 100
export const squareMeters = (value: number): Area => value * 1000 * 1000
export const cubicMeters = (value: number): Volume => value * 1000 * 1000 * 1000

export class Bounds2D {
  static readonly EMPTY = new Bounds2D(vec2.create(), vec2.create())

  static fromPoints(points: readonly vec2[]): Bounds2D {
    if (points.length === 0) {
      return Bounds2D.EMPTY
    }

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    for (const point of points) {
      if (point[0] < minX) minX = point[0]
      if (point[1] < minY) minY = point[1]
      if (point[0] > maxX) maxX = point[0]
      if (point[1] > maxY) maxY = point[1]
    }

    return new Bounds2D(vec2.fromValues(minX, minY), vec2.fromValues(maxX, maxY))
  }

  static fromMinMax(min: vec2, max: vec2): Bounds2D {
    if (min[0] >= max[0] && min[1] >= max[1]) {
      return Bounds2D.EMPTY
    }

    return new Bounds2D(vec2.clone(min), vec2.clone(max))
  }

  static merge(...bounds: ReadonlyArray<Bounds2D>): Bounds2D {
    const nonEmptyBound = bounds.filter(b => !b.isEmpty)
    if (nonEmptyBound.length === 0) {
      return Bounds2D.EMPTY
    }

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    for (const bound of nonEmptyBound) {
      if (bound.min[0] < minX) minX = bound.min[0]
      if (bound.min[1] < minY) minY = bound.min[1]
      if (bound.max[0] > maxX) maxX = bound.max[0]
      if (bound.max[1] > maxY) maxY = bound.max[1]
    }

    return new Bounds2D(vec2.fromValues(minX, minY), vec2.fromValues(maxX, maxY))
  }

  readonly min: vec2
  readonly max: vec2

  private constructor(min: vec2, max: vec2) {
    this.min = min
    this.max = max
  }

  get width(): number {
    return this.max[0] - this.min[0]
  }

  get height(): number {
    return this.max[1] - this.min[1]
  }

  get size(): vec2 {
    return vec2.fromValues(this.width, this.height)
  }

  get center(): vec2 {
    return vec2.fromValues((this.min[0] + this.max[0]) / 2, (this.min[1] + this.max[1]) / 2)
  }

  get isEmpty(): boolean {
    return vec2.equals(this.min, this.max)
  }

  pad(amount: number | vec2): Bounds2D {
    const padX = typeof amount === 'number' ? amount : amount[0]
    const padY = typeof amount === 'number' ? amount : amount[1]

    const min = vec2.fromValues(this.min[0] - padX, this.min[1] - padY)
    const max = vec2.fromValues(this.max[0] + padX, this.max[1] + padY)
    return new Bounds2D(min, max)
  }

  contains(point: vec2): boolean {
    return point[0] >= this.min[0] && point[0] <= this.max[0] && point[1] >= this.min[1] && point[1] <= this.max[1]
  }
}

export function midpoint(p1: vec2, p2: vec2): vec2 {
  return vec2.lerp(vec2.create(), p1, p2, 0.5)
}

export function angle(from: vec2, to: vec2): number {
  const direction = vec2.create()
  vec2.subtract(direction, to, from)
  return Math.atan2(direction[1], direction[0])
}

export function direction(source: vec2, target: vec2): vec2 {
  return vec2.normalize(vec2.create(), vec2.subtract(vec2.create(), target, source))
}

export function perpendicular(vector: vec2): vec2 {
  return perpendicularCCW(vector) // Default to counter-clockwise
}

export function perpendicularCCW(vector: vec2): vec2 {
  return vec2.fromValues(-vector[1], vector[0]) // Rotate 90° counterclockwise
}

export function perpendicularCW(vector: vec2): vec2 {
  return vec2.fromValues(vector[1], -vector[0]) // Rotate 90° clockwise
}

export type Plane3D = 'xy' | 'xz' | 'yz'
export type Axis3D = 'x' | 'y' | 'z'

export const complementaryAxis = (plane: Plane3D): Axis3D => (plane === 'xy' ? 'z' : plane === 'xz' ? 'y' : 'x')

export interface Bounds3D {
  min: vec3
  max: vec3
}

export function boundsFromCuboid(position: vec3, size: vec3): Bounds3D {
  return {
    min: position,
    max: vec3.add(vec3.create(), position, size)
  }
}

export function boundsFromPoints3D(points: vec3[]): Bounds3D | null {
  if (points.length === 0) return null

  let minX = Infinity
  let minY = Infinity
  let minZ = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let maxZ = -Infinity

  for (const point of points) {
    minX = Math.min(minX, point[0])
    minY = Math.min(minY, point[1])
    minZ = Math.min(minZ, point[2])
    maxX = Math.max(maxX, point[0])
    maxY = Math.max(maxY, point[1])
    maxZ = Math.max(maxZ, point[2])
  }

  return {
    min: vec3.fromValues(minX, minY, minZ),
    max: vec3.fromValues(maxX, maxY, maxZ)
  }
}

export function mergeBounds(...bounds: Bounds3D[]): Bounds3D {
  if (bounds.length === 0) throw new Error('No bounds to merge')

  let minX = Infinity
  let minY = Infinity
  let minZ = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let maxZ = -Infinity

  for (const bound of bounds) {
    minX = Math.min(minX, bound.min[0])
    minY = Math.min(minY, bound.min[1])
    minZ = Math.min(minZ, bound.min[2])
    maxX = Math.max(maxX, bound.max[0])
    maxY = Math.max(maxY, bound.max[1])
    maxZ = Math.max(maxZ, bound.max[2])
  }

  return {
    min: vec3.fromValues(minX, minY, minZ),
    max: vec3.fromValues(maxX, maxY, maxZ)
  }
}

export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

export function radiansToDegrees(radians: number): number {
  return (radians * 180) / Math.PI
}
